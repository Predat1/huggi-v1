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
import { runChat, runGenerate } from './lib/aiGenerate.mjs';
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
} from './lib/projectsRepo.mjs';
import { DEFAULT_PREVIEW_CODE } from './lib/defaultAppCode.mjs';
import { buildUserSiteToDir } from './lib/deploy.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

dotenv.config({ path: path.join(root, '.env') });
// Important for production: never overwrite environment variables injected by the host/platform.
// Local `.env.local` should still apply when env vars are not already set.
dotenv.config({ path: path.join(root, '.env.local') });

const isProd = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT || (isProd ? 8080 : 3001));
const sitesDir = process.env.SITES_DIR || path.join(root, 'data', 'sites');
const previewRootDomain = process.env.PREVIEW_ROOT_DOMAIN || '';

const pool = createPool();

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

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '5mb' }));

/** Sous-domaines : {slug}.{PREVIEW_ROOT_DOMAIN} → fichiers statiques */
if (previewRootDomain) {
  app.use((req, res, next) => {
    const host = (req.get('host') || '').split(':')[0];
    if (!host.endsWith(previewRootDomain)) return next();
    const slug = host.slice(0, -(previewRootDomain.length + 1));
    if (!slug || slug.includes('.')) return next();
    const dir = path.join(sitesDir, slug);
    if (!fs.existsSync(dir)) return next();
    express.static(dir, { index: 'index.html' })(req, res, next);
  });
}

/** Chemins /live/:slug/* (MVP Railway sans wildcard DNS) */
app.use('/live/:slug', (req, res, next) => {
  const { slug } = req.params;
  if (!/^[\w-]+$/.test(slug)) return res.status(400).send('Slug invalide.');
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
  res.json({
    ok: true,
    env: isProd ? 'production' : 'development',
    database: pool ? (dbOk ? 'connected' : 'error') : 'disabled',
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    gemini: Boolean(process.env.GEMINI_API_KEY),
  });
});

/* ——— Projets (sans auth : connaître l’UUID = accès) ——— */

app.post('/api/projects', async (req, res) => {
  if (!pool) {
    return res.status(503).json({ error: 'DATABASE_URL non configuré.' });
  }
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name : 'Sans titre';
    const project = await createProject(pool, name);
    await seedDefaultFiles(pool, project.id, DEFAULT_PREVIEW_CODE);
    const files = await listFiles(pool, project.id);
    res.status(201).json({ project, files });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur' });
  }
});

app.get('/api/projects/:id', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Pas de base.' });
  try {
    const project = await getProject(pool, req.params.id);
    if (!project) return res.status(404).json({ error: 'Projet introuvable.' });
    const files = await listFiles(pool, project.id);
    const deployments = await listDeployments(pool, project.id);
    res.json({ project, files, deployments });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur' });
  }
});

app.get('/api/projects/:id/files', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Pas de base.' });
  try {
    const project = await getProject(pool, req.params.id);
    if (!project) return res.status(404).json({ error: 'Projet introuvable.' });
    const files = await listFiles(pool, project.id);
    res.json({ files });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur' });
  }
});

app.put('/api/projects/:id/files', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Pas de base.' });
  try {
    const project = await getProject(pool, req.params.id);
    if (!project) return res.status(404).json({ error: 'Projet introuvable.' });
    const { path: fpath, content } = req.body || {};
    if (typeof fpath !== 'string' || typeof content !== 'string') {
      return res.status(400).json({ error: 'path et content requis.' });
    }
    const normalized = fpath.replace(/\\/g, '/');
    await upsertFile(pool, project.id, normalized, content);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur' });
  }
});

app.delete('/api/projects/:id/files', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Pas de base.' });
  try {
    const project = await getProject(pool, req.params.id);
    if (!project) return res.status(404).json({ error: 'Projet introuvable.' });
    const fpath = req.query.path;
    if (typeof fpath !== 'string') {
      return res.status(400).json({ error: 'query path requis.' });
    }
    if (fpath.replace(/\\/g, '/') === PREVIEW_ENTRY) {
      return res.status(400).json({ error: 'Impossible de supprimer le fichier d\'aperçu principal.' });
    }
    await deleteFile(pool, project.id, fpath.replace(/\\/g, '/'));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur' });
  }
});

app.post('/api/projects/:id/deploy', async (req, res) => {
  if (!pool) return res.status(503).json({ error: 'Pas de base.' });
  try {
    const project = await getProject(pool, req.params.id);
    if (!project) return res.status(404).json({ error: 'Projet introuvable.' });
    const rows = await listFiles(pool, project.id);
    if (!rows.length) return res.status(400).json({ error: 'Aucun fichier.' });

    const dep = await createDeployment(pool, project.id);
    const outDir = path.join(sitesDir, dep.slug);
    await mkdir(sitesDir, { recursive: true });

    try {
      await buildUserSiteToDir(
        rows.map((r) => ({ path: r.path, content: r.content })),
        outDir,
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
        error: err instanceof Error ? err.message : 'Build échoué',
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
    res.status(500).json({ error: e instanceof Error ? e.message : 'Erreur' });
  }
});

/* ——— IA ——— */

app.post('/api/generate-app', async (req, res) => {
  try {
    const { prompt, currentCode, projectId, files: bodyFiles } = req.body || {};
    if (typeof prompt !== 'string') {
      return res.status(400).json({ error: 'prompt requis.' });
    }

    let allFiles = {};
    if (pool && projectId) {
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

    const result = await runGenerate({
      prompt,
      currentEntryCode,
      allFiles,
    });

    if (pool && projectId) {
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
      provider: result.provider,
    });
  } catch (e) {
    console.error('[generate-app]', e);
    res.status(500).json({
      error: e instanceof Error ? e.message : 'Erreur génération',
    });
  }
});

app.post('/api/chat', async (req, res) => {
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
      error: e instanceof Error ? e.message : 'Erreur chat',
    });
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
