import { getFalJobByRequestId } from '@/lib/fal-jobs';
import { NextResponse } from 'next/server';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ requestId: string }> }
) {
    try {
        const { requestId } = await params;
        const job = await getFalJobByRequestId(requestId);

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