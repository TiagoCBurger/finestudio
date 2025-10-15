import { currentUser } from '@/lib/auth';
import { database } from '@/lib/database';
import { projects } from '@/schema';
import { eq } from 'drizzle-orm';
import { TopLeftClient } from './top-left-client';

type TopLeftProps = {
  id: string;
};

export const TopLeft = async ({ id }: TopLeftProps) => {
  const user = await currentUser();

  if (!user) {
    return null;
  }

  const allProjects = await database.query.projects.findMany({
    where: eq(projects.userId, user.id),
  });

  if (!allProjects.length) {
    return null;
  }

  const currentProject = allProjects.find((project) => project.id === id);

  if (!currentProject) {
    return null;
  }

  return (
    <TopLeftClient
      allProjects={allProjects}
      currentProject={currentProject}
    />
  );
};
