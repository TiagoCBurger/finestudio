import { env } from '@/lib/env';
import type { ImageModel, ImageModelCallWarning } from 'ai';
import { currentUser } from '@/lib/auth';
import { createFalJob } from '@/lib/fal-jobs';
import { database } from '@/lib/database';
import { falJobs } from '@/schema';
import { eq } from 'drizzle-orm';

const models = [
    'google/nano-banana',
] as const;

type KieModel = (typeof models)[number];

type KieImageOutput = {
    images: Array<{
        url: string;
        width: number;
        height: number;
        content_type: string;
    }>;
    seed?: number;
    prompt: string;
};

export const kieAIServer = {
    image: (modelId: KieModel): ImageModel => ({
        modelId,
        provider: 'kie',
        specificationVersion: 'v2',
        maxImagesPerCall: 1,
        doGenerate: async ({
            prompt,
            providerOptions,
        }) => {
            // Build input for Kie.ai API
            const input = {
                prompt,
                output_format: 'png',
                image_size: '1:1', // Kie.ai uses aspect ratio format
            };

            console.log('🔍 Kie.ai queue request:', {
                modelId,
                inputKeys: Object.keys(input),
                fullInput: JSON.stringify(input, null, 2),
            });

            // Kie.ai funciona APENAS com webhooks
            const useWebhook = !!process.env.NEXT_PUBLIC_APP_URL;
            const webhookUrl = useWebhook
                ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/kie`
                : undefined;

            console.log('🚀 Kie.ai submission mode:', {
                mode: useWebhook ? 'WEBHOOK (required)' : 'ERROR - webhook required',
                webhookUrl: webhookUrl || 'N/A',
                hasAppUrl: !!process.env.NEXT_PUBLIC_APP_URL,
                appUrl: process.env.NEXT_PUBLIC_APP_URL,
            });

            if (!useWebhook) {
                throw new Error(
                    'Kie.ai requires webhook configuration. Please set NEXT_PUBLIC_APP_URL environment variable. ' +
                    'The Kie.ai API does not support polling for job status - it only works with webhooks.'
                );
            }

            // Modo webhook: salvar job ANTES de submeter
            const user = await currentUser();
            if (!user) {
                throw new Error('User not authenticated');
            }

            // Gerar um request_id temporário
            const tempRequestId = `kie_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

            console.log('Pre-creating Kie.ai job to avoid race condition...');

            // Extrair metadados do providerOptions
            const nodeId = providerOptions?.kie?.nodeId;
            const projectId = providerOptions?.kie?.projectId;

            const jobId = await createFalJob({
                requestId: tempRequestId,
                userId: user.id,
                modelId,
                type: 'image',
                input: {
                    ...input,
                    // Adicionar metadados para atualização do project
                    _metadata: {
                        nodeId,
                        projectId,
                    },
                },
            });

            console.log('Kie.ai job pre-created with ID:', jobId);

            // Submeter para a API Kie.ai
            const response = await fetch('https://api.kie.ai/api/v1/jobs/createTask', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${env.KIE_API_KEY}`,
                },
                body: JSON.stringify({
                    model: modelId,
                    callBackUrl: webhookUrl,
                    input,
                }),
            });

            if (!response.ok) {
                throw new Error(`Kie.ai API error: ${response.status} ${response.statusText}`);
            }

            const submission = await response.json();
            const request_id = submission.data?.taskId || submission.data?.recordId || submission.id || submission.request_id || submission.taskId;

            if (!request_id) {
                throw new Error('Kie.ai API did not return a valid request ID');
            }

            console.log('Kie.ai queue submitted:', { request_id, useWebhook });

            // Atualizar o job com o request_id real
            await database
                .update(falJobs)
                .set({ requestId: request_id })
                .where(eq(falJobs.id, jobId));

            // Retornar estrutura compatível com AI SDK
            return {
                images: [new Uint8Array(0)], // Placeholder vazio para indicar modo webhook
                warnings: [],
                response: {
                    timestamp: new Date(),
                    modelId,
                    headers: {
                        'x-kie-request-id': request_id,
                        'x-kie-status': 'pending',
                    },
                },
            };
        },
    }),
};