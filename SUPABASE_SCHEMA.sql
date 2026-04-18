-- ============================================
-- Huggy V1 - Supabase SQL Schema
-- ============================================
-- Exécute ce script dans Supabase SQL Editor
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- USER PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- ============================================
-- PROJECTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT 'Sans titre',
  slug TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, slug)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_slug ON projects(slug);

-- ============================================
-- PROJECT FILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS project_files (
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (project_id, path)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON project_files(project_id);

-- ============================================
-- DEPLOYMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  deployed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'success'
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_deployments_project_id ON deployments(project_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS for all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USER PROFILES RLS
-- ============================================

-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can create own profile" ON user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- PROJECTS RLS
-- ============================================

-- Users can read their own projects
CREATE POLICY "Users can read own projects" ON projects
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create projects
CREATE POLICY "Users can create projects" ON projects
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own projects
CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own projects
CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- PROJECT FILES RLS
-- ============================================

-- Users can read files from their own projects
CREATE POLICY "Users can read files from own projects" ON project_files
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Users can insert files to their own projects
CREATE POLICY "Users can insert files to own projects" ON project_files
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Users can update files in their own projects
CREATE POLICY "Users can update files in own projects" ON project_files
  FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Users can delete files from their own projects
CREATE POLICY "Users can delete files from own projects" ON project_files
  FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- DEPLOYMENTS RLS
-- ============================================

-- Users can read deployments from their own projects
CREATE POLICY "Users can read own deployments" ON deployments
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Users can create deployments for their own projects
CREATE POLICY "Users can create deployments" ON deployments
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Users can delete their own deployments
CREATE POLICY "Users can delete own deployments" ON deployments
  FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- TRIGGERS & FUNCTIONS
-- ============================================

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- VIEWS (Optional)
-- ============================================

-- View for user projects with file count
CREATE OR REPLACE VIEW project_stats AS
SELECT
  p.id,
  p.user_id,
  p.name,
  p.slug,
  p.description,
  p.created_at,
  p.updated_at,
  COUNT(DISTINCT pf.path) as file_count,
  COUNT(DISTINCT d.id) as deployment_count
FROM projects p
LEFT JOIN project_files pf ON p.id = pf.project_id
LEFT JOIN deployments d ON p.id = d.project_id
GROUP BY p.id, p.user_id, p.name, p.slug, p.description, p.created_at, p.updated_at;

-- ============================================
-- GRANTS (Optional - for additional security)
-- ============================================

-- Grant execute permission on functions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;

-- ============================================
-- CLEANUP & TESTING
-- ============================================

-- Verify tables are created
SELECT tablename FROM pg_tables WHERE schemaname='public';

-- Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname='public';

-- Verify indexes
SELECT * FROM pg_indexes WHERE schemaname='public';

-- ============================================
-- END OF SCHEMA
-- ============================================
-- Your schema is now ready to use!
-- Next: Configure your .env with DATABASE_URL
-- and test the connection from your app.
