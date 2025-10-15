import { getFalJobByRequestId } from '@/lib/fal-jobs';
import { NextResponse } from 'next/server';

export async function GET(
    request: Request,
    { params }: { params: { requestId: string } }
) {
    try {
        const job = await getFalJobByRequestId(params.requestId);

        if (!job) {
            return NextResponse.json(
                { error: 'Job not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            id: job.id,
            requestId: job.requestId,
            status: job.status,
            result: job.result,
            error: job.error,
            createdAt: job.createdAt,
            completedAt: job.completedAt,
        });
    } catch (error) {
        console.error('Error fetching job status:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}