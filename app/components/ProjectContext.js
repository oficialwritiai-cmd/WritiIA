'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createSupabaseClient } from '@/lib/supabase';

const ProjectContext = createContext(null);

export function useProject() {
    const ctx = useContext(ProjectContext);
    if (!ctx) throw new Error('useProject must be used within ProjectProvider');
    return ctx;
}

export function ProjectProvider({ children }) {
    const [projects, setProjects] = useState([]);
    const [activeProject, setActiveProjectState] = useState(null);
    const [projectBrain, setProjectBrain] = useState(null);
    const [loadingProject, setLoadingProject] = useState(true);
    const supabase = createSupabaseClient();

    // Load all projects on mount
    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        setLoadingProject(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoadingProject(false); return; }

        const { data } = await supabase
            .from('projects')
            .select('*')
            .eq('user_id', user.id)
            .or('is_deleted.eq.false,is_deleted.is.null')
            .order('created_at', { ascending: false });

        const projectsList = data || [];
        setProjects(projectsList);

        if (projectsList.length > 0) {
            // Try to restore from localStorage
            const savedId = typeof window !== 'undefined' ? localStorage.getItem('writi_active_project') : null;
            const savedProject = savedId ? projectsList.find(p => p.id === savedId) : null;
            const target = savedProject || projectsList[0];
            await selectProject(target, user.id);
        }
        setLoadingProject(false);
    };

    const selectProject = async (project, userId) => {
        if (!project) return;
        setActiveProjectState(project);
        if (typeof window !== 'undefined') {
            localStorage.setItem('writi_active_project', project.id);
        }
        // Load the project brain
        await loadBrain(project.id);
    };

    const loadBrain = async (projectId) => {
        const { data } = await supabase
            .from('project_brains')
            .select('*')
            .eq('project_id', projectId)
            .single();
        setProjectBrain(data || null);
    };

    const setActiveProject = useCallback(async (projectId) => {
        const project = projects.find(p => p.id === projectId);
        if (project) {
            const { data: { user } } = await supabase.auth.getUser();
            await selectProject(project, user?.id);
        }
    }, [projects]);

    const refreshProjects = useCallback(async () => {
        await loadProjects();
    }, []);

    const refreshBrain = useCallback(async () => {
        if (activeProject) {
            await loadBrain(activeProject.id);
        }
    }, [activeProject]);

    return (
        <ProjectContext.Provider value={{
            projects,
            activeProject,
            projectBrain,
            loadingProject,
            setActiveProject,
            refreshProjects,
            refreshBrain,
        }}>
            {children}
        </ProjectContext.Provider>
    );
}
