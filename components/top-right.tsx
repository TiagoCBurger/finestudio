import { currentUserProfile } from '@/lib/auth';
import { database } from '@/lib/database';
import { projects } from '@/schema';
import { eq } from 'drizzle-orm';
import { TopRightClient } from './top-right-client';

type TopRightProps = {
  id: string;
};

export const TopRight = async ({ id }: TopRightProps) => {
  const profile = await currentUserProfile();
  const project = await database.query.projects.findFirst({
    where: eq(projects.id, id),
  });

  if (!profile || !project) {
    return null;
  }

  return <TopRightClient userId={profile.id} projectId={project.id} />;
};
