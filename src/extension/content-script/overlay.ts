import { getCaretPosition } from './caret';
import { createExtensionLogger } from '../diagnostics/logger';

const log = createExtensionLogger('overlay');

/* ------------------------------------------------------------------ */
/*  Presentation-layer constants                                      */
/*  Move to domain if i18n or format variants are needed.             */
/* ------------------------------------------------------------------ */

/** CSS class names — must stay in sync with content.css selectors. */
export const CSS = {
  ghost: 'ec-ghost',
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
  /** Fraction of caret height used to nudge the ghost downward. */
  caretNudgeRatio: 0.15,
  /** Vertical gap between the target element and a toast (px). */
  toastGapPx: 6,
};

/** Default auto-dismiss duration for toast messages (ms). */
const DEFAULT_TOAST_DURATION_MS = 3500;

export class GhostOverlay {
  private readonly el: HTMLDivElement;
  private readonly tooltipEl: HTMLDivElement;

  constructor() {
    const el = document.createElement('div');
    el.className = CSS.ghost;
    el.setAttribute('role', ARIA.role);
    el.setAttribute('aria-live', ARIA.live);
    el.setAttribute('aria-atomic', 'true');

    const tooltip = document.createElement('div');
    tooltip.className = CSS.tooltip;
    tooltip.setAttribute('role', 'tooltip');
    el.appendChild(tooltip);

    this.el = el;
    this.tooltipEl = tooltip;
  }

  show(target: HTMLTextAreaElement | HTMLInputElement, emoji: string, reason?: string): void {
    const wasConnected = this.el.isConnected;

    // Set emoji as direct text node (before the tooltip child).
    this.setEmojiText(emoji);
    this.el.setAttribute('aria-label', ARIA.label(emoji));

    // Set tooltip content.
    const reasonText = reason?.trim() || '';
    this.tooltipEl.textContent = reasonText;
    this.tooltipEl.style.display = reasonText ? '' : 'none';

    // Copy font metrics from target so the emoji renders at the correct scale.
    const computed = getComputedStyle(target);
    this.el.style.fontSize = computed.fontSize;
    this.el.style.lineHeight = computed.lineHeight;

    if (!this.el.isConnected) document.body.appendChild(this.el);
    this.reposition(target);
    log.debug('ghost.show', { emoji, reason: reasonText, wasConnected, targetTag: target.tagName });
  }

  getEmoji(): string | null {
    // Emoji is stored as a text node before the tooltip child.
    for (const node of Array.from(this.el.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent?.trim();
        if (text) return text;
      }
    }
    return null;
  }

  getReason(): string | null {
    return this.tooltipEl.textContent?.trim() || null;
  }

  private setEmojiText(emoji: string): void {
    // Remove existing text nodes (keep tooltip child element).
    for (const node of Array.from(this.el.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) node.remove();
    }
    this.el.insertBefore(document.createTextNode(emoji), this.tooltipEl);
  }

  reposition(target: HTMLTextAreaElement | HTMLInputElement): void {
    const pos = getCaretPosition(target);
    if (!pos) {
      // Fallback: position near the bottom-right of the input element.
      const rect = target.getBoundingClientRect();
      const fallbackLeft = rect.right + window.scrollX;
      const fallbackTop = rect.bottom + window.scrollY;
      this.el.style.left = `${Math.round(fallbackLeft)}px`;
      this.el.style.top = `${Math.round(fallbackTop)}px`;
      this.el.style.transform = '';
      log.debug('ghost.reposition.fallback', { left: fallbackLeft, top: fallbackTop, targetTag: target.tagName });
      return;
    }

    this.el.style.left = `${Math.round(pos.left)}px`;
    this.el.style.top = `${Math.round(pos.top)}px`;
    this.el.style.transform = `translate(0, ${Math.round(pos.height * LAYOUT.caretNudgeRatio)}px)`;
    log.debug('ghost.reposition', { left: pos.left, top: pos.top, height: pos.height });
  }

  hide(): void {
    const wasVisible = this.el.isConnected;
    if (this.el.isConnected) this.el.remove();
    if (wasVisible) {
      log.debug('ghost.hide', { wasVisible });
    }
  }

  isVisible(): boolean {
    return this.el.isConnected;
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
