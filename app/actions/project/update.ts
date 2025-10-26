'use server';

import { currentUser } from '@/lib/auth';
import { database } from '@/lib/database';
import { parseError } from '@/lib/error/parse';
import { projects } from '@/schema';
import { and, eq } from 'drizzle-orm';

export const updateProjectAction = async (
  projectId: string,
  data: Partial<typeof projects.$inferInsert>
): Promise<
  | {
    success: true;
  }
  | {
    error: string;
  }
> => {
  try {
    const user = await currentUser();

    if (!user) {
      throw new Error('You need to be logged in to update a project!');
    }

    // Add some validation and debugging
    if (!projectId || typeof projectId !== 'string') {
      throw new Error('Invalid project ID');
    }

    // Log the operation for debugging (without sensitive data)
    console.log('Updating project:', {
      projectId,
      userId: user.id,
      hasContent: !!data.content,
      contentSize: data.content ? JSON.stringify(data.content).length : 0
    });

    // Validate content structure if present
    if (data.content) {
      const content = data.content as any;
      if (!content.nodes || !Array.isArray(content.nodes)) {
        throw new Error('Invalid content structure: nodes must be an array');
      }
      if (!content.edges || !Array.isArray(content.edges)) {
        throw new Error('Invalid content structure: edges must be an array');
      }

      // Check for circular references or invalid data
      try {
        JSON.stringify(data.content);
      } catch (jsonError) {
        throw new Error('Invalid content: cannot serialize to JSON (possible circular reference)');
      }
    }

    const result = await database
      .update(projects)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)))
      .returning({ id: projects.id });

    if (!result || result.length === 0) {
      throw new Error('Project not found or you do not have permission to update it');
    }

    console.log('Project updated successfully:', projectId);
    return { success: true };
  } catch (error) {
    // Log the complete error for debugging
    console.error('🔴 Project update failed - FULL ERROR:', error);
    console.error('🔴 Error details:', {
      projectId,
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
      cause: error instanceof Error ? error.cause : undefined,
      timestamp: new Date().toISOString()
    });

    const message = parseError(error);
    return { error: message };
  }
};
