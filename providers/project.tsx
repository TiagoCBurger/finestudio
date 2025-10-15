'use client';

import type { projects } from '@/schema';
import { type ReactNode, createContext, useContext } from 'react';
import { useProjectRealtime } from '@/hooks/use-project-realtime';

type ProjectContextType = {
  project: typeof projects.$inferSelect | null;
};

export const ProjectContext = createContext<ProjectContextType>({
  project: null,
});

export const useProject = () => {
  const context = useContext(ProjectContext);

  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }

  return context.project;
};

export const ProjectProvider = ({
  children,
  data,
}: {
  children: ReactNode;
  data: typeof projects.$inferSelect;
}) => {
  // Subscrever às mudanças do projeto via Realtime
  useProjectRealtime(data.id);

  return (
    <ProjectContext.Provider value={{ project: data }}>
      {children}
    </ProjectContext.Provider>
  );
};
