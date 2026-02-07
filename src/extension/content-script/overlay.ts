import { splitTextAtCaret } from '../../core/domain/overlay/mirror-content';
import { createExtensionLogger } from '../diagnostics/logger';

const log = createExtensionLogger('overlay');

/* ------------------------------------------------------------------ */
/*  Presentation-layer constants                                      */
/*  Move to domain if i18n or format variants are needed.             */
/* ------------------------------------------------------------------ */

/** CSS class names — must stay in sync with content.css selectors. */
export const CSS = {
  mirror: 'ec-mirror',
  mirrorGhost: 'ec-mirror-ghost',
  tooltip: 'ec-ghost-tooltip',
  toast: 'ec-toast',
} as const;

/** ARIA attributes shared across overlay elements. */
const ARIA = {
  role: 'status' as const,
  live: 'polite' as const,
  label: (emoji: string) => `Suggested emoji: ${emoji}`,
};

/** Layout tuning knobs. */
const LAYOUT = {
  /** Vertical gap between the target element and a toast (px). */
  toastGapPx: 6,
};

/** Default auto-dismiss duration for toast messages (ms). */
const DEFAULT_TOAST_DURATION_MS = 3500;

/**
 * Computed-style properties copied from the target to the mirror div
 * so text layout is pixel-identical.
 */
const MIRROR_STYLE_PROPS = [
  'font',
  'fontSize',
  'fontFamily',
  'fontWeight',
  'fontStyle',
  'lineHeight',
  'letterSpacing',
  'wordSpacing',
  'textIndent',
  'textTransform',
  'textAlign',
  'padding',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'border',
  'borderTop',
  'borderRight',
  'borderBottom',
  'borderLeft',
  'boxSizing',
  'direction',
  'writingMode',
  'tabSize',
] as const;

export class GhostOverlay {
  /** Mirror container div positioned over the target. */
  private mirrorEl: HTMLDivElement | null = null;
  /** The ghost emoji span inside the mirror. */
  private ghostSpan: HTMLSpanElement | null = null;
  /** Tooltip element (child of ghost span). */
  private tooltipEl: HTMLDivElement | null = null;

  /** The target element we are overlaying. */
  private targetEl: HTMLTextAreaElement | HTMLInputElement | null = null;
  /** Saved original inline color of the target (restored on hide). */
  private savedColor = '';
  /** Saved original inline caretColor of the target (restored on hide). */
  private savedCaretColor = '';
  /** Original computed text color — used as the mirror's text color. */
  private originalComputedColor = '';
  /** The emoji currently displayed. */
  private currentEmoji: string | null = null;
  /** The reason currently displayed. */
  private currentReason: string | null = null;

  /** Scroll listener bound to the target element. */
  private scrollHandler: (() => void) | null = null;
  /** ResizeObserver watching the target element for size changes. */
  private resizeObserver: ResizeObserver | null = null;

  show(target: HTMLTextAreaElement | HTMLInputElement, emoji: string, reason?: string): void {
    // If already showing on a different target, clean up first.
    if (this.mirrorEl && this.targetEl && this.targetEl !== target) {
      this.hide();
    }

    const isNewTarget = this.targetEl !== target;
    this.targetEl = target;
    this.currentEmoji = emoji;
    this.currentReason = reason?.trim() || null;

    // --- Hide native text, keep caret visible ---
    if (isNewTarget) {
      const computed = getComputedStyle(target);
      this.savedColor = target.style.color;
      this.savedCaretColor = target.style.caretColor;
      this.originalComputedColor = computed.color;
      target.style.color = 'transparent';
      target.style.caretColor = this.originalComputedColor;
    }

    // --- Build or update the mirror ---
    this.buildMirror(target, emoji, reason);
    this.positionMirror(target);

    // --- Scroll sync ---
    if (isNewTarget) {
      this.attachScrollSync(target);
      this.attachResizeObserver(target);
    }

    log.debug('ghost.show', { emoji, reason: this.currentReason, targetTag: target.tagName });
  }

  getEmoji(): string | null {
    return this.currentEmoji;
  }

  getReason(): string | null {
    return this.currentReason;
  }

  reposition(target: HTMLTextAreaElement | HTMLInputElement): void {
    if (!this.mirrorEl) return;
    this.positionMirror(target);
    this.syncScroll(target);
  }

  hide(): void {
    const wasVisible = this.mirrorEl?.isConnected ?? false;

    // Remove mirror from DOM.
    if (this.mirrorEl?.isConnected) this.mirrorEl.remove();
    this.mirrorEl = null;
    this.ghostSpan = null;
    this.tooltipEl = null;

    // Restore target styles.
    if (this.targetEl) {
      this.targetEl.style.color = this.savedColor;
      this.targetEl.style.caretColor = this.savedCaretColor;
    }

    // Detach listeners.
    this.detachScrollSync();
    this.detachResizeObserver();

    this.targetEl = null;
    this.currentEmoji = null;
    this.currentReason = null;
    this.savedColor = '';
    this.savedCaretColor = '';
    this.originalComputedColor = '';

    if (wasVisible) {
      log.debug('ghost.hide', { wasVisible });
    }
  }

  isVisible(): boolean {
    return this.mirrorEl?.isConnected ?? false;
  }

  /* ---------------------------------------------------------------- */
  /*  Private: mirror construction                                    */
  /* ---------------------------------------------------------------- */

  private buildMirror(
    target: HTMLTextAreaElement | HTMLInputElement,
    emoji: string,
    reason?: string,
  ): void {
    // Remove existing mirror if rebuilding.
    if (this.mirrorEl?.isConnected) this.mirrorEl.remove();

    const mirror = document.createElement('div');
    mirror.className = CSS.mirror;
    mirror.setAttribute('role', ARIA.role);
    mirror.setAttribute('aria-live', ARIA.live);
    mirror.setAttribute('aria-atomic', 'true');
    mirror.setAttribute('aria-label', ARIA.label(emoji));

    // Copy text-layout styles from target.
    const computed = getComputedStyle(target);
    for (const prop of MIRROR_STYLE_PROPS) {
      (mirror.style as unknown as Record<string, string>)[prop] = computed[prop];
    }

    // Use the original computed color (captured before the transparent override)
    // so text inside the mirror matches the target's real appearance.
    mirror.style.color = this.originalComputedColor || computed.color;

    // White-space mode depends on element type.
    const isTextarea = target instanceof HTMLTextAreaElement;
    if (isTextarea) {
      mirror.style.whiteSpace = 'pre-wrap';
      mirror.style.wordWrap = 'break-word';
      mirror.style.overflowWrap = 'break-word';
    } else {
      mirror.style.whiteSpace = 'pre';
    }

    // Split text at caret using domain function.
    const caretOffset = target.selectionStart ?? target.value.length;
    const content = splitTextAtCaret(target.value, caretOffset, emoji);

    // --- Before text ---
    const beforeNode = document.createTextNode(content.before);
    mirror.appendChild(beforeNode);

    // --- Ghost span (emoji + tooltip) ---
    const ghostSpan = document.createElement('span');
    ghostSpan.className = CSS.mirrorGhost;
    ghostSpan.appendChild(document.createTextNode(content.ghost));

    const tooltip = document.createElement('div');
    tooltip.className = CSS.tooltip;
    tooltip.setAttribute('role', 'tooltip');
    const reasonText = reason?.trim() || '';
    tooltip.textContent = reasonText;
    tooltip.style.display = reasonText ? '' : 'none';
    ghostSpan.appendChild(tooltip);

    mirror.appendChild(ghostSpan);

    // --- After text ---
    const afterNode = document.createTextNode(content.after);
    mirror.appendChild(afterNode);

    document.body.appendChild(mirror);

    this.mirrorEl = mirror;
    this.ghostSpan = ghostSpan;
    this.tooltipEl = tooltip;
  }

  /* ---------------------------------------------------------------- */
  /*  Private: positioning                                            */
  /* ---------------------------------------------------------------- */

  private positionMirror(target: HTMLTextAreaElement | HTMLInputElement): void {
    if (!this.mirrorEl) return;

    const rect = target.getBoundingClientRect();
    this.mirrorEl.style.left = `${Math.round(rect.left + window.scrollX)}px`;
    this.mirrorEl.style.top = `${Math.round(rect.top + window.scrollY)}px`;
    this.mirrorEl.style.width = `${Math.round(rect.width)}px`;
    this.mirrorEl.style.height = `${Math.round(rect.height)}px`;

    this.syncScroll(target);
  }

  private syncScroll(target: HTMLTextAreaElement | HTMLInputElement): void {
    if (!this.mirrorEl) return;
    this.mirrorEl.scrollTop = target.scrollTop;
    this.mirrorEl.scrollLeft = target.scrollLeft;
  }

  /* ---------------------------------------------------------------- */
  /*  Private: scroll & resize sync                                   */
  /* ---------------------------------------------------------------- */

  private attachScrollSync(target: HTMLTextAreaElement | HTMLInputElement): void {
    this.detachScrollSync();
    const handler = () => this.syncScroll(target);
    target.addEventListener('scroll', handler);
    this.scrollHandler = handler;
  }

  private detachScrollSync(): void {
    if (this.scrollHandler && this.targetEl) {
      this.targetEl.removeEventListener('scroll', this.scrollHandler);
    }
    this.scrollHandler = null;
  }

  private attachResizeObserver(target: HTMLTextAreaElement | HTMLInputElement): void {
    this.detachResizeObserver();
    this.resizeObserver = new ResizeObserver(() => {
      if (this.mirrorEl && this.targetEl) {
        this.positionMirror(this.targetEl);
      }
    });
    this.resizeObserver.observe(target);
  }

  private detachResizeObserver(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }
}

export class ToastMessage {
  private el: HTMLDivElement | null = null;
  private hideTimer: number | null = null;

  show(target: HTMLElement, message: string, durationMs = DEFAULT_TOAST_DURATION_MS): void {
    this.hide();

    const el = document.createElement('div');
    el.className = CSS.toast;
    el.textContent = message;
    el.setAttribute('role', ARIA.role);
    el.setAttribute('aria-live', ARIA.live);

    document.body.appendChild(el);

    const rect = target.getBoundingClientRect();
    el.style.left = `${Math.round(rect.left + window.scrollX)}px`;
    el.style.top = `${Math.round(rect.bottom + LAYOUT.toastGapPx + window.scrollY)}px`;

    this.el = el;
    this.hideTimer = window.setTimeout(() => this.hide(), durationMs);
    log.debug('toast.show', { message, durationMs, left: rect.left, top: rect.bottom + LAYOUT.toastGapPx });
  }

  hide(): void {
    const wasVisible = this.el?.isConnected ?? false;
    if (this.hideTimer != null) {
      window.clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }
    if (this.el && this.el.isConnected) this.el.remove();
    this.el = null;
    if (wasVisible) {
      log.debug('toast.hide', { wasVisible });
    }
  }
}
