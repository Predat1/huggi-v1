/**
 * Progressive text display with adaptive pacing.
 * Batches tokens for smooth rendering; adds pauses at punctuation.
 * Returns a cancel() function to abort early.
 */
export function streamChatText(
  fullText: string,
  onUpdate: (partial: string) => void,
  onComplete: () => void,
): () => void {
  if (!fullText) {
    queueMicrotask(onComplete);
    return () => {};
  }

  // Split into tokens: words + whitespace + punctuation groups
  const tokens: string[] = [];
  const re = /[.!?…]+\s*|\n+|,\s*|[^\s,.!?…\n]+|\s+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(fullText)) !== null) tokens.push(m[0]);

  if (tokens.length === 0) {
    queueMicrotask(onComplete);
    return () => {};
  }

  let i = 0;
  let acc = '';
  let t: ReturnType<typeof setTimeout> | null = null;
  let cancelled = false;

  // Adaptive delay per token
  const delayAfter = (token: string): number => {
    if (/[.!?…]/.test(token)) return 120;  // end-of-sentence pause
    if (/\n/.test(token))     return 80;   // newline pause
    if (/,/.test(token))      return 40;   // comma pause
    return 8;                               // normal word
  };

  // Batch up to N tokens per tick for longer text (avoids 1000s of setTimeouts)
  const batchSize = (len: number) => len > 500 ? 3 : len > 200 ? 2 : 1;

  const step = () => {
    if (cancelled) return;
    if (i >= tokens.length) {
      onComplete();
      return;
    }

    const batch = batchSize(tokens.length);
    for (let b = 0; b < batch && i < tokens.length; b++, i++) {
      acc += tokens[i];
    }
    onUpdate(acc);

    const delay = delayAfter(tokens[i - 1] ?? '');
    t = setTimeout(step, delay);
  };

  step();

  return () => {
    cancelled = true;
    if (t !== null) clearTimeout(t);
  };
}
