/**
 * Scalable rate limiter — Redis-backed with automatic in-memory fallback.
 * Set REDIS_URL to enable distributed rate limiting across multiple instances.
 */
import Redis from 'ioredis';

let redis = null;

if (process.env.REDIS_URL) {
  try {
    redis = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      enableOfflineQueue: false,
      connectTimeout: 3000,
      maxRetriesPerRequest: 1,
    });
    redis.on('error', (err) => {
      console.warn('[RateLimit] Redis error — falling back to in-memory:', err.message);
      redis = null;
    });
    console.log('[RateLimit] Redis rate limiter active');
  } catch {
    redis = null;
  }
} else {
  console.log('[RateLimit] No REDIS_URL — using in-memory rate limiter (single-instance only)');
}

// In-memory fallback store
const _store = new Map();
setInterval(() => {
  const cutoff = Date.now() - 120_000;
  for (const [key, entry] of _store) {
    if (entry.start < cutoff) _store.delete(key);
  }
}, 120_000);

/**
 * Returns true if the request is allowed, false if rate-limited.
 * @param {string} key        - unique key (e.g. IP address)
 * @param {number} windowMs   - sliding window in ms (default 60s)
 * @param {number} maxHits    - max allowed requests per window
 */
export async function checkRateLimit(key, windowMs = 60_000, maxHits = 30) {
  if (redis) {
    try {
      const redisKey = `rl:${key}`;
      const count = await redis.incr(redisKey);
      if (count === 1) await redis.pexpire(redisKey, windowMs);
      return count <= maxHits;
    } catch {
      // Redis failed mid-request — fall through to in-memory
    }
  }

  // In-memory fallback
  const now = Date.now();
  let entry = _store.get(key);
  if (!entry || now - entry.start > windowMs) {
    entry = { start: now, count: 0 };
    _store.set(key, entry);
  }
  entry.count++;
  return entry.count <= maxHits;
}

/**
 * Express middleware factory.
 * @param {number} windowMs
 * @param {number} maxHits
 */
export function createRateLimiter(windowMs = 60_000, maxHits = 30) {
  return async (req, res, next) => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const allowed = await checkRateLimit(ip, windowMs, maxHits);
    if (!allowed) {
      return res.status(429).json({ error: 'Trop de requêtes. Veuillez patienter.' });
    }
    next();
  };
}
