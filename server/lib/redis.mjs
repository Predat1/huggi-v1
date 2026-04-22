/**
 * Shared Redis client — imported by rateLimiter, aiCache, and any other module that needs Redis.
 * Falls back silently to null if REDIS_URL is not configured.
 */
import Redis from 'ioredis';

let redis = null;

if (process.env.REDIS_URL) {
  try {
    redis = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      enableOfflineQueue: false,
      connectTimeout: 3_000,
      maxRetriesPerRequest: 1,
    });
    redis.on('error', (err) => {
      console.warn('[Redis] Connection error — falling back to no-cache mode:', err.message);
      redis = null;
    });
    console.log('[Redis] Client initialised');
  } catch {
    redis = null;
  }
} else {
  console.log('[Redis] REDIS_URL not set — Redis features disabled');
}

export { redis };
export default redis;
