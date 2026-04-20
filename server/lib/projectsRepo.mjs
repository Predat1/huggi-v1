import { randomSlug } from './slug.mjs';

export const PREVIEW_ENTRY = 'src/App.tsx';

/** @param {import('pg').Pool} pool */
export async function createProject(pool, name = 'Sans titre', ownerId = null) {
  const slug = randomSlug(12);
  const r = await pool.query(
    `INSERT INTO projects (name, slug, owner_id) VALUES ($1, $2, $3) RETURNING id, name, slug, owner_id, created_at`,
    [name, slug, ownerId],
  );
  return r.rows[0];
}

/** @param {import('pg').Pool} pool */
export async function getProject(pool, id) {
  const r = await pool.query(
    `SELECT id, name, slug, owner_id, custom_domain, created_at FROM projects WHERE id = $1`,
    [id],
  );
  return r.rows[0] || null;
}

export async function getProjectByDomain(pool, domain) {
  const r = await pool.query(
    `SELECT id, name, slug, owner_id, custom_domain, created_at FROM projects WHERE custom_domain = $1`,
    [domain],
  );
  return r.rows[0] || null;
}

export async function updateProjectDomain(pool, id, customDomain) {
  await pool.query(
    `UPDATE projects SET custom_domain = $2 WHERE id = $1`,
    [id, customDomain],
  );
}

/** @param {import('pg').Pool} pool */
export async function getProjectBySlug(pool, slug) {
  const r = await pool.query(
    `SELECT id, name, slug, owner_id, created_at FROM projects WHERE slug = $1`,
    [slug],
  );
  return r.rows[0] || null;
}

/** @param {import('pg').Pool} pool */
export async function getUserActiveProjectsCount(pool, ownerId) {
  if (!ownerId) return 0;
  const r = await pool.query(
    `SELECT COUNT(*) as count FROM projects WHERE owner_id = $1`,
    [ownerId],
  );
  return parseInt(r.rows[0].count, 10) || 0;
}

export async function listProjects(pool, ownerId) {
  if (!ownerId) return [];
  const r = await pool.query(
    `SELECT id, name, slug, custom_domain, created_at, updated_at FROM projects WHERE owner_id = $1 ORDER BY updated_at DESC, created_at DESC`,
    [ownerId]
  );
  return r.rows;
}

export async function listGalleryProjects(pool, limit = 12) {
  const r = await pool.query(
    `SELECT p.id, p.name, p.slug, p.custom_domain, p.created_at, pr.email as author 
     FROM projects p 
     LEFT JOIN profiles pr ON p.owner_id = pr.id 
     WHERE p.custom_domain IS NOT NULL OR EXISTS (SELECT 1 FROM deployments d WHERE d.project_id = p.id AND d.status = 'live')
     ORDER BY p.updated_at DESC LIMIT $1`,
    [limit]
  );
  return r.rows;
}

export async function deleteProject(pool, projectId, ownerId) {
  await pool.query(
    `DELETE FROM projects WHERE id = $1 AND owner_id = $2`,
    [projectId, ownerId]
  );
}

/** @param {import('pg').Pool} pool */
export async function listFiles(pool, projectId) {
  const r = await pool.query(
    `SELECT path, content, updated_at FROM project_files WHERE project_id = $1 ORDER BY path ASC`,
    [projectId],
  );
  return r.rows;
}

export async function getProjectSecrets(pool, projectId) {
  const r = await pool.query(
    `SELECT key, value FROM project_secrets WHERE project_id = $1`,
    [projectId],
  );
  return r.rows;
}

export async function upsertProjectSecret(pool, projectId, key, value) {
  await pool.query(
    `INSERT INTO project_secrets (project_id, key, value) VALUES ($1, $2, $3)
     ON CONFLICT (project_id, key) DO UPDATE SET value = $3`,
    [projectId, key, value],
  );
}

export async function deleteProjectSecret(pool, projectId, key) {
  await pool.query(
    `DELETE FROM project_secrets WHERE project_id = $1 AND key = $2`,
    [projectId, key],
  );
}

/** @param {import('pg').Pool} pool */
export async function upsertFile(pool, projectId, filePath, content) {
  await pool.query(
    `INSERT INTO project_files (project_id, path, content, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (project_id, path) DO UPDATE SET content = $3, updated_at = now()`,
    [projectId, filePath, content],
  );
}

/** @param {import('pg').Pool} pool */
export async function deleteFile(pool, projectId, filePath) {
  await pool.query(
    `DELETE FROM project_files WHERE project_id = $1 AND path = $2`,
    [projectId, filePath],
  );
}

/** @param {import('pg').Pool} pool */
export async function seedDefaultFiles(pool, projectId, defaultAppCode) {
  await upsertFile(pool, projectId, PREVIEW_ENTRY, defaultAppCode);
  await upsertFile(
    pool,
    projectId,
    'README.md',
    '# Projet Huggy\n\nFichier d\'aperçu : `src/App.tsx`.\n',
  );
}

/** @param {import('pg').Pool} pool */
export async function createDeployment(pool, projectId) {
  const slug = randomSlug(10);
  const r = await pool.query(
    `INSERT INTO deployments (project_id, slug, status) VALUES ($1, $2, 'pending') RETURNING id, slug, status, created_at`,
    [projectId, slug],
  );
  return r.rows[0];
}

/** @param {import('pg').Pool} pool */
export async function updateDeploymentStatus(pool, id, status, error = null) {
  const builtAt = status === 'live' ? new Date() : null;
  await pool.query(
    `UPDATE deployments SET status = $2, error = $3, built_at = COALESCE($4::timestamptz, built_at) WHERE id = $1`,
    [id, status, error, builtAt],
  );
}

/** @param {import('pg').Pool} pool */
export async function listDeployments(pool, projectId, limit = 20) {
  const r = await pool.query(
    `SELECT id, slug, status, error, created_at, built_at FROM deployments WHERE project_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [projectId, limit],
  );
  return r.rows;
}

/** @param {import('pg').Pool} pool */
export async function getOrCreateProfile(pool, userId, email = null) {
  const r = await pool.query(
    `SELECT id, email, stripe_customer_id, credits, tier, is_pro FROM profiles WHERE id = $1`,
    [userId],
  );
  if (r.rows[0]) return r.rows[0];

  const rNew = await pool.query(
    `INSERT INTO profiles (id, email, credits, tier) VALUES ($1, $2, 50, 'free') 
     RETURNING id, email, stripe_customer_id, credits, tier, is_pro`,
    [userId, email],
  );
  return rNew.rows[0];
}

/** @param {import('pg').Pool} pool */
export async function deductCredits(pool, userId, amount = 1) {
  const r = await pool.query(
    `UPDATE profiles SET credits = credits - $2 WHERE id = $1 AND credits >= $2 RETURNING credits`,
    [userId, amount],
  );
  return r.rows[0] ? r.rows[0].credits : null;
}
