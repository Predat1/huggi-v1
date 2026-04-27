/**
 * Huggy API + fichiers statiques (prod).
 */
import dotenv from 'dotenv';
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { mkdir } from 'fs/promises';
import { createPool, initSchema } from './lib/db.mjs';
import { createRateLimiter } from './lib/rateLimiter.mjs';
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
  listProjects,
  listGalleryProjects,
  deleteProject,
  getProjectByDomain,
  getProjectSecrets,
  upsertProjectSecret,
  deleteProjectSecret,
  updateProjectDomain,
  createProjectVersion,
  listProjectVersions,
  restoreProjectVersion,
  updateDeploymentContent,
  getDeploymentBySlug,
  updateProject,
} from './lib/projectsRepo.mjs';
import { DEFAULT_PREVIEW_CODE } from './lib/defaultAppCode.mjs';
import { buildUserSiteToDir } from './lib/deploy.mjs';
import { getCreditCost, formatCost } from './lib/creditCost.mjs';
import { storeSite, fetchSite } from './lib/siteStorage.mjs';
import { canGenerate, canCreateProject, showViralBadge, resolvePlan } from './lib/planLimits.mjs';
import { generateSchema } from './lib/schemaGen.mjs';

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

/* ——— Rate Limiter (Redis-backed with in-memory fallback) ——— */
const rateLimiter = createRateLimiter(60_000, 30);

// Local map for subdomain proxy traffic limiting (separate from API rate limiting)
const _rlMap = new Map();
setInterval(() => {
  const cutoff = Date.now() - 120_000;
  for (const [key, entry] of _rlMap) {
    if (entry.start < cutoff) _rlMap.delete(key);
  }
}, 120_000);

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

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

// Real-time collaboration rooms: projectId → Set<WebSocket>
const rooms = new Map();

wss.on('connection', async (ws, req) => {
  const url = new URL(req.url, 'http://localhost');
  const projectId = url.searchParams.get('projectId');
  const userId    = url.searchParams.get('userId') || 'anonymous';

  if (!projectId || !isUuid(projectId)) { ws.close(1008, 'projectId invalide'); return; }

  // Auth: verify userId exists in profiles (no Supabase admin key needed)
  if (pool && isUuid(userId)) {
    try {
      const { rows } = await pool.query('SELECT id FROM profiles WHERE id = $1', [userId]);
      if (!rows.length) { ws.close(1008, 'Utilisateur non authentifié'); return; }
    } catch { /* DB unreachable — allow in dev mode */ }
  }

  if (!rooms.has(projectId)) rooms.set(projectId, new Set());
  rooms.get(projectId).add(ws);
  const roomSize = rooms.get(projectId).size;
  console.log(`[WS] ${userId} joined project ${projectId} (${roomSize} online)`);

  // Notify room of new peer
  const room = rooms.get(projectId);
  for (const peer of room) {
    if (peer !== ws && peer.readyState === 1) {
      peer.send(JSON.stringify({ type: 'peer_joined', userId, online: roomSize }));
    }
  }
  ws.send(JSON.stringify({ type: 'connected', online: roomSize }));

  ws.on('message', (data) => {
    let msg;
    try { msg = JSON.parse(data.toString()); } catch { return; }
    const currentRoom = rooms.get(projectId);
    if (!currentRoom) return;
    for (const peer of currentRoom) {
      if (peer !== ws && peer.readyState === 1) {
        peer.send(JSON.stringify({ ...msg, _from: userId }));
      }
    }
  });

  ws.on('close', () => {
    const currentRoom = rooms.get(projectId);
    if (currentRoom) {
      currentRoom.delete(ws);
      if (currentRoom.size === 0) {
        rooms.delete(projectId);
      } else {
        for (const peer of currentRoom) {
          if (peer.readyState === 1) {
            peer.send(JSON.stringify({ type: 'peer_left', userId, online: currentRoom.size }));
          }
        }
      }
    }
  });
});
 
 /** Broadcast a message to all connected clients in a project room */
 function broadcastToProject(projectId, msg, excludeWs = null) {
   const room = rooms.get(projectId);
   if (!room) return;
   const data = JSON.stringify(msg);
   for (const peer of room) {
     if (peer !== excludeWs && peer.readyState === 1) {
       peer.send(data);
     }
   }
 }
 
app.post('/api/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    if (!stripe) throw new Error('No Stripe Key Configured');
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  // ── Subscription created / activated ──
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata?.userId;
    const plan   = session.metadata?.plan || 'pro';
    if (userId && pool) {
      const creditsMap = { hobby: 1000, pro: 3000, scale: 10000 };
      const creditsToAdd = creditsMap[plan] || 3000;
      try {
        await pool.query(
          `UPDATE profiles SET tier = $2, is_pro = true, credits = credits + $3,
           stripe_customer_id = COALESCE(stripe_customer_id, $4)
           WHERE id = $1`,
          [userId, plan, creditsToAdd, session.customer],
        );
        console.log(`[Stripe] Checkout completed: user=${userId} plan=${plan}`);
      } catch (e) { console.error('[Stripe] checkout.session.completed', e); }
    }
  }

  // ── Subscription renewed ──
  if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object;
    const subId = invoice.subscription;
    if (subId && pool) {
      try {
        // Refresh credits every billing cycle
        const sub = await stripe.subscriptions.retrieve(subId);
        const plan = sub.metadata?.plan || 'pro';
        const creditsMap = { hobby: 1000, pro: 3000, scale: 10000 };
        await pool.query(
          `UPDATE profiles SET credits = credits + $2, subscription_status = 'active',
           current_period_end = to_timestamp($3)
           WHERE subscription_id = $1`,
          [subId, creditsMap[plan] || 3000, sub.current_period_end],
        );
        console.log(`[Stripe] Invoice paid: sub=${subId}`);
      } catch (e) { console.error('[Stripe] invoice.payment_succeeded', e); }
    }
  }

  // ── Subscription cancelled / expired ──
  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object;
    if (pool) {
      try {
        await pool.query(
          `UPDATE profiles SET tier = 'free', is_pro = false, subscription_status = 'cancelled',
           current_period_end = NULL WHERE subscription_id = $1`,
          [sub.id],
        );
        console.log(`[Stripe] Subscription cancelled: sub=${sub.id}`);
      } catch (e) { console.error('[Stripe] customer.subscription.deleted', e); }
    }
  }

  res.send();
});

app.post('/api/checkout', express.json(), async (req, res) => {
  if (!stripe) return res.status(500).json({ error: 'Stripe API non configurée.' });
  try {
    const { plan = 'pro', userId } = req.body || {};

    // Subscription price IDs — set these in env after creating plans in Stripe Dashboard.
    // Falls back to inline price_data for development / first-time setup.
    const priceIds = {
      hobby: process.env.STRIPE_PRICE_HOBBY,
      pro:   process.env.STRIPE_PRICE_PRO,
      scale: process.env.STRIPE_PRICE_SCALE,
    };
    const planMeta = {
      hobby: { unit_amount: 1900, name: 'Huggy Hobby' },
      pro:   { unit_amount: 4900, name: 'Huggy Pro' },
      scale: { unit_amount: 14900, name: 'Huggy Scale' },
    };
    const selected = planMeta[plan] || planMeta.pro;
    const priceId  = priceIds[plan];

    const lineItem = priceId
      ? { price: priceId, quantity: 1 }
      : { price_data: { currency: 'eur', product_data: { name: selected.name }, unit_amount: selected.unit_amount, recurring: { interval: 'month' } }, quantity: 1 };

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [lineItem],
      mode: 'subscription',
      metadata: { plan, userId: userId || '' },
      subscription_data: { metadata: { plan, userId: userId || '' } },
      success_url: `${publicBaseUrl(req)}/?plan=${plan}&status=success`,
      cancel_url:  `${publicBaseUrl(req)}/?status=cancel`,
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

/** Chemins /live/:slug/* — filesystem cache first, DB fallback (survives Railway redeploys) */
app.use('/live/:slug', async (req, res, next) => {
  const { slug } = req.params;
  if (!/^[\w-]+$/.test(slug)) return res.status(400).send('Slug invalide.');

  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  let entry = _rlMap.get(`proxy-${slug}-${ip}`);
  if (!entry || Date.now() - entry.start > 60000) entry = { start: Date.now(), count: 0 };
  entry.count++;
  _rlMap.set(`proxy-${slug}-${ip}`, entry);
  if (entry.count > 200) {
    return res.status(429).send('Hébergement saturé. Passez au plan Scale.');
  }

  const reqPath = req.path === '/' || req.path === '' ? '/index.html' : req.path;
  const dir = path.join(sitesDir, slug);

  // 1. Filesystem cache hit
  if (fs.existsSync(dir)) {
    return express.static(dir, { index: 'index.html' })(req, res, () => {
      if (!res.writableEnded) res.status(404).send('Fichier introuvable.');
    });
  }

  // 2. Storage/DB fallback — fetch from Supabase Storage or compressed DB
  if (pool) {
    try {
      const dep = await getDeploymentBySlug(pool, slug);
      const site = await fetchSite(slug, dep);
      if (site) {
        // Warm filesystem cache for next requests
        try {
          await mkdir(dir, { recursive: true });
          await fs.promises.writeFile(path.join(dir, 'index.html'), site.html, 'utf8');
          await fs.promises.writeFile(path.join(dir, 'bundle.js'), site.bundle, 'utf8');
        } catch {}

        if (reqPath === '/bundle.js') {
          res.setHeader('Content-Type', 'application/javascript');
          return res.send(site.bundle);
        }
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(site.html);
      }
    } catch (e) {
      console.error('[live-storage-fallback]', e);
    }
  }

  res.status(404).send('Preview introuvable ou build en cours.');
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
      const check = canCreateProject(profile, activeCount);
      if (!check.allowed) return res.status(402).json({ error: check.reason, upgrade: true });
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

app.get('/api/projects', rateLimiter, async (req, res) => {
  try {
    const { userId } = req.query;
    if (!pool) return res.json({ projects: [] });
    if (!userId) return res.status(400).json({ error: 'userId requis.' });
    const projects = await listProjects(pool, userId);
    res.json({ projects });
  } catch (e) {
    console.error('[GET /api/projects]', e);
    res.status(500).json({ error: safeError(e) });
  }
});

app.delete('/api/projects/:id', rateLimiter, async (req, res) => {
  try {
    const { userId } = req.body;
    const projectId = req.params.id;
    if (!pool) return res.status(503).json({ error: 'DB unavailable' });
    if (!userId || !projectId) return res.status(400).json({ error: 'userId and projectId requis.' });
    await deleteProject(pool, projectId, userId);
    res.json({ success: true });
  } catch (e) {
    console.error('[DELETE /api/projects]', e);
    res.status(500).json({ error: safeError(e) });
  }
});

app.get('/api/gallery', rateLimiter, async (req, res) => {
  try {
    if (!pool) return res.json({ projects: [] });
    const projects = await listGalleryProjects(pool, 24);
    res.json({ projects });
  } catch (e) {
    console.error('[GET /api/gallery]', e);
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

app.patch('/api/projects/:id', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Service unavailable' });
  try {
    const { userId, name, description } = req.body || {};
    if (!isUuid(req.params.id)) return res.status(400).json({ error: 'ID projet invalide.' });
    const project = await getProject(pool, req.params.id);
    if (!project) return res.status(404).json({ error: 'Projet introuvable.' });
    if (project.owner_id && project.owner_id !== userId) {
      return res.status(403).json({ error: 'Action non autorisée.' });
    }
    await updateProject(pool, req.params.id, { name, description });
    res.json({ ok: true });
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

/* ——— Version History ——— */

app.get('/api/projects/:id/versions', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Service unavailable' });
  try {
    if (!isUuid(req.params.id)) return res.status(400).json({ error: 'ID projet invalide.' });
    const project = await getProject(pool, req.params.id);
    if (!project) return res.status(404).json({ error: 'Projet introuvable.' });
    const versions = await listProjectVersions(pool, project.id);
    res.json({ versions });
  } catch (e) {
    res.status(500).json({ error: safeError(e) });
  }
});

app.post('/api/projects/:id/versions', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Service unavailable' });
  try {
    if (!isUuid(req.params.id)) return res.status(400).json({ error: 'ID projet invalide.' });
    const project = await getProject(pool, req.params.id);
    if (!project) return res.status(404).json({ error: 'Projet introuvable.' });
    const label = typeof req.body?.label === 'string' ? req.body.label : 'Snapshot manuel';
    const version = await createProjectVersion(pool, project.id, label);
    res.json({ version });
  } catch (e) {
    res.status(500).json({ error: safeError(e) });
  }
});

app.post('/api/projects/:id/versions/:vId/restore', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Service unavailable' });
  try {
    const { userId } = req.body || {};
    if (!isUuid(req.params.id)) return res.status(400).json({ error: 'ID projet invalide.' });
    if (!isUuid(req.params.vId)) return res.status(400).json({ error: 'versionId invalide.' });
    const project = await getProject(pool, req.params.id);
    if (!project) return res.status(404).json({ error: 'Projet introuvable.' });
    if (project.owner_id && project.owner_id !== userId) return res.status(403).json({ error: 'Action non autorisée.' });
    const files = await restoreProjectVersion(pool, project.id, req.params.vId);
    res.json({ ok: true, files });
  } catch (e) {
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

    // Snapshot before deploy
    try { await createProjectVersion(pool, project.id, `Avant déploiement — ${new Date().toLocaleString('fr-FR')}`); } catch {}

    const dep = await createDeployment(pool, project.id);
    const outDir = path.join(sitesDir, dep.slug);

    try {
      const secrets = project.owner_id ? await getProjectSecrets(pool, project.id) : [];
      let badge = true;
      if (pool && project.owner_id) {
        try {
          const ownerProfile = await getOrCreateProfile(pool, project.owner_id);
          badge = showViralBadge(ownerProfile);
        } catch {}
      }
      const { html, bundle, sitemap } = await buildUserSiteToDir(
        rows.map((r) => ({ path: r.path, content: r.content })),
        outDir,
        secrets,
        badge
      );
      // Store in Supabase Storage (if configured) or compressed DB — survives Railway redeploys
      const stored = await storeSite(dep.slug, html, bundle);
      await updateDeploymentContent(pool, dep.id, stored);
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

/** Apply AI-generated SQL schema to the project's database via the existing pool connection. */
app.post('/api/projects/:id/apply-schema', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Service unavailable' });
  try {
    if (!isUuid(req.params.id)) return res.status(400).json({ error: 'ID invalide.' });
    const { sql, userId } = req.body || {};
    if (!sql || typeof sql !== 'string') return res.status(400).json({ error: 'sql requis.' });

    const project = await getProject(pool, req.params.id);
    if (!project) return res.status(404).json({ error: 'Projet introuvable.' });
    if (project.owner_id && project.owner_id !== userId) {
      return res.status(403).json({ error: 'Non autorisé.' });
    }

    // Execute the SQL — pool already points at the project DB (Supabase / PostgreSQL)
    await pool.query(sql);

    // Persist the applied schema as a project file for reference
    await upsertFile(pool, project.id, '.huggy/schema.sql', sql);

    res.json({ ok: true, message: 'Schéma appliqué avec succès.' });
  } catch (e) {
    console.error('[apply-schema]', e);
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

/**
 * Agentic streaming endpoint — emits SSE events for each agent step.
 * Events: agent_start, agent_done, chunk, done, error
 */
app.post('/api/generate-app/agentic-stream', rateLimiter, async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const emit = (type, data = {}) => {
    const payload = { type, ...data };
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
    
    // Broadcast to collaboration room if project exists
    if (projectId) {
      broadcastToProject(projectId, { type: 'stream_event', event: payload });
    }
  };

  try {
    const { prompt, chatHistory, currentCode, projectId, files: bodyFiles, userId, userEmail } = req.body || {};
    if (typeof prompt !== 'string') { emit('error', { message: 'prompt requis.' }); return res.end(); }

    // ── Load profile + enforce plan limits ──
    let profile = null;
    if (pool && userId) {
      profile = await getOrCreateProfile(pool, userId, userEmail);

      // Reset monthly counter if new month
      const resetAt = profile.monthly_reset_at ? new Date(profile.monthly_reset_at) : new Date(0);
      const nowMonth = new Date(); nowMonth.setDate(1); nowMonth.setHours(0,0,0,0);
      if (resetAt < nowMonth) {
        await pool.query(`UPDATE profiles SET monthly_generations = 0, monthly_reset_at = date_trunc('month', now()) WHERE id = $1`, [userId]);
        profile.monthly_generations = 0;
      }

      const genCheck = canGenerate(profile, profile.monthly_generations || 0);
      if (!genCheck.allowed) {
        emit('error', { message: genCheck.reason, upgrade: true });
        return res.end();
      }
    }

    // ── Load project files ──
    let allFiles = {};
    if (pool && projectId) {
      if (!isUuid(projectId)) { emit('error', { message: 'projectId invalide.' }); return res.end(); }
      const project = await getProject(pool, projectId);
      if (!project) { emit('error', { message: 'Projet introuvable.' }); return res.end(); }
      const rows = await listFiles(pool, projectId);
      for (const r of rows) allFiles[r.path] = r.content;
    }
    if (bodyFiles && typeof bodyFiles === 'object') allFiles = { ...allFiles, ...bodyFiles };
    const currentEntryCode = typeof currentCode === 'string' ? currentCode : allFiles[PREVIEW_ENTRY] || DEFAULT_PREVIEW_CODE;

    // ── Auto-snapshot before AI generation ──
    if (pool && projectId) {
      try { await createProjectVersion(pool, projectId, `Avant IA — ${new Date().toLocaleString('fr-FR')}`); } catch {}
    }

    // ── Agent 1: Product Manager ──
    emit('agent_start', { agent: 'pm', label: 'Product Manager — analyse de votre requête...' });
    let refinedPrompt = prompt;
    let agentPlan = null;
    let agentDatabase = null;
    try {
      const pipeline = await runAgenticPipeline(prompt, { chatHistory, currentEntryCode, allFiles });
      refinedPrompt = pipeline.refinedPrompt || prompt;
      agentPlan = pipeline.plan;
      agentDatabase = pipeline.database;
      emit('agent_done', { agent: 'pm', label: 'Product Manager — plan d\'architecture prêt ✓', data: { complexity: agentPlan?.complexity, pages: agentPlan?.pages?.length || 0 } });
    } catch (e) {
      emit('agent_done', { agent: 'pm', label: 'Product Manager — fallback au prompt direct', warning: true });
    }

    // ── Schema suggestion (if PM agent detected a data model) ──
    if (agentPlan?.dataModel?.length > 0) {
      const { sql, tables } = generateSchema(agentPlan.dataModel);
      if (sql) emit('schema_suggestion', { sql, tables });
    }

    // ── Credit cost (computed after PM agent knows complexity) ──
    const creditCost = getCreditCost(agentPlan?.complexity);
    emit('credit_info', { cost: creditCost, label: formatCost(creditCost) });
    if (pool && userId && profile && !profile.is_pro && profile.credits < creditCost) {
      emit('error', { message: `Crédits insuffisants — ${formatCost(creditCost)} requis, ${Number(profile.credits).toFixed(1)} disponibles.` });
      return res.end();
    }

    // ── Agent 2: Coder (streaming, Sonnet) ──
    emit('agent_start', { agent: 'coder', label: 'Coder — génération du code premium...' });
    let fullCodeText = '';
    await new Promise((resolve, reject) => {
      runGenerateStream(
        { prompt: refinedPrompt, chatHistory, currentEntryCode, allFiles, complexity: agentPlan?.complexity },
        (chunk) => { fullCodeText += chunk; emit('chunk', { content: chunk }); },
        () => resolve(),
        (err) => reject(err),
      );
    });
    emit('agent_done', { agent: 'coder', label: 'Coder — code généré ✓' });

    // ── Parse files from streamed output ──
    let parsedFiles = [];
    let replyText = '';
    try {
      const jsonStart = fullCodeText.indexOf('{');
      const jsonEnd = fullCodeText.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        const parsed = JSON.parse(fullCodeText.slice(jsonStart, jsonEnd + 1));
        parsedFiles = Array.isArray(parsed.files) ? parsed.files : [];
        replyText = parsed.reply || parsed.message || '';
        if (!parsedFiles.length && parsed.code) {
          parsedFiles = [{ path: PREVIEW_ENTRY, content: parsed.code }];
        }
      }
    } catch {
      if (fullCodeText.trim()) {
        parsedFiles = [{ path: PREVIEW_ENTRY, content: fullCodeText.trim() }];
      }
    }

    // ── Visual review removed — replaced by client-side ESLint (zero latency, zero cost) ──

    // ── Persist to DB ──
    if (pool && projectId && parsedFiles.length > 0) {
      try {
        for (const f of parsedFiles) await upsertFile(pool, projectId, f.path, f.content);
      } catch (e) { console.warn('[agentic-stream] DB persist failed:', e.message); }
    }

    // ── Deduct credits + increment monthly counter + log analytics ──
    let creditsRemaining = null;
    if (pool && userId && profile) {
      try {
        creditsRemaining = await deductCredits(pool, userId, creditCost);
        await pool.query(
          `UPDATE profiles SET monthly_generations = COALESCE(monthly_generations,0) + 1 WHERE id = $1`,
          [userId]
        );
        await pool.query(
          `INSERT INTO generation_logs (user_id, project_id, complexity, credits_used) VALUES ($1,$2,$3,$4)`,
          [userId, projectId || null, agentPlan?.complexity || 'medium', creditCost]
        );
      } catch {}
    }

    const entry = parsedFiles.find(f => f.path === PREVIEW_ENTRY)?.content || parsedFiles[0]?.content || '';
    emit('done', {
      files: parsedFiles,
      code: entry,
      reply: replyText,
      creditsUsed: creditCost,
      creditsRemaining,
      agents: {
        plan: agentPlan ? { summary: agentPlan.summary, complexity: agentPlan.complexity } : null,
        database: agentDatabase?.needsDatabase ? { explanation: agentDatabase.explanation } : null,
      },
    });
    res.end();
  } catch (e) {
    console.error('[agentic-stream]', e);
    emit('error', { message: safeError(e) });
    res.end();
  }
});

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

    // Load profile — credit check uses prompt-length estimate (no PM agent in this simpler endpoint)
    let streamProfile = null;
    const streamCreditCost = getCreditCost(prompt.length < 80 ? 'simple' : prompt.length < 300 ? 'medium' : 'complex');
    if (pool && userId) {
      streamProfile = await getOrCreateProfile(pool, userId, userEmail);
      if (!streamProfile.is_pro && streamProfile.credits < streamCreditCost) {
        res.write(`data: ${JSON.stringify({ error: `Crédits insuffisants — ${formatCost(streamCreditCost)} requis, ${Number(streamProfile.credits).toFixed(1)} disponibles.`, type: 'error' })}\n\n`);
        return res.end();
      }
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
      async () => {
        let streamRemaining = null;
        if (pool && userId && streamProfile) {
          try { streamRemaining = await deductCredits(pool, userId, streamCreditCost); } catch {}
        }
        res.write(`data: ${JSON.stringify({ type: 'done', creditsUsed: streamCreditCost, creditsRemaining: streamRemaining })}\n\n`);
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

    // Credits check — deduct only on success (at end of handler)
    let syncProfile = null;
    if (pool && userId) {
      syncProfile = await getOrCreateProfile(pool, userId, userEmail);
      if (syncProfile.credits < 1 && !syncProfile.is_pro) {
        return res.status(402).json({ error: 'Crédits insuffisants. Veuillez recharger votre compte.' });
      }
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

    // Deduct credit only on success
    if (pool && userId && syncProfile) {
      try { await deductCredits(pool, userId, 1); } catch {}
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
  httpServer.listen(PORT, () => {
    console.log(
      `[Huggy] ${isProd ? 'production' : 'dev'} → http://127.0.0.1:${PORT}`,
    );
    console.log(`[Huggy] previews → ${sitesDir}`);
    console.log(`[Huggy] WebSocket collaboration → ws://127.0.0.1:${PORT}`);
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
