'use server';

import { currentUser } from '@/lib/auth';
import { database } from '@/lib/database';
import { parseError } from '@/lib/error/parse';
import { projects } from '@/schema';

export const createProjectAction = async (
  name: string
): Promise<
  | {
    id: string;
  }
  | {
    error: string;
  }
> => {
  try {
    const user = await currentUser();

    if (!user) {
      throw new Error('You need to be logged in to create a project!');
    }

    const project = await database
      .insert(projects)
      .values({
        name,
        userId: user.id,
        members: [user.id], // Include the creator as a member
      })
      .returning({ id: projects.id });

    if (!project?.length) {
      throw new Error('Failed to create project');
    }

    return { id: project[0].id };
  } catch (error) {
    // Log the complete error for debugging
    console.error('🔴 Project creation failed - FULL ERROR:', error);
    console.error('🔴 Error details:', {
      name,
      message: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
      cause: error instanceof Error ? error.cause : undefined,
      timestamp: new Date().toISOString()
    });

    const message = parseError(error);
    return { error: message };
  }
};
