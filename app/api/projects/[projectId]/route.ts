import { currentUserProfile } from '@/lib/auth';
import { database } from '@/lib/database';
import { parseError } from '@/lib/error/parse';
import { projects } from '@/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export const GET = async (
    req: Request,
    { params }: { params: Promise<{ projectId: string }> }
) => {
    try {
        const { projectId } = await params;
        const profile = await currentUserProfile();

        if (!profile) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const project = await database.query.projects.findFirst({
            where: eq(projects.id, projectId),
        });

        if (!project) {
            return NextResponse.json(
                { error: 'Project not found' },
                { status: 404 }
            );
        }

        // Verificar se o usuário tem acesso ao projeto
        if (project.userId !== profile.id && !project.members?.includes(profile.id)) {
            return NextResponse.json(
                { error: 'Forbidden' },
                { status: 403 }
            );
        }

        return NextResponse.json(project);
    } catch (error) {
        const message = parseError(error);
        console.error('Error fetching project:', message);

        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
};
