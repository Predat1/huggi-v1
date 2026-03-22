import pg from 'pg';

const { Pool } = pg;

/** @returns {import('pg').Pool | null} */
export function createPool() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  const needSsl =
    url.includes('sslmode=require') ||
    url.includes('railway.app') ||
    process.env.DATABASE_SSL === 'true';
  return new Pool({
    connectionString: url,
    ssl: needSsl ? { rejectUnauthorized: false } : undefined,
    max: 10,
  });
}

/** @param {import('pg').Pool} pool */
export async function initSchema(pool) {
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";

    CREATE TABLE IF NOT EXISTS projects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL DEFAULT 'Sans titre',
      slug TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS project_files (
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      path TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (project_id, path)
    );

    CREATE TABLE IF NOT EXISTS deployments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      slug TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending',
      error TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      built_at TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS idx_project_files_project ON project_files(project_id);
    CREATE INDEX IF NOT EXISTS idx_deployments_project ON deployments(project_id);
  `);
}
