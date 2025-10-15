import { currentUserProfile } from '@/lib/auth';
import { database } from '@/lib/database';
import { projects } from '@/schema';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import { Suspense } from 'react';
import { Menu } from './menu';

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

  return (
    <div className="absolute top-16 right-0 left-0 z-[50] m-4 flex items-center gap-2 sm:top-0 sm:left-auto">
      {/* Sistema de créditos removido */}
      <div className="flex items-center rounded-full border bg-card/90 p-1 drop-shadow-xs backdrop-blur-sm">
        <Menu />
      </div>
    </div>
  );
};
