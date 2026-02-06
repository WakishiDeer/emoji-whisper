export type Context = string & { readonly __brand: 'Context' };

export function createContext(text: string): Context {
  return text as Context;
}

export function contextTrimmedLength(context: Context): number {
  return context.trim().length;
}
