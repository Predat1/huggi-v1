/**
 * Site storage abstraction — two backends, auto-selected:
 *
 *  1. Supabase Storage  (if SUPABASE_URL + SUPABASE_SERVICE_KEY are set)
 *     → Stores index.html + bundle.js as objects in bucket "huggy-sites"
 *     → Public URLs returned and saved in deployments.storage_url
 *     → Best for scale: no DB bloat, CDN-served, cheap
 *
 *  2. Compressed DB  (fallback, zero extra config)
 *     → gzip + base64 stored in deployments.html_content / bundle_content
 *     → ~70% smaller than raw text storage
 *     → Works immediately with existing setup
 *
 * Usage:
 *   const { storageUrl } = await storeSite(slug, html, bundle);
 *   const { html, bundle }  = await fetchSite(slug, pool, deployment);
 */

import { createClient } from '@supabase/supabase-js';
import { gzipSync, gunzipSync } from 'zlib';

const BUCKET = 'huggy-sites';

function getStorageClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key).storage;
}

// ── Compression helpers ──────────────────────────────────────────────────────

export function compress(text) {
  return gzipSync(Buffer.from(text, 'utf8')).toString('base64');
}

export function decompress(b64) {
  return gunzipSync(Buffer.from(b64, 'base64')).toString('utf8');
}

function isCompressed(str) {
  // base64 gzip magic bytes start with 'H4sI'
  return typeof str === 'string' && str.startsWith('H4sI');
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Store a built site.
 * @returns {{ storageUrl: string|null, html: string, bundle: string }}
 *   storageUrl  — public Supabase Storage URL (null when using DB fallback)
 *   html/bundle — (possibly compressed) values to persist in the DB row
 */
export async function storeSite(slug, html, bundle) {
  const storage = getStorageClient();

  if (storage) {
    try {
      // Ensure bucket exists
      const { data: buckets } = await storage.listBuckets();
      if (!buckets?.find(b => b.name === BUCKET)) {
        await storage.createBucket(BUCKET, { public: true, fileSizeLimit: 10 * 1024 * 1024 });
      }

      await storage.from(BUCKET).upload(`${slug}/index.html`, Buffer.from(html, 'utf8'), {
        contentType: 'text/html; charset=utf-8',
        upsert: true,
        cacheControl: '3600',
      });

      await storage.from(BUCKET).upload(`${slug}/bundle.js`, Buffer.from(bundle, 'utf8'), {
        contentType: 'application/javascript',
        upsert: true,
        cacheControl: '3600',
      });

      const { data } = storage.from(BUCKET).getPublicUrl(`${slug}/index.html`);
      const storageUrl = data?.publicUrl || null;

      console.log(`[siteStorage] Uploaded to Supabase Storage: ${storageUrl}`);
      return { storageUrl, html: null, bundle: null };
    } catch (e) {
      console.warn('[siteStorage] Storage upload failed, falling back to DB:', e.message);
    }
  }

  // Fallback: compress + store in DB
  return {
    storageUrl: null,
    html: compress(html),
    bundle: compress(bundle),
  };
}

/**
 * Retrieve HTML + bundle for a deployment.
 * @param {string} slug
 * @param {object} deployment  — row from DB (has storage_url, html_content, bundle_content)
 * @returns {{ html: string, bundle: string } | null}
 */
export async function fetchSite(slug, deployment) {
  if (!deployment) return null;

  // 1. Supabase Storage path
  if (deployment.storage_url) {
    const storage = getStorageClient();
    if (storage) {
      try {
        const { data: htmlData, error: he } = await storage.from(BUCKET).download(`${slug}/index.html`);
        const { data: jsData, error: je } = await storage.from(BUCKET).download(`${slug}/bundle.js`);
        if (!he && !je && htmlData && jsData) {
          return {
            html: await htmlData.text(),
            bundle: await jsData.text(),
          };
        }
      } catch (e) {
        console.warn('[siteStorage] Storage download failed:', e.message);
      }
    }
    // Storage unreachable — try DB columns as last resort
  }

  // 2. DB columns (possibly compressed)
  const html = deployment.html_content
    ? isCompressed(deployment.html_content) ? decompress(deployment.html_content) : deployment.html_content
    : null;
  const bundle = deployment.bundle_content
    ? isCompressed(deployment.bundle_content) ? decompress(deployment.bundle_content) : deployment.bundle_content
    : null;

  if (html && bundle) return { html, bundle };
  return null;
}
