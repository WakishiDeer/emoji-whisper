import type { Context } from '../context/context';
import { type ContextHash, hashEquals } from '../context/context-hash';
import type { SuggestionResult } from './suggestion';

export type SessionState = 'Idle' | 'Pending' | 'Shown' | 'Completed';
export type CompletedReason = 'accepted' | 'dismissed' | null;

export type SuggestionRequestId = string & { readonly __brand: 'SuggestionRequestId' };

export type BeginRequestResult =
  | { kind: 'skipped'; reason: SkipReason }
  | { kind: 'begun'; requestId: SuggestionRequestId };

export type SkipReason =
  | 'cooldown'
  | 'same-context'
  | 'not-idle'
  | 'conditions'
  | 'too-short'
  | 'selection'
  | 'composing'
  | 'not-focused'
  | 'not-supported'
  | 'unavailable';

export type SuggestionSessionSnapshot = Readonly<{
  state: SessionState;
  context: Context | null;
  suggestionResult: SuggestionResult | null;
  completedReason: CompletedReason;
  lastAttemptAtMs: number;
  lastContextHash: ContextHash | null;
  pendingRequestId: SuggestionRequestId | null;
}>;

export class SuggestionSession {
  private state: SessionState = 'Idle';
  private context: Context | null = null;
  private suggestionResult: SuggestionResult | null = null;
  private completedReason: CompletedReason = null;

  private lastAttemptAtMs = Number.NEGATIVE_INFINITY;
  private lastContextHash: ContextHash | null = null;
  private pendingRequestId: SuggestionRequestId | null = null;

  getSnapshot(): SuggestionSessionSnapshot {
    return {
      state: this.state,
      context: this.context,
      suggestionResult: this.suggestionResult,
      completedReason: this.completedReason,
      lastAttemptAtMs: this.lastAttemptAtMs,
      lastContextHash: this.lastContextHash,
      pendingRequestId: this.pendingRequestId,
    };
  }

  isOverlayVisible(): boolean {
    return this.state === 'Shown' && this.suggestionResult != null;
  }

  beginRequest(params: {
    nowMs: number;
    context: Context;
    contextHash: ContextHash;
    cooldownMs: number;
  }): BeginRequestResult {
    const { nowMs, contextHash, context, cooldownMs } = params;

    if (nowMs - this.lastAttemptAtMs < cooldownMs) {
      return { kind: 'skipped', reason: 'cooldown' };
    }

    if (hashEquals(this.lastContextHash, contextHash)) {
      return { kind: 'skipped', reason: 'same-context' };
    }

    this.lastAttemptAtMs = nowMs;
    this.lastContextHash = contextHash;

    this.state = 'Pending';
    this.context = context;
    this.suggestionResult = null;
    this.completedReason = null;

    const requestId = createRequestId(nowMs);
    this.pendingRequestId = requestId;

    return { kind: 'begun', requestId };
  }

  cancelPendingOnly(): void {
    if (this.state !== 'Pending') return;

    this.state = 'Idle';
    this.context = null;
    this.suggestionResult = null;
    this.pendingRequestId = null;
    this.completedReason = null;
  }

  cancelPendingOrOverlay(): void {
    if (this.state === 'Pending' || this.state === 'Shown') {
      this.state = 'Idle';
      this.context = null;
      this.suggestionResult = null;
      this.pendingRequestId = null;
      this.completedReason = null;
    }
  }

  receiveSuggestion(params: { requestId: SuggestionRequestId; suggestionResult: SuggestionResult }): boolean {
    if (this.state !== 'Pending') return false;
    if (this.pendingRequestId == null) return false;
    if (params.requestId !== this.pendingRequestId) return false;

    this.state = 'Shown';
    this.suggestionResult = params.suggestionResult;
    this.pendingRequestId = null;

    if (this.suggestionResult == null) {
      // Invariant safety.
      this.cancelPendingOrOverlay();
      return false;
    }

    return true;
  }

  dismiss(): void {
    if (this.state !== 'Shown') return;
    this.state = 'Completed';
    this.completedReason = 'dismissed';
  }

  accept(): SuggestionResult | null {
    if (this.state !== 'Shown') return null;
    if (!this.suggestionResult) return null;

    this.state = 'Completed';
    this.completedReason = 'accepted';
    return this.suggestionResult;
  }

  resetIfCompleted(): void {
    if (this.state !== 'Completed') return;
    this.state = 'Idle';
    this.context = null;
    this.suggestionResult = null;
    this.pendingRequestId = null;
    this.completedReason = null;
  }
}

function createRequestId(nowMs: number): SuggestionRequestId {
  // Opaque request id suitable for ignoring late responses.
  const id = `${nowMs}-${Math.random().toString(16).slice(2)}`;
  return id as SuggestionRequestId;
}
