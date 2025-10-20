import { currentUser } from '@/lib/auth';
import { database } from '@/lib/database';
import { falJobs } from '@/schema';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    try {
        // Get authenticated user
        const user = await currentUser();

        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Parse query parameters
        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');

        // Calculate timestamp for 24 hours ago
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        // Build query conditions
        const conditions = [
            eq(falJobs.userId, user.id),
            gte(falJobs.createdAt, twentyFourHoursAgo),
        ];

        // Add projectId filter if provided
        if (projectId) {
            conditions.push(
                sql`${falJobs.input}->'_metadata'->>'projectId' = ${projectId}`
            );
        }

        // Query database
        const jobs = await database
            .select({
                id: falJobs.id,
                requestId: falJobs.requestId,
                modelId: falJobs.modelId,
                type: falJobs.type,
                status: falJobs.status,
                input: falJobs.input,
                result: falJobs.result,
                error: falJobs.error,
                createdAt: falJobs.createdAt,
                completedAt: falJobs.completedAt,
            })
            .from(falJobs)
            .where(and(...conditions))
            .orderBy(desc(falJobs.createdAt));

        return NextResponse.json({ jobs });
    } catch (error) {
        console.error('Error fetching jobs:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
