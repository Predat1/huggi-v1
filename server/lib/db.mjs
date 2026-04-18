import pg from 'pg';

const { Pool } = pg;

/** @returns {import('pg').Pool | null} */
export function createPool() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  const needSsl =
    url.includes('sslmode=require') ||
    url.includes('ssl=true') ||
    url.includes('supabase.co') ||
    url.includes('railway.app') ||
    process.env.DATABASE_SSL === 'true';

  // Default to secure TLS verification when SSL is enabled.
  // Only disable verification if the operator explicitly opts in (not recommended).
  const insecure =
    process.env.DATABASE_SSL_INSECURE === 'true' ||
    process.env.DATABASE_SSL === 'insecure';
  return new Pool({
    connectionString: url,
    ssl: needSsl ? { rejectUnauthorized: !insecure } : undefined,
    max: 10,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
  });
}

/** @param {import('pg').Pool} pool */
export async function initSchema(pool) {
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";

    CREATE TABLE IF NOT EXISTS profiles (
      id UUID PRIMARY KEY, -- references auth.users(id)
      email TEXT,
      stripe_customer_id TEXT UNIQUE NULL,
      credits NUMERIC NOT NULL DEFAULT 50,
      tier TEXT NOT NULL DEFAULT 'free',
      is_pro BOOLEAN NOT NULL DEFAULT false,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS projects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL DEFAULT 'Sans titre',
      slug TEXT NOT NULL UNIQUE,
      custom_domain TEXT UNIQUE NULL,
      owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS project_secrets (
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      PRIMARY KEY (project_id, key)
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
      active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      built_at TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS idx_project_files_project ON project_files(project_id);
    CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);
    CREATE INDEX IF NOT EXISTS idx_deployments_project ON deployments(project_id);
    CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);
  `);
}
