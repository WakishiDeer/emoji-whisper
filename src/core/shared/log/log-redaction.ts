export type RedactedText = Readonly<{
  kind: 'redacted-text';
  length: number;
  hint?: string;
}>;

export function redactText(text: string, hint?: string): RedactedText {
  const length = text.length;
  return {
    kind: 'redacted-text',
    length,
    hint,
  };
}
