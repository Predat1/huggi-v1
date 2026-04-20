/**
 * Huggy API + fichiers statiques (prod).
 */
import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { mkdir } from 'fs/promises';
import { createPool, initSchema } from './lib/db.mjs';
import { runChat, runGenerate, runChatStream, runGenerateStream } from './lib/aiGenerate.mjs';
import { runAgenticPipeline, runPostGenerationReview } from './lib/agents.mjs';
import {
  PREVIEW_ENTRY,
  createProject,
  getProject,
  seedDefaultFiles,
  listFiles,
  upsertFile,
  deleteFile,
  createDeployment,
  updateDeploymentStatus,
  listDeployments,
  getOrCreateProfile,
  deductCredits,
  getUserActiveProjectsCount,
  getProjectByDomain,
  getProjectSecrets,
  upsertProjectSecret,
  deleteProjectSecret,
  updateProjectDomain,
} from './lib/projectsRepo.mjs';
import { DEFAULT_PREVIEW_CODE } from './lib/defaultAppCode.mjs';
import { buildUserSiteToDir } from './lib/deploy.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

// Important for production: never overwrite environment variables injected by the host/platform.
// Load .env.local first so it takes precedence over empty defaults in .env
dotenv.config({ path: path.join(root, '.env.local') });
dotenv.config({ path: path.join(root, '.env') });

const isProd = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT || (isProd ? 8080 : 3001));
const sitesDir = process.env.SITES_DIR || path.join(root, 'data', 'sites');
const previewRootDomain = process.env.PREVIEW_ROOT_DOMAIN || '';

/* ——— Rate Limiter (in-memory, per IP) ——— */
const _rlMap = new Map();
const RL_WINDOW_MS = 60_000; // 1 minute
const RL_MAX_HITS  = 30;     // 30 requests per window

function rateLimiter(req, res, next) {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  let entry = _rlMap.get(ip);
  if (!entry || now - entry.start > RL_WINDOW_MS) {
    entry = { start: now, count: 0 };
    _rlMap.set(ip, entry);
  }
  entry.count++;
  if (entry.count > RL_MAX_HITS) {
    return res.status(429).json({ error: 'Too many requests. Please wait.' });
  }
  next();
}
// Periodic cleanup to avoid memory leaks
setInterval(() => {
  const cutoff = Date.now() - RL_WINDOW_MS * 2;
  for (const [ip, entry] of _rlMap) {
    if (entry.start < cutoff) _rlMap.delete(ip);
  }
}, RL_WINDOW_MS * 2);

/** Mask error details in production */
function safeError(e) {
  if (isProd) return 'Internal server error';
  return e instanceof Error ? e.message : String(e);
}

const pool = createPool();

function isUuid(v) {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function normalizeAndValidateProjectPath(p) {
  if (typeof p !== 'string') return null;
  const normalized = p.replace(/\\/g, '/').trim();
  if (!normalized) return null;
  if (normalized.length > 500) return null;
  if (normalized.includes('\u0000')) return null;
  if (normalized.startsWith('/')) return null;
  if (normalized.startsWith('./')) return null;
  if (normalized.includes('../') || normalized === '..') return null;
  if (!/^[A-Za-z0-9._/-]+$/.test(normalized)) return null;
  return normalized;
}

function publicBaseUrl(req) {
  if (process.env.PUBLIC_APP_URL) {
    return process.env.PUBLIC_APP_URL.replace(/\/$/, '');
  }
  if (isProd) {
    const proto = req.get('x-forwarded-proto') || 'https';
    const host = req.get('host') || `localhost:${PORT}`;
    return `${proto}://${host}`;
  }
  return `http://localhost:3000`;
}

function liveUrl(req, slug) {
  return `${publicBaseUrl(req)}/live/${slug}/`;
}

import Stripe from 'stripe';
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1); // Railway / reverse proxy

app.post('/api/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    if (!stripe) throw new Error('No Stripe Key Configured');
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    console.log('[Stripe] Checkout success:', session.id);
    const userId = session.metadata?.userId;
    const plan = session.metadata?.plan || 'pro';
    let creditsToAdd = 0;
    if (plan === 'hobby') creditsToAdd = 1000;
    else if (plan === 'pro') creditsToAdd = 3000;
    else if (plan === 'scale') creditsToAdd = 10000;

    if (userId && pool) {
      let customerId = session.customer;
      try {
        await pool.query(
          `UPDATE profiles SET tier = $2, is_pro = true, credits = credits + $3, stripe_customer_id = COALESCE(stripe_customer_id, $4) WHERE id = $1`,
          [userId, plan, creditsToAdd, customerId]
        );
        console.log(`[Stripe] Successfully upgraded user ${userId} to ${plan}`);
      } catch (e) {
        console.error(`[Stripe] SQL Error updating user ${userId}`, e);
      }
    }
  }
  res.send();
});

app.post('/api/checkout', express.json(), async (req, res) => {
  if (!stripe) return res.status(500).json({ error: 'Stripe API non configurée.' });
  try {
    const plan = req.body?.plan || 'pro';
    const prices = {
      hobby: { unit_amount: 1900, name: 'Huggy Hobby' },
      pro: { unit_amount: 3900, name: 'Huggy Pro' },
      scale: { unit_amount: 9900, name: 'Huggy Scale' }
    };
    const selected = prices[plan] || prices.pro;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: { currency: 'eur', product_data: { name: selected.name }, unit_amount: selected.unit_amount },
        quantity: 1,
      }],
      mode: 'payment',
      metadata: { plan: plan, userId: req.body?.userId },
      success_url: `${publicBaseUrl(req)}/?plan=${plan}&status=success`,
      cancel_url: `${publicBaseUrl(req)}/?status=cancel`,
    });
    res.json({ url: session.url });
  } catch (e) {
    res.status(500).json({ error: safeError(e) });
  }
});

app.post('/api/billing/portal', express.json(), async (req, res) => {
  if (!stripe) return res.status(500).json({ error: 'Stripe API non configurée.' });
  try {
    const userId = req.body?.userId;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });
    const profile = await getOrCreateProfile(pool, userId);
    if (!profile.stripe_customer_id) return res.status(400).json({ error: "Aucun abonnement existant." });
    
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${publicBaseUrl(req)}/`,
    });
    res.json({ url: session.url });
  } catch (e) {
    res.status(500).json({ error: safeError(e) });
  }
});

app.use(express.json({ limit: '5mb' }));

// Security headers + CORS
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  // CORS — restrict to the configured app URL
  const origin = req.get('origin');
  const allowed = process.env.PUBLIC_APP_URL || 'http://localhost:3000';
  if (origin && (origin === allowed || !isProd)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

/** Middleware: Custom Domains Router */
app.use(async (req, res, next) => {
  const host = (req.get('host') || '').split(':')[0];
  if (!pool || host === 'localhost' || host === '127.0.0.1' || host.endsWith('.railway.app') || host.endsWith('huggy.sbs') || (previewRootDomain && host.endsWith(previewRootDomain))) {
    return next();
  }
  
  try {
    const project = await getProjectByDomain(pool, host);
    if (project) {
      const slug = project.slug;
      
      // Enforce rate limiter on this custom domain explicitly to prevent DDoS leakage
      const ip = req.ip || req.socket?.remoteAddress || 'unknown';
      let entry = _rlMap.get(`proxy-${slug}-${ip}`);
      if (!entry || Date.now() - entry.start > 60000) entry = { start: Date.now(), count: 0 };
      entry.count++;
      _rlMap.set(`proxy-${slug}-${ip}`, entry);
      
      if (entry.count > 300) return res.status(429).send("Alerte: Trafic trop élevé sur le domaine.");

      const dir = path.join(sitesDir, slug);
      if (fs.existsSync(dir)) {
        return express.static(dir, { index: 'index.html' })(req, res, next);
      }
    }
  } catch(e) {
    console.error("Custom domain error:", e);
  }
  next();
});

/** Sous-domaines : {slug}.{PREVIEW_ROOT_DOMAIN} → fichiers statiques protégés */
if (previewRootDomain) {
  app.use((req, res, next) => {
    const host = (req.get('host') || '').split(':')[0];
    if (!host.endsWith(previewRootDomain)) return next();
    const slug = host.slice(0, -(previewRootDomain.length + 1));
    if (!slug || slug.includes('.')) return next();
    
    // Limits tracking logic
    // Rate limiter on static proxy is enforced locally here.
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    let entry = _rlMap.get('live-' + ip);
    if (!entry || Date.now() - entry.start > 60000) entry = { start: Date.now(), count: 0 };
    entry.count++;
    _rlMap.set('live-' + ip, entry);
    if (entry.count > 300) return res.status(429).send("Trafic trop élevé. Bande passante saturée pour ce projet.");

    const dir = path.join(sitesDir, slug);
    if (!fs.existsSync(dir)) return next();
    express.static(dir, { index: 'index.html' })(req, res, next);
  });
}

/** 
 * Subdomain Wildcard Routing (Vercel/Bolt style)
 * e.g., project-slug.huggy.sbs
 */
app.use((req, res, next) => {
  const host = req.get('host') || '';
  
  // Only process if PREVIEW_ROOT_DOMAIN is set and host is a subdomain
  if (previewRootDomain && host.endsWith(previewRootDomain) && host !== previewRootDomain && !host.startsWith('www.' + previewRootDomain)) {
    const slug = host.replace('.' + previewRootDomain, '').split(':')[0];
    
    // Rate Limiting
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    let entry = _rlMap.get(`proxy-${slug}-${ip}`);
    if (!entry || Date.now() - entry.start > 60000) entry = { start: Date.now(), count: 0 };
    entry.count++;
    _rlMap.set(`proxy-${slug}-${ip}`, entry);
    if (entry.count > 200) {
      return res.status(429).send("Alerte: Hébergement auto saturé (limite de 200 rps activée sur ce projet Huggy). Veuillez passer au plan Scale.");
    }

    const dir = path.join(sitesDir, slug);
    if (!fs.existsSync(dir)) {
      return res.status(404).send('Preview introuvable ou build en cours.');
    }
    return express.static(dir, { index: 'index.html' })(req, res, () => {
      if (!res.writableEnded) res.status(404).send('Fichier introuvable.');
    });
  }
  
  next();
});

/** Chemins /live/:slug/* (Fallback sans wildcard DNS) avec limite de bande passante/requêtes externes */
app.use('/live/:slug', (req, res, next) => {
  const { slug } = req.params;
  if (!/^[\w-]+$/.test(slug)) return res.status(400).send('Slug invalide.');

  // Rate Limiting auto-hébergement: DDoS & requêtes externes proxy protection
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  let entry = _rlMap.get(`proxy-${slug}-${ip}`);
  if (!entry || Date.now() - entry.start > 60000) entry = { start: Date.now(), count: 0 };
  entry.count++;
  _rlMap.set(`proxy-${slug}-${ip}`, entry);
  if (entry.count > 200) {
    return res.status(429).send("Alerte: Hébergement auto saturé (limite de 200 rps activée sur ce projet Huggy). Veuillez passer au plan Scale.");
  }

  const dir = path.join(sitesDir, slug);
  if (!fs.existsSync(dir)) {
    return res.status(404).send('Preview introuvable ou build en cours.');
  }
  express.static(dir, { index: 'index.html' })(req, res, () => {
    if (!res.writableEnded) res.status(404).send('Fichier introuvable.');
  });
});

app.get('/api/health', async (_req, res) => {
  let dbOk = false;
  if (pool) {
    try {
      await pool.query('SELECT 1');
      dbOk = true;
    } catch {
      dbOk = false;
    }
  }
  // Do NOT expose which API keys are configured — information leak
  res.json({
    ok: true,
    env: isProd ? 'production' : 'development',
    database: pool ? (dbOk ? 'connected' : 'error') : 'disabled',
  });
});

/* ——— Projets (sans auth : connaître l’UUID = accès) ——— */

app.post('/api/projects', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'Service unavailable' });
  }
  try {
    const userId = req.body?.userId;
    let ownerId = null;

    if (userId) {
      const profile = await getOrCreateProfile(pool, userId, req.body?.userEmail);
      const activeCount = await getUserActiveProjectsCount(pool, userId);
      const limits = { free: 1, hobby: 2, pro: 5, scale: 9999 };
      const tierLimits = limits[profile.tier] ?? 1;

      if (activeCount >= tierLimits) {
        return res.status(402).json({ error: `Votre plan Saas [${profile.tier.toUpperCase()}] ne permet pas de créer un nouveau projet hébergé (${tierLimits} max). Mettez à niveau votre abonnement pour débloquer de nouveaux serveurs.` });
      }
      ownerId = profile.id;
    }

    const name = typeof req.body?.name === 'string' ? req.body.name : 'Nouveau Projet SaaS';
    const project = await createProject(pool, name, ownerId);
    await seedDefaultFiles(pool, project.id, DEFAULT_PREVIEW_CODE);
    const files = await listFiles(pool, project.id);
    res.status(201).json({ project, files });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: safeError(e) });
  }
});

app.get('/api/projects/:id', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Service unavailable' });
  try {
    const userId = req.query.userId;
    if (!isUuid(req.params.id)) return res.status(400).json({ error: 'ID projet invalide.' });
    const project = await getProject(pool, req.params.id);
    if (!project) return res.status(404).json({ error: 'Projet introuvable.' });
    
    // Security check: If it has an owner, user must match
    if (project.owner_id && project.owner_id !== userId) {
      return res.status(403).json({ error: 'Accès non autorisé au projet.' });
    }

    const files = await listFiles(pool, project.id);
    const deployments = await listDeployments(pool, project.id);
    const secrets = userId ? await getProjectSecrets(pool, project.id) : [];
    
    res.json({ project, files, deployments, secrets });
  } catch (e) {
    res.status(500).json({ error: safeError(e) });
  }
});

app.post('/api/projects/:id/secrets', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Service unavailable' });
  try {
    const { userId, key, value } = req.body || {};
    if (!isUuid(req.params.id)) return res.status(400).json({ error: 'ID projet invalide.' });
    const project = await getProject(pool, req.params.id);
    if (!project || (project.owner_id && project.owner_id !== userId)) {
      return res.status(403).json({ error: 'Action non autorisée.' });
    }
    
    if (value === null) {
      await deleteProjectSecret(pool, project.id, key);
    } else {
      await upsertProjectSecret(pool, project.id, key, value);
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: safeError(e) });
  }
});

app.post('/api/projects/:id/domain', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Service unavailable' });
  try {
    const { userId, domain } = req.body || {};
    if (!isUuid(req.params.id)) return res.status(400).json({ error: 'ID projet invalide.' });
    const project = await getProject(pool, req.params.id);
    if (!project || (project.owner_id && project.owner_id !== userId)) {
      return res.status(403).json({ error: 'Action non autorisée.' });
    }
    
    await updateProjectDomain(pool, project.id, domain);
    res.json({ ok: true });
  } catch (e) {
    // Unique violation constraint
    if (e.code === '23505') {
      return res.status(400).json({ error: 'Ce domaine est déjà utilisé par un autre projet.' });
    }
    res.status(500).json({ error: safeError(e) });
  }
});

app.get('/api/projects/:id/files', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Service unavailable' });
  try {
    if (!isUuid(req.params.id)) return res.status(400).json({ error: 'ID projet invalide.' });
    const project = await getProject(pool, req.params.id);
    if (!project) return res.status(404).json({ error: 'Projet introuvable.' });
    const files = await listFiles(pool, project.id);
    res.json({ files });
  } catch (e) {
    res.status(500).json({ error: safeError(e) });
  }
});

app.put('/api/projects/:id/files', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Service unavailable' });
  try {
    if (!isUuid(req.params.id)) return res.status(400).json({ error: 'ID projet invalide.' });
    const project = await getProject(pool, req.params.id);
    if (!project) return res.status(404).json({ error: 'Projet introuvable.' });
    const { path: fpath, content } = req.body || {};
    if (typeof fpath !== 'string' || typeof content !== 'string') {
      return res.status(400).json({ error: 'path et content requis.' });
    }
    const normalized = normalizeAndValidateProjectPath(fpath);
    if (!normalized) return res.status(400).json({ error: 'path invalide.' });
    if (content.length > 2_000_000) return res.status(413).json({ error: 'content trop volumineux.' });
    await upsertFile(pool, project.id, normalized, content);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: safeError(e) });
  }
});

app.delete('/api/projects/:id/files', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Service unavailable' });
  try {
    if (!isUuid(req.params.id)) return res.status(400).json({ error: 'ID projet invalide.' });
    const project = await getProject(pool, req.params.id);
    if (!project) return res.status(404).json({ error: 'Projet introuvable.' });
    const fpath = req.query.path;
    if (typeof fpath !== 'string') {
      return res.status(400).json({ error: 'query path requis.' });
    }
    const normalized = normalizeAndValidateProjectPath(fpath);
    if (!normalized) return res.status(400).json({ error: 'path invalide.' });
    if (normalized === PREVIEW_ENTRY) {
      return res.status(400).json({ error: 'Impossible de supprimer le fichier d\'aperçu principal.' });
    }
    await deleteFile(pool, project.id, normalized);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: safeError(e) });
  }
});

app.post('/api/projects/:id/deploy', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Service unavailable' });
  try {
    if (!isUuid(req.params.id)) return res.status(400).json({ error: 'ID projet invalide.' });
    const project = await getProject(pool, req.params.id);
    if (!project) return res.status(404).json({ error: 'Projet introuvable.' });
    const rows = await listFiles(pool, project.id);
    if (!rows.length) return res.status(400).json({ error: 'Aucun fichier.' });

    const dep = await createDeployment(pool, project.id);
    const outDir = path.join(sitesDir, dep.slug);
    await mkdir(sitesDir, { recursive: true });

    try {
      const secrets = project.owner_id ? await getProjectSecrets(pool, project.id) : [];
      await buildUserSiteToDir(
        rows.map((r) => ({ path: r.path, content: r.content })),
        outDir,
        secrets
      );
      await updateDeploymentStatus(pool, dep.id, 'live', null);
    } catch (err) {
      console.error('[deploy]', err);
      await updateDeploymentStatus(
        pool,
        dep.id,
        'failed',
        err instanceof Error ? err.message : String(err),
      );
      return res.status(500).json({
        error: safeError(err),
        deploymentId: dep.id,
        slug: dep.slug,
      });
    }

    const url = liveUrl(req, dep.slug);
    res.json({
      ok: true,
      deploymentId: dep.id,
      slug: dep.slug,
      url,
    });
  } catch (e) {
    res.status(500).json({ error: safeError(e) });
  }
});

app.post('/api/projects/:id/export/github', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Service unavailable' });
  try {
    const { userId, githubToken, repoName, isPrivate } = req.body || {};
    if (!isUuid(req.params.id)) return res.status(400).json({ error: 'ID projet invalide.' });
    if (!githubToken || !repoName) return res.status(400).json({ error: 'Token et repoName requis.' });

    const project = await getProject(pool, req.params.id);
    if (!project) return res.status(404).json({ error: 'Projet introuvable.' });
    
    // Security check
    if (project.owner_id && project.owner_id !== userId) {
      return res.status(403).json({ error: 'Action non autorisée.' });
    }

    const rows = await listFiles(pool, project.id);
    if (!rows.length) return res.status(400).json({ error: 'Aucun fichier.' });

    // 1. Get GitHub username
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Huggy-SaaS-Export'
      }
    });
    if (!userRes.ok) throw new Error('Token GitHub invalide ou expiré.');
    const userData = await userRes.json();
    const owner = userData.login;

    // 2. Create repo
    const createRes = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Huggy-SaaS-Export',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: repoName,
        private: !!isPrivate,
        auto_init: true
      })
    });
    
    let repoData;
    if (createRes.ok) {
      repoData = await createRes.json();
    } else {
      const err = await createRes.json();
      if (err.errors?.[0]?.message === 'name already exists on this account') {
        repoData = { name: repoName, html_url: `https://github.com/${owner}/${repoName}` };
      } else {
        throw new Error(`Erreur création dépôt: ${err.message || 'inconnue'}`);
      }
    }

    // Wait a bit for GitHub repo to be fully ready after auto_init
    await new Promise(r => setTimeout(r, 2000));
    
    // 3. Upload files sequentially
    for (const file of rows) {
      const contentBase64 = Buffer.from(file.content).toString('base64');
      
      let sha;
      const getRes = await fetch(`https://api.github.com/repos/${owner}/${repoData.name}/contents/${file.path}`, {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Huggy-SaaS-Export'
        }
      });
      if (getRes.ok) {
        const getJson = await getRes.json();
        sha = getJson.sha;
      }

      await fetch(`https://api.github.com/repos/${owner}/${repoData.name}/contents/${file.path}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'Huggy-SaaS-Export',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Add/update ${file.path} via Huggy`,
          content: contentBase64,
          sha
        })
      });
    }

    res.json({ ok: true, url: repoData.html_url });
  } catch (e) {
    console.error('[export/github]', e);
    res.status(500).json({ error: safeError(e) });
  }
});

/* ——— IA ——— */

app.post('/api/generate-app/stream', rateLimiter, async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const { prompt, chatHistory, currentCode, projectId, files: bodyFiles, userId, userEmail } = req.body || {};
    if (typeof prompt !== 'string') {
      res.write(`data: ${JSON.stringify({ error: 'prompt requis.', type: 'error' })}\n\n`);
      return res.end();
    }

    if (pool && userId) {
      const profile = await getOrCreateProfile(pool, userId, userEmail);
      if (profile.credits < 1 && !profile.is_pro) {
        res.write(`data: ${JSON.stringify({ error: 'Crédits insuffisants. Veuillez recharger votre compte.', type: 'error' })}\n\n`);
        return res.end();
      }
      await deductCredits(pool, userId, 1);
    }

    let allFiles = {};
    if (pool && projectId) {
      if (!isUuid(projectId)) {
        res.write(`data: ${JSON.stringify({ error: 'projectId invalide.', type: 'error' })}\n\n`);
        return res.end();
      }
      const project = await getProject(pool, projectId);
      if (!project) {
        res.write(`data: ${JSON.stringify({ error: 'Projet introuvable.', type: 'error' })}\n\n`);
        return res.end();
      }
      const rows = await listFiles(pool, projectId);
      for (const r of rows) {
        allFiles[r.path] = r.content;
      }
    }
    if (bodyFiles && typeof bodyFiles === 'object') {
      allFiles = { ...allFiles, ...bodyFiles };
    }

    const currentEntryCode =
      typeof currentCode === 'string'
        ? currentCode
        : allFiles[PREVIEW_ENTRY] || DEFAULT_PREVIEW_CODE;

    await runGenerateStream(
      { prompt, chatHistory, currentEntryCode, allFiles },
      (chunk) => res.write(`data: ${JSON.stringify({ chunk, type: 'text' })}\n\n`),
      () => {
        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
        res.end();
      },
      (e) => {
        console.error('[generate-app/stream error]', e);
        res.write(`data: ${JSON.stringify({ error: safeError(e), type: 'error' })}\n\n`);
        res.end();
      }
    );
  } catch (e) {
    console.error('[generate-app/stream]', e);
    res.write(`data: ${JSON.stringify({ error: safeError(e), type: 'error' })}\n\n`);
    res.end();
  }
});

app.post('/api/generate-app', rateLimiter, async (req, res) => {
  try {
    const { prompt, chatHistory, currentCode, projectId, files: bodyFiles, userId, userEmail } = req.body || {};
    if (typeof prompt !== 'string') {
      return res.status(400).json({ error: 'prompt requis.' });
    }

    // Credits logic
    if (pool && userId) {
      const profile = await getOrCreateProfile(pool, userId, userEmail);
      if (profile.credits < 1 && !profile.is_pro) {
        return res.status(402).json({ error: 'Crédits insuffisants. Veuillez recharger votre compte.' });
      }
      await deductCredits(pool, userId, 1);
    }

    let allFiles = {};
    if (pool && projectId) {
      if (!isUuid(projectId)) return res.status(400).json({ error: 'projectId invalide.' });
      const project = await getProject(pool, projectId);
      if (!project) return res.status(404).json({ error: 'Projet introuvable.' });
      const rows = await listFiles(pool, projectId);
      for (const r of rows) {
        allFiles[r.path] = r.content;
      }
    }
    if (bodyFiles && typeof bodyFiles === 'object') {
      allFiles = { ...allFiles, ...bodyFiles };
    }

    const currentEntryCode =
      typeof currentCode === 'string'
        ? currentCode
        : allFiles[PREVIEW_ENTRY] || DEFAULT_PREVIEW_CODE;

    // ─── Agentic Pipeline: PM plans, Coder generates, VR reviews ───
    let refinedPrompt = prompt;
    let agentPlan = null;
    let agentReview = null;
    let agentDatabase = null;

    // Step 1: Product Manager plans the architecture
    try {
      const pipeline = await runAgenticPipeline(prompt, {
        chatHistory,
        currentEntryCode,
        allFiles,
      });
      refinedPrompt = pipeline.refinedPrompt || prompt;
      agentPlan = pipeline.plan;
      agentDatabase = pipeline.database;
    } catch (e) {
      console.warn('[Agent:PM] Fallback to raw prompt:', e.message);
    }

    // Step 2: Coder generates code (using refined prompt from PM)
    const result = await runGenerate({
      prompt: refinedPrompt,
      chatHistory,
      currentEntryCode,
      allFiles,
    });

    // Step 3: Visual Reviewer checks quality
    if (result.files?.length > 0) {
      try {
        agentReview = await runPostGenerationReview(result.files, prompt);
        // If VR rejected and provided corrections, apply them
        if (!agentReview.approved && agentReview.corrections?.length > 0) {
          for (const correction of agentReview.corrections) {
            const idx = result.files.findIndex(f => f.path === correction.path);
            if (idx >= 0) {
              result.files[idx].content = correction.content;
            } else {
              result.files.push(correction);
            }
          }
        }
      } catch (e) {
        console.warn('[Agent:VR] Review skipped:', e.message);
      }
    }

    // Persist files to DB
    if (pool && projectId) {
      if (!isUuid(projectId)) return res.status(400).json({ error: 'projectId invalide.' });
      const project = await getProject(pool, projectId);
      if (!project) return res.status(404).json({ error: 'Projet introuvable.' });
      for (const f of result.files) {
        await upsertFile(pool, projectId, f.path, f.content);
      }
    }

    const entry =
      result.files.find((f) => f.path === PREVIEW_ENTRY)?.content ||
      result.files[0]?.content ||
      '';

    res.json({
      code: entry,
      files: result.files,
      reply: result.reply || '',
      export: result.export || null,
      provider: result.provider,
      // New agentic metadata
      agents: {
        plan: agentPlan ? { summary: agentPlan.summary, complexity: agentPlan.complexity, pages: agentPlan.pages?.length || 0 } : null,
        review: agentReview ? { score: agentReview.score, approved: agentReview.approved, issues: agentReview.issues?.length || 0 } : null,
        database: agentDatabase?.needsDatabase ? { tables: agentPlan?.dataModel?.length || 0, explanation: agentDatabase.explanation } : null,
      },
    });
  } catch (e) {
    console.error('[generate-app]', e);
    res.status(500).json({
      error: safeError(e),
    });
  }
});

app.post('/api/chat/stream', rateLimiter, async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const { prompt } = req.body || {};
    if (typeof prompt !== 'string') {
      res.write(`data: ${JSON.stringify({ error: 'prompt requis.', type: 'error' })}\n\n`);
      return res.end();
    }

    await runChatStream(
      prompt,
      (chunk) => res.write(`data: ${JSON.stringify({ chunk, type: 'text' })}\n\n`),
      () => {
        res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
        res.end();
      },
      (e) => {
        console.error('[chat/stream error]', e);
        res.write(`data: ${JSON.stringify({ error: safeError(e), type: 'error' })}\n\n`);
        res.end();
      }
    );
  } catch (e) {
    console.error('[chat/stream]', e);
    res.write(`data: ${JSON.stringify({ error: safeError(e), type: 'error' })}\n\n`);
    res.end();
  }
});

app.post('/api/chat', rateLimiter, async (req, res) => {
  try {
    const { prompt } = req.body || {};
    if (typeof prompt !== 'string') {
      return res.status(400).json({ error: 'prompt requis.' });
    }
    const text = await runChat(prompt);
    res.json({ text });
  } catch (e) {
    console.error('[chat]', e);
    res.status(500).json({
      error: safeError(e),
    });
  }
});

app.get('/api/me', async (req, res) => {
  const { userId, email } = req.query;
  if (!pool || !userId) return res.status(400).json({ error: 'Paramètres manquants.' });
  try {
    const profile = await getOrCreateProfile(pool, userId, email);
    res.json(profile);
  } catch (e) {
    res.status(500).json({ error: safeError(e) });
  }
});

if (isProd) {
  const distPath = path.join(root, 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    if (req.path.startsWith('/live')) return next();
    res.sendFile(path.join(distPath, 'index.html'), (err) => {
      if (err) next(err);
    });
  });
}

async function main() {
  if (pool) {
    // In production, the DB may not be ready immediately (Railway/containers).
    // Retry instead of crashing the whole server.
    let lastErr = null;
    const maxAttempts = 12;
    const baseDelayMs = 500;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await initSchema(pool);
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
        console.error(
          `[Huggy] initSchema failed (attempt ${attempt}/${maxAttempts}). Retrying...`,
          e instanceof Error ? e.message : e,
        );
        const delay = baseDelayMs * attempt;
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    if (lastErr) {
      console.error(
        '[Huggy] initSchema ultimately failed. Server will still start; DB-dependent endpoints may error.',
        lastErr instanceof Error ? lastErr.message : lastErr,
      );
    }
  }
  app.listen(PORT, () => {
    console.log(
      `[Huggy] ${isProd ? 'production' : 'dev'} → http://127.0.0.1:${PORT}`,
    );
    console.log(`[Huggy] previews → ${sitesDir}`);
    if (!pool) {
      console.warn(
        '[Huggy] DATABASE_URL absent — projets / déploiements désactivés.',
      );
    }
    if (!process.env.ANTHROPIC_API_KEY && !process.env.GEMINI_API_KEY) {
      console.warn('[Huggy] Aucune clé ANTHROPIC_API_KEY / GEMINI_API_KEY.');
    }
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
