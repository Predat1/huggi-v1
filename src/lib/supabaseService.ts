import { supabase } from './supabaseClient';

/**
 * Fetch all projects for the current user
 */
export async function getUserProjects() {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Auth error:', authError);
      return { data: [], error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch projects error:', error);
      return { data: [], error: error.message };
    }

    return { data: data || [], error: null };
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    return { data: [], error: 'Failed to fetch projects' };
  }
}

/**
 * Create a new project
 */
export async function createProject(name: string, slug: string, description?: string) {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { data: null, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('projects')
      .insert([
        {
          user_id: user.id,
          name,
          slug,
          description: description || null,
        },
      ])
      .select();

    if (error) {
      console.error('Create project error:', error);
      return { data: null, error: error.message };
    }

    return { data: data?.[0] || null, error: null };
  } catch (error) {
    console.error('Failed to create project:', error);
    return { data: null, error: 'Failed to create project' };
  }
}

/**
 * Update a project
 */
export async function updateProject(
  projectId: string,
  updates: {
    name?: string;
    description?: string;
  }
) {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { data: null, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('projects')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', projectId)
      .eq('user_id', user.id)
      .select();

    if (error) {
      console.error('Update project error:', error);
      return { data: null, error: error.message };
    }

    return { data: data?.[0] || null, error: null };
  } catch (error) {
    console.error('Failed to update project:', error);
    return { data: null, error: 'Failed to update project' };
  }
}

/**
 * Delete a project
 */
export async function deleteProject(projectId: string) {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: 'Not authenticated' };
    }

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Delete project error:', error);
      return { error: error.message };
    }

    return { error: null };
  } catch (error) {
    console.error('Failed to delete project:', error);
    return { error: 'Failed to delete project' };
  }
}

/**
 * Get a single project by ID
 */
export async function getProject(projectId: string) {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { data: null, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Fetch project error:', error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Failed to fetch project:', error);
    return { data: null, error: 'Failed to fetch project' };
  }
}

/**
 * Get project files (stored in project_files table)
 */
export async function getProjectFiles(projectId: string) {
  try {
    const { data, error } = await supabase
      .from('project_files')
      .select('*')
      .eq('project_id', projectId)
      .order('path', { ascending: true });

    if (error) {
      console.error('Fetch files error:', error);
      return { data: [], error: error.message };
    }

    return { data: data || [], error: null };
  } catch (error) {
    console.error('Failed to fetch files:', error);
    return { data: [], error: 'Failed to fetch files' };
  }
}

/**
 * Update a project file
 */
export async function updateProjectFile(
  projectId: string,
  path: string,
  content: string
) {
  try {
    const { error } = await supabase.from('project_files').upsert([
      {
        project_id: projectId,
        path,
        content,
        updated_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      console.error('Update file error:', error);
      return { error: error.message };
    }

    return { error: null };
  } catch (error) {
    console.error('Failed to update file:', error);
    return { error: 'Failed to update file' };
  }
}

/**
 * Delete a project file
 */
export async function deleteProjectFile(projectId: string, path: string) {
  try {
    const { error } = await supabase
      .from('project_files')
      .delete()
      .eq('project_id', projectId)
      .eq('path', path);

    if (error) {
      console.error('Delete file error:', error);
      return { error: error.message };
    }

    return { error: null };
  } catch (error) {
    console.error('Failed to delete file:', error);
    return { error: 'Failed to delete file' };
  }
}
