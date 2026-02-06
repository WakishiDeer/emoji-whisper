import type { Context } from './context';
import { hashStringDjb2 } from '../../shared/hash/djb2';

export type ContextHash = number & { readonly __brand: 'ContextHash' };

export function createContextHash(hash: number): ContextHash {
  return (hash >>> 0) as ContextHash;
}

export function hashEquals(a: ContextHash | null, b: ContextHash | null): boolean {
  return a != null && b != null && a === b;
}

export function hashContextDjb2(context: Context): ContextHash {
  return createContextHash(hashStringDjb2(context));
}
