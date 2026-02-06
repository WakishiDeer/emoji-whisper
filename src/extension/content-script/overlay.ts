import { getCaretPosition } from './caret';
import { createExtensionLogger } from '../diagnostics/logger';

const log = createExtensionLogger('overlay');

export class GhostOverlay {
  private readonly el: HTMLDivElement;

  constructor() {
    const el = document.createElement('div');
    el.className = 'ec-ghost';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-atomic', 'true');
    this.el = el;
  }

  show(target: HTMLTextAreaElement | HTMLInputElement, emoji: string): void {
    const wasConnected = this.el.isConnected;
    this.el.textContent = emoji;
    this.el.setAttribute('aria-label', `Suggested emoji: ${emoji}`);

    // Copy font metrics from target so the emoji renders at the correct scale.
    const computed = getComputedStyle(target);
    this.el.style.fontSize = computed.fontSize;
    this.el.style.lineHeight = computed.lineHeight;

    if (!this.el.isConnected) document.body.appendChild(this.el);
    this.reposition(target);
    log.debug('ghost.show', { emoji, wasConnected, targetTag: target.tagName });
  }

  getEmoji(): string | null {
    return this.el.textContent?.trim() || null;
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
    this.el.style.transform = `translate(0, ${Math.round(pos.height * 0.15)}px)`;
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

  show(target: HTMLElement, message: string, durationMs = 3500): void {
    this.hide();

    const el = document.createElement('div');
    el.className = 'ec-toast';
    el.textContent = message;
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');

    document.body.appendChild(el);

    const rect = target.getBoundingClientRect();
    el.style.left = `${Math.round(rect.left + window.scrollX)}px`;
    el.style.top = `${Math.round(rect.bottom + 6 + window.scrollY)}px`;

    this.el = el;
    this.hideTimer = window.setTimeout(() => this.hide(), durationMs);
    log.debug('toast.show', { message, durationMs, left: rect.left, top: rect.bottom + 6 });
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
