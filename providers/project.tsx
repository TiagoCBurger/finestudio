'use client';

import type { projects } from '@/schema';
import { type ReactNode, createContext, useContext, useMemo, useRef } from 'react';
import { useProjectRealtime } from '@/hooks/use-project-realtime';
import useSWR from 'swr';

type ProjectContextType = {
  project: typeof projects.$inferSelect | null;
  isLoading: boolean;
  error: Error | null;
};

export const ProjectContext = createContext<ProjectContextType>({
  project: null,
  isLoading: false,
  error: null,
});

export const useProject = () => {
  const context = useContext(ProjectContext);

  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }

  return context.project;
};

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch project');
  }
  return res.json();
};

export const ProjectProvider = ({
  children,
  data: initialData,
}: {
  children: ReactNode;
  data: typeof projects.$inferSelect;
}) => {
  // Track previous state to prevent unnecessary logs
  const prevStateRef = useRef<{
    hasData: boolean;
    isLoading: boolean;
    hasError: boolean;
    contentNodeCount: number;
  } | null>(null);

  // Use SWR to fetch and cache project data
  // This will automatically revalidate when mutate() is called from realtime hook
  const { data, error, isLoading } = useSWR<typeof projects.$inferSelect>(
    `/api/projects/${initialData.id}`,
    fetcher,
    {
      fallbackData: initialData, // Use initial SSR data
      revalidateOnFocus: false, // Don't revalidate on window focus
      revalidateOnReconnect: true, // Revalidate on reconnect
      dedupingInterval: 1000, // Dedupe requests within 1 second
      // Compare function to prevent unnecessary re-renders
      compare: (a, b) => {
        // Deep comparison of content to prevent re-renders when data hasn't actually changed
        return JSON.stringify(a) === JSON.stringify(b);
      },
    }
  );

  // Enable realtime for project updates
  // This will call mutate() when updates are received
  useProjectRealtime(initialData.id);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    project: data || null,
    isLoading,
    error: error || null,
  }), [data, isLoading, error]);

  // Only log when state actually changes
  const currentState = {
    hasData: !!data,
    isLoading,
    hasError: !!error,
    contentNodeCount: (data?.content as any)?.nodes?.length || 0,
  };

  if (!prevStateRef.current ||
    prevStateRef.current.hasData !== currentState.hasData ||
    prevStateRef.current.isLoading !== currentState.isLoading ||
    prevStateRef.current.hasError !== currentState.hasError ||
    prevStateRef.current.contentNodeCount !== currentState.contentNodeCount) {

    console.log('🔍 ProjectProvider state changed:', {
      projectId: initialData.id,
      ...currentState,
    });

    prevStateRef.current = currentState;
  }

  return (
    <ProjectContext.Provider value={contextValue}>
      {children}
    </ProjectContext.Provider>
  );
};
