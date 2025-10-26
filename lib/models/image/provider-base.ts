/**
 * Classe base abstrata para providers de geração de imagem
 * Implementa lógica comum e define interface para providers específicos
 */

import { database } from '@/lib/database';
import { falJobs, projects } from '@/schema';
import { eq } from 'drizzle-orm';
import type { Node, Edge, Viewport } from '@xyflow/react';
import type {
    ImageGenerationInput,
    ImageGenerationResult,
    JobSubmissionResult,
    ProviderConfig,
    ImageNodeState,
} from './types';

/**
 * Classe base para providers de imagem
 */
export abstract class ImageProviderBase {
    protected config: ProviderConfig;

    constructor(config: ProviderConfig) {
        this.config = config;
    }

    /**
     * Método abstrato: submeter job para API externa
     * Cada provider implementa sua própria lógica
     */
    protected abstract submitToExternalAPI(
        input: ImageGenerationInput
    ): Promise<{ requestId: string; tempJobId?: string }>;

    /**
     * Nome do provider (para logging)
     */
    protected abstract get providerName(): string;

    /**
     * Gerar imagem (fluxo completo)
     */
    async generateImage(
        input: ImageGenerationInput
    ): Promise<ImageGenerationResult> {
        const startTime = Date.now();

        try {
            // 1. Validar input
            this.validateInput(input);

            // 2. Determinar modo de operação
            const useWebhook = !!this.config.webhookUrl;
            console.log(`🚀 [${this.providerName}] Starting generation:`, {
                mode: useWebhook ? 'WEBHOOK' : 'POLLING',
                modelId: input.modelId,
                nodeId: input.metadata.nodeId,
                projectId: input.metadata.projectId,
                hasImages: !!input.images?.length,
            });

            if (!useWebhook) {
                throw new Error(
                    `${this.providerName} requires webhook configuration. Please set NEXT_PUBLIC_APP_URL.`
                );
            }

            // 3. Criar job no banco ANTES de submeter (evita race condition)
            const tempRequestId = this.generateTempRequestId();
            const jobId = await this.createJobInDatabase(tempRequestId, input);

            console.log(`✅ [${this.providerName}] Job pre-created:`, {
                jobId,
                tempRequestId,
            });

            // 4. Atualizar projeto com estado 'generating'
            await this.updateProjectState(input.metadata, {
                status: 'generating',
                requestId: tempRequestId,
                jobId,
                modelId: input.modelId,
            });

            console.log(`✅ [${this.providerName}] Project updated with generating state`);

            // 5. Submeter para API externa
            const { requestId: realRequestId, tempJobId } =
                await this.submitToExternalAPI(input);

            console.log(`✅ [${this.providerName}] Job submitted to external API:`, {
                realRequestId,
                tempJobId,
            });

            // 6. Atualizar job com request ID real
            if (realRequestId !== tempRequestId) {
                await this.updateJobRequestId(jobId, realRequestId);
                console.log(`✅ [${this.providerName}] Job updated with real request ID`);
            }

            // 7. Retornar resultado
            const duration = Date.now() - startTime;
            console.log(`✅ [${this.providerName}] Generation started successfully (${duration}ms)`);

            return {
                state: {
                    status: 'generating',
                    requestId: realRequestId,
                    jobId,
                    modelId: input.modelId,
                },
                nodeData: {
                    state: {
                        status: 'generating',
                        requestId: realRequestId,
                        jobId,
                        modelId: input.modelId,
                    },
                    updatedAt: new Date().toISOString(),
                },
            };
        } catch (error) {
            console.error(`❌ [${this.providerName}] Generation failed:`, error);
            throw this.normalizeError(error);
        }
    }

    /**
     * Validar input
     */
    protected validateInput(input: ImageGenerationInput): void {
        if (!input.prompt && !input.images?.length) {
            throw new Error('Either prompt or images must be provided');
        }

        if (!input.metadata.nodeId || !input.metadata.projectId) {
            throw new Error('Node ID and Project ID are required');
        }

        if (!input.metadata.userId) {
            throw new Error('User ID is required');
        }
    }

    /**
     * Gerar request ID temporário
     */
    protected generateTempRequestId(): string {
        return `${this.providerName.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }

    /**
     * Criar job no banco de dados
     */
    protected async createJobInDatabase(
        requestId: string,
        input: ImageGenerationInput
    ): Promise<string> {
        const { createFalJob } = await import('@/lib/fal-jobs');

        const jobId = await createFalJob({
            requestId,
            userId: input.metadata.userId,
            modelId: input.modelId,
            type: 'image',
            input: {
                prompt: input.prompt,
                size: input.size,
                images: input.images,
                strength: input.strength,
                _metadata: {
                    nodeId: input.metadata.nodeId,
                    projectId: input.metadata.projectId,
                },
            },
        });

        return jobId;
    }

    /**
     * Atualizar request ID do job
     */
    protected async updateJobRequestId(
        jobId: string,
        requestId: string
    ): Promise<void> {
        await database
            .update(falJobs)
            .set({ requestId })
            .where(eq(falJobs.id, jobId));
    }

    /**
     * Atualizar estado do projeto
     */
    protected async updateProjectState(
        metadata: { nodeId: string; projectId: string },
        state: ImageNodeState
    ): Promise<void> {
        const project = await database.query.projects.findFirst({
            where: eq(projects.id, metadata.projectId),
        });

        if (!project) {
            throw new Error('Project not found');
        }

        const content = project.content as {
            nodes: Node[];
            edges: Edge[];
            viewport: Viewport;
        };

        if (!content || !Array.isArray(content.nodes)) {
            throw new Error('Invalid project content structure');
        }

        const updatedNodes = content.nodes.map((node) => {
            if (node.id === metadata.nodeId) {
                return {
                    ...node,
                    data: {
                        ...(node.data ?? {}),
                        state,
                        updatedAt: new Date().toISOString(),
                    },
                };
            }
            return node;
        });

        await database
            .update(projects)
            .set({
                content: { ...content, nodes: updatedNodes },
                updatedAt: new Date(),
            })
            .where(eq(projects.id, metadata.projectId));
    }

    /**
     * Normalizar erro para formato padrão
     */
    protected normalizeError(error: unknown): Error {
        if (error instanceof Error) {
            return error;
        }

        if (typeof error === 'string') {
            return new Error(error);
        }

        return new Error('Unknown error occurred');
    }
}
