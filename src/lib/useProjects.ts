import { useState, useEffect, useCallback } from 'react';
import { supabase, type Project, type Build } from './supabase';

export function useProjects(userId: string | undefined) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch all projects for the user
  const fetchProjects = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('updated_at', { ascending: false });

    if (data) {
      setProjects(data);
      // Auto-select first project if none selected
      setCurrentProject(prev => (prev === null && data.length > 0) ? data[0] : prev);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Create a new project
  const createProject = async (name: string, prompt: string) => {
    if (!userId) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: userId,
        name,
        original_prompt: prompt,
        description: prompt.slice(0, 200),
      })
      .select()
      .single();

    if (error) throw error;
    
    const project = data as Project;
    setProjects(prev => [project, ...prev]);
    setCurrentProject(project);
    return project;
  };

  // Save a build result
  const saveBuild = async (
    projectId: string,
    prompt: string,
    result: {
      files?: Array<{ path: string; content: string }>;
      reply?: string;
      meta?: {
        securityScore?: number;
        qaScore?: number;
        complexity?: string;
        projectName?: string;
      };
    }
  ) => {
    if (!userId) throw new Error('Not authenticated');

    // 1. Save the build
    const { data: build, error: buildError } = await supabase
      .from('builds')
      .insert({
        project_id: projectId,
        user_id: userId,
        prompt,
        status: 'completed',
        files: result.files || [],
        reply: result.reply || null,
        security_score: result.meta?.securityScore || null,
        qa_score: result.meta?.qaScore || null,
        complexity: result.meta?.complexity || null,
        credits_used: 1,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (buildError) throw buildError;

    // 2. Deduct credits
    await supabase.rpc('use_credits', { user_uuid: userId, amount: 1 });

    return build as Build;
  };

  // Get builds for a project
  const getBuilds = async (projectId: string) => {
    const { data } = await supabase
      .from('builds')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    return (data || []) as Build[];
  };

  return {
    projects,
    currentProject,
    setCurrentProject,
    createProject,
    saveBuild,
    getBuilds,
    loading,
    refreshProjects: fetchProjects,
  };
}
