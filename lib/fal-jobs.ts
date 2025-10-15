import { database } from '@/lib/database';
import { falJobs } from '@/schema';
import { eq } from 'drizzle-orm';

export type FalJobType = 'image' | 'video';
export type FalJobStatus = 'pending' | 'completed' | 'failed';

export interface FalJob {
    id: string;
    requestId: string;
    userId: string;
    modelId: string;
    type: FalJobType;
    status: FalJobStatus;
    input: unknown;
    result: unknown;
    error: string | null;
    createdAt: Date;
    completedAt: Date | null;
}

/**
 * Cria um novo job no banco de dados
 */
export async function createFalJob(params: {
    requestId: string;
    userId: string;
    modelId: string;
    type: FalJobType;
    input: unknown;
}): Promise<string> {
    const [job] = await database
        .insert(falJobs)
        .values({
            requestId: params.requestId,
            userId: params.userId,
            modelId: params.modelId,
            type: params.type,
            input: params.input,
            status: 'pending',
        })
        .returning({ id: falJobs.id });

    return job.id;
}

/**
 * Busca um job pelo request_id
 */
export async function getFalJobByRequestId(
    requestId: string
): Promise<FalJob | null> {
    const [job] = await database
        .select()
        .from(falJobs)
        .where(eq(falJobs.requestId, requestId))
        .limit(1);

    return job as FalJob || null;
}

/**
 * Aguarda a conclusão de um job com polling
 */
export async function waitForFalJob(
    requestId: string,
    options: {
        maxWaitTime?: number; // em ms
        pollInterval?: number; // em ms
    } = {}
): Promise<FalJob> {
    const maxWaitTime = options.maxWaitTime || 5 * 60 * 1000; // 5 minutos padrão
    const pollInterval = options.pollInterval || 2000; // 2 segundos padrão
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
        const job = await getFalJobByRequestId(requestId);

        if (!job) {
            throw new Error(`Job ${requestId} not found`);
        }

        if (job.status === 'completed') {
            return job;
        }

        if (job.status === 'failed') {
            throw new Error(job.error || 'Job failed');
        }

        // Aguardar antes de verificar novamente
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error(`Job ${requestId} timed out after ${maxWaitTime}ms`);
}
