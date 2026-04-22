/**
 * AI response cache — Redis-backed, 2-hour TTL.
 * Keyed by SHA-256(model + prompt + context fingerprint).
 * Transparent no-op when Redis is unavailable.
 */
import crypto from 'crypto';
import { redis } from './redis.mjs';

const TTL_SECONDS = 7_200; // 2 hours
const PREFIX = 'huggy:ai:';

function makeKey(model, prompt, contextFingerprint = '') {
  const raw = `${model}::${prompt}::${contextFingerprint}`;
  return PREFIX + crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Returns a cached AI response, or null on miss / Redis unavailable.
 * @param {string} model
 * @param {string} prompt
 * @param {string} [contextFingerprint]
 */
export async function getCached(model, prompt, contextFingerprint = '') {
  if (!redis) return null;
  try {
    const val = await redis.get(makeKey(model, prompt, contextFingerprint));
    if (!val) return null;
    return JSON.parse(val);
  } catch {
    return null;
  }
}

/**
 * Stores an AI response in cache.
 * @param {string} model
 * @param {string} prompt
 * @param {string} contextFingerprint
 * @param {*} value
 */
export async function setCached(model, prompt, contextFingerprint = '', value) {
  if (!redis) return;
  try {
    await redis.setex(makeKey(model, prompt, contextFingerprint), TTL_SECONDS, JSON.stringify(value));
  } catch {
    // Cache write failure is non-fatal
  }
}

/**
 * Compute a short fingerprint from an object (e.g. allFiles map) for cache keying.
 * @param {Record<string, string>} filesMap
 * @returns {string}
 */
export function fingerprintFiles(filesMap) {
  const content = Object.entries(filesMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([p, c]) => `${p}:${c.length}`)
    .join('|');
  return crypto.createHash('md5').update(content).digest('hex').slice(0, 12);
}
