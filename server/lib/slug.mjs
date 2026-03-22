const ALPHABET = '23456789abcdefghjkmnpqrstuvwxyz';

export function randomSlug(len = 12) {
  let s = '';
  for (let i = 0; i < len; i++) {
    s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return s;
}
