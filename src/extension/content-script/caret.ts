export type CaretPosition = Readonly<{ left: number; top: number; height: number }>;

export function getCaretPosition(el: HTMLTextAreaElement | HTMLInputElement): CaretPosition | null {
  const isTextArea = el instanceof HTMLTextAreaElement;
  const isTextInput = el instanceof HTMLInputElement && el.type === 'text';
  if (!isTextArea && !isTextInput) return null;

  const selectionStart = el.selectionStart;
  if (selectionStart == null) return null;

  const computed = getComputedStyle(el);

  const mirror = document.createElement('div');
  mirror.style.position = 'absolute';
  mirror.style.top = '0px';
  mirror.style.left = '0px';
  mirror.style.visibility = 'hidden';
  mirror.style.whiteSpace = 'pre-wrap';
  mirror.style.wordWrap = 'break-word';
  mirror.style.font = computed.font;
  mirror.style.padding = computed.padding;
  mirror.style.border = computed.border;
  mirror.style.boxSizing = computed.boxSizing;
  mirror.style.width = `${el.clientWidth}px`;
  mirror.style.lineHeight = computed.lineHeight;

  if (!isTextArea) {
    mirror.style.whiteSpace = 'pre';
  }

  const before = el.value.slice(0, selectionStart);
  const after = el.value.slice(selectionStart);

  mirror.textContent = before;

  const marker = document.createElement('span');
  marker.textContent = after.length ? after[0] : '\u200b';

  mirror.appendChild(marker);
  document.body.appendChild(mirror);

  const mirrorRect = mirror.getBoundingClientRect();
  const markerRect = marker.getBoundingClientRect();

  document.body.removeChild(mirror);

  const elRect = el.getBoundingClientRect();

  const left = elRect.left + (markerRect.left - mirrorRect.left) - el.scrollLeft + window.scrollX;
  const top = elRect.top + (markerRect.top - mirrorRect.top) - el.scrollTop + window.scrollY;

  const height = markerRect.height || parseFloat(computed.lineHeight) || 16;

  return { left, top, height };
}
