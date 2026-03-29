/**
 * Affichage progressif type "chat pro" : débit adaptatif aux mots / ponctuation.
 * Retourne une fonction `cancel()` pour nettoyer les timeouts.
 */
export function streamChatText(
  fullText: string,
  onUpdate: (partial: string) => void,
  onComplete: () => void,
): () => void {
  const segments: string[] = [];
  const re = /\S+|\s+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(fullText)) !== null) {
    segments.push(m[0]);
  }
  if (segments.length === 0) {
    queueMicrotask(onComplete);
    return () => {};
  }

  let i = 0;
  let acc = '';
  let t: ReturnType<typeof setTimeout> | null = null;
  let cancelled = false;

  const delayAfter = (seg: string) => {
    if (/^\s+$/.test(seg)) {
      return Math.min(28, 6 + seg.length * 5);
    }
    if (/[.!?…][)\]"']*$/.test(seg) || /^\.\.\.+$/.test(seg)) {
      return 72 + Math.min(seg.length * 6, 48);
    }
    if (/[,;:]$/.test(seg)) {
      return 38;
    }
    if (seg.includes('\n')) {
      return 44;
    }
    const n = seg.length;
    if (n <= 2) return 26;
    if (n <= 5) return 34;
    if (n <= 12) return 42;
    return Math.min(56, 30 + Math.floor(n / 3));
  };

  const step = () => {
    if (cancelled) return;
    if (i >= segments.length) {
      onComplete();
      return;
    }
    acc += segments[i];
    onUpdate(acc);
    i += 1;
    t = setTimeout(step, delayAfter(segments[i - 1]));
  };

  step();

  return () => {
    cancelled = true;
    if (t !== null) clearTimeout(t);
  };
}
