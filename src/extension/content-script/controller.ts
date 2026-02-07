import { DEFAULT_PROMPT_CONFIG } from '../../core/services/prompt';
import { DEFAULT_USER_PREFERENCES } from '../../core/domain/preferences/user-preferences';
import type { SuggestionInputSnapshot } from '../../core/services/emoji-suggestion-orchestrator';
import { SuggestionSession } from '../../core/domain/suggestion/suggestion-session';
import { isEnterKey, isEscapeKey, isPlainTabKey, isTabKey } from '../../core/domain/keyboard/key-utils';
import { shouldAllowThrottledAction } from '../../core/services/throttle';
import { applyEmojiSuggestionResult, beginEmojiSuggestionRequest } from '../../core/services/emoji-suggestion-usecase';
import type { AvailabilityChecker } from '../../core/ports/availability-checker';
import type { Clock } from '../../core/ports/clock';
import { CSS } from './overlay';
import type { SuggestionGenerator } from '../../core/ports/suggestion-generator';
import { PromptAPIAdapter } from '../adapters/prompt-api';
import { createExtensionLogger } from '../diagnostics/logger';
import { findSupportedInputFromEvent, insertAtCaret, type SupportedEl } from './dom-utils';
import { readSuggestionSnapshotFromActiveEl } from './input-snapshot';
import { GhostOverlay, ToastMessage } from './overlay';

const DEFAULT_SETTINGS = DEFAULT_USER_PREFERENCES.context;
const DEFAULT_SKIP = DEFAULT_USER_PREFERENCES.skip;

const IDLE_DELAY_MS = 700;
const COOLDOWN_MS = 2000;
const UNAVAILABLE_TOAST_THROTTLE_MS = 30_000;

export function createEmojiCompletionController(
  deps: { clock?: Clock; ai?: AvailabilityChecker & SuggestionGenerator } = {},
) {
  const log = createExtensionLogger('content-controller');
  const clock: Clock = deps.clock ?? { nowMs: () => Date.now() };
  const overlay = new GhostOverlay();
  const toast = new ToastMessage();
  const session = new SuggestionSession();
  const ai: AvailabilityChecker & SuggestionGenerator = deps.ai ?? new PromptAPIAdapter();

  let activeEl: SupportedEl | null = null;
  let isComposing = false;
  let idleTimer: number | null = null;

  let pendingAbort: AbortController | null = null;
  let hasLoggedFirstActivation = false;
  let lastUnavailableToastAtMs: number | null = null;
  let repositionRafId: number | null = null;

  function start() {
    log.info('controller.start');
    document.addEventListener('focusin', onFocusIn, true);
    document.addEventListener('focusout', onFocusOut, true);
    document.addEventListener('selectionchange', onSelectionChange, true);
    document.addEventListener(
      'compositionstart',
      () => {
        isComposing = true;
        // Never intercept keys during composition; also dismiss any overlay/pending request.
        cancelAll();
      },
      true,
    );
    document.addEventListener('compositionend', () => {
      isComposing = false;
      schedule();
    }, true);

    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('input', onAnyInput, true);
    document.addEventListener('mousedown', onAnyInteraction, true);
    document.addEventListener('mouseup', onAnyInteraction, true);
    document.addEventListener('click', onAnyInteraction, true);
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
  }

  function stop() {
    log.info('controller.stop');
    cancelAll();
    document.removeEventListener('focusin', onFocusIn, true);
    document.removeEventListener('focusout', onFocusOut, true);
    document.removeEventListener('selectionchange', onSelectionChange, true);
    document.removeEventListener('keydown', onKeyDown, true);
    document.removeEventListener('input', onAnyInput, true);
    document.removeEventListener('mousedown', onAnyInteraction, true);
    document.removeEventListener('mouseup', onAnyInteraction, true);
    document.removeEventListener('click', onAnyInteraction, true);
    window.removeEventListener('scroll', onScrollOrResize, true);
    window.removeEventListener('resize', onScrollOrResize);
  }

  function onFocusIn(evt: FocusEvent) {
    const supported = findSupportedInputFromEvent(evt);
    if (supported) {
      activeEl = supported;
      // One-shot info log so developers can confirm the extension is active even with default log level.
      if (!hasLoggedFirstActivation) {
        hasLoggedFirstActivation = true;
        log.info('controller.activated', { tag: supported.tagName });
      }
      log.debug('controller.focus.supported', { tag: supported.tagName, inputType: supported instanceof HTMLInputElement ? supported.type : 'textarea' });
      schedule();
      return;
    }

    activeEl = null;
    log.debug('controller.focus.unsupported');
    cancelAll();
  }

  function onFocusOut(evt: FocusEvent) {
    const fromEl = evt.target as Element | null;
    const toEl = evt.relatedTarget as Element | null;
    log.debug('controller.blur', {
      from: fromEl?.tagName ?? 'null',
      to: toEl?.tagName ?? 'null',
      toId: toEl?.id ?? null,
      toClass: toEl?.className ?? null,
      activeElement: document.activeElement?.tagName ?? 'null',
    });
    activeEl = null;
    cancelAll();
  }

  function onSelectionChange() {
    if (!activeEl) return;
    // Cursor move / selection updates are treated as cancellation triggers.
    cancelPendingOnly();
    cancelOverlayOnly();
    schedule();
  }

  function onAnyInput() {
    cancelAll();
    schedule();
  }

  function onAnyInteraction(evt: MouseEvent) {
    // Prevent focus steal: clicks on the ghost overlay should not blur the input.
    if (evt.type === 'mousedown' && overlay.isVisible()) {
      const target = evt.target as Element | null;
      if (target?.closest(`.${CSS.mirrorGhost}`)) {
        evt.preventDefault();
        return;
      }
    }
    cancelAll();
    schedule();
  }

  function onScrollOrResize() {
    if (!overlay.isVisible() || !activeEl) return;
    if (repositionRafId != null) return;
    repositionRafId = requestAnimationFrame(() => {
      repositionRafId = null;
      if (overlay.isVisible() && activeEl) {
        overlay.reposition(activeEl);
      }
    });
  }

  function onKeyDown(evt: KeyboardEvent) {
    if (!activeEl) return;

    // Never intercept keys during composition.
    if (isComposing) return;

    // Accept / dismiss while overlay is shown
    if (overlay.isVisible()) {
      if (isTabKey(evt)) {
        // Do not capture Shift+Tab or modified Tab (accessibility/navigation).
        if (isPlainTabKey(evt)) {
          evt.preventDefault();
          acceptOverlay();
          return;
        }
        cancelAll();
        return;
      }

      if (isEscapeKey(evt)) {
        evt.preventDefault();
        cancelAll();
        return;
      }

      // Any other key is considered interaction → cancel
      cancelAll();
      schedule();
      return;
    }

    // Optional Enter trigger: if focus stays in the input and the rest of conditions pass, schedule attempt.
    if (isEnterKey(evt)) {
      cancelAll();
      window.setTimeout(() => schedule(true), 0);
    }
  }

  function acceptOverlay() {
    if (!activeEl) return;
    const result = session.accept();
    if (!result) return;

    log.info('controller.accept', { emoji: result.emoji, reason: result.reason });
    insertAtCaret(activeEl, result.emoji);
    overlay.hide();
    session.resetIfCompleted();
  }

  function schedule(forceImmediate = false) {
    if (!activeEl) return;

    if (idleTimer != null) {
      window.clearTimeout(idleTimer);
      idleTimer = null;
    }

    const delay = forceImmediate ? 0 : IDLE_DELAY_MS;
    log.debug('controller.schedule', { delayMs: delay });
    idleTimer = window.setTimeout(() => {
      void maybeSuggest();
    }, delay);
  }

  async function maybeSuggest() {
    if (!activeEl) return;
    const snapshotResult = readSuggestionSnapshotFromActiveEl({ activeEl, isComposing });
    if (snapshotResult.kind !== 'ready') {
      log.debug('controller.attempt.guard', { reason: snapshotResult.reason });
      return;
    }

    // Cancel any previous pending request before starting a new one
    cancelPendingOnly();

    const nowMs = clock.nowMs();
    const snapshot: SuggestionInputSnapshot = snapshotResult.snapshot;

    const begun = beginEmojiSuggestionRequest({
      session,
      nowMs,
      snapshot,
      settings: DEFAULT_SETTINGS,
      skip: DEFAULT_SKIP,
      promptConfig: DEFAULT_PROMPT_CONFIG,
      cooldownMs: COOLDOWN_MS,
    });

    if (begun.kind !== 'begun') {
      log.debug('controller.attempt.skipped', { reason: begun.reason });
      return;
    }

    const availability = await ai.checkAvailability(DEFAULT_PROMPT_CONFIG);
    log.info('ai.availability', { state: availability });
    if (availability !== 'available') {
      const msg =
        availability === 'downloading' || availability === 'downloadable'
          ? 'The browser is downloading the AI model. Please wait a moment and try again.'
          : 'Emoji suggestions require Chrome/Edge with built-in AI enabled (chrome://flags → Prompt API).';
      const nowMs = clock.nowMs();
      if (
        shouldAllowThrottledAction({
          lastShownAtMs: lastUnavailableToastAtMs,
          nowMs,
          throttleMs: UNAVAILABLE_TOAST_THROTTLE_MS,
        })
      ) {
        lastUnavailableToastAtMs = nowMs;
        toast.show(activeEl, msg);
      } else {
        log.debug('toast.throttled', { kind: 'unavailable', availability });
      }
      session.cancelPendingOnly();
      return;
    }

    const abort = new AbortController();
    pendingAbort = abort;

    try {
      log.debug('ai.generate.begin', {
        contextLength: begun.contextLength,
        promptLength: begun.promptLength,
        maxTokens: DEFAULT_PROMPT_CONFIG.maxTokens,
        temperature: DEFAULT_PROMPT_CONFIG.temperature,
        topK: DEFAULT_PROMPT_CONFIG.topK,
      });
      const suggestion = await ai.generateSuggestion(begun.prompt, DEFAULT_PROMPT_CONFIG, abort.signal);

      log.debug('ai.generate.returned', { emoji: suggestion.emoji, reason: suggestion.reason, aborted: abort.signal.aborted });

      if (abort.signal.aborted) {
        log.debug('ai.generate.aborted-after-return');
        return;
      }

      const applied = applyEmojiSuggestionResult({ session, requestId: begun.requestId, suggestionResult: suggestion });
      log.debug('session.receiveSuggestion.result', { applied });

      if (!applied) {
        log.debug('session.receiveSuggestion.rejected');
        return;
      }

      log.debug('overlay.show.before', { activeElTag: activeEl?.tagName, emoji: suggestion.emoji });
      overlay.show(activeEl, suggestion.emoji, suggestion.reason);
      log.info('ai.generate.success', {
        contextLength: begun.contextLength,
        emoji: suggestion.emoji,
        reason: suggestion.reason,
        contextHash: begun.contextHash,
      });
    } catch {
      if (!abort.signal.aborted) {
        log.warn('ai.generate.error');
        toast.show(activeEl, 'Emoji suggestions are temporarily unavailable.');
        session.cancelPendingOnly();
      }
    } finally {
      if (pendingAbort === abort) pendingAbort = null;
    }
  }

  function cancelPendingOnly() {
    if (pendingAbort) {
      pendingAbort.abort();
      pendingAbort = null;
    }
    session.cancelPendingOnly();
  }

  function cancelOverlayOnly() {
    overlay.hide();
    session.cancelPendingOrOverlay();
  }

  function cancelAll() {
    if (idleTimer != null) {
      window.clearTimeout(idleTimer);
      idleTimer = null;
    }
    if (repositionRafId != null) {
      cancelAnimationFrame(repositionRafId);
      repositionRafId = null;
    }
    cancelPendingOnly();
    cancelOverlayOnly();
    toast.hide();
  }

  return { start, stop };
}

