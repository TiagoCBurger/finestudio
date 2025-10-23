/**
 * Base class for image generation providers
 * 
 * Provides common functionality for all image providers (Fal.ai, Kie.ai, etc.)
 * Reduces code duplication and ensures consistent behavior.
 */

import { database } from '@/lib/database';
import { projects, falJobs } from '@/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { Node, Edge, Viewport } from '@xyflow/react';
import type {
    ImageGenerationInput,
    ImageGenerationResult,
    ImageNodeState,
    JobSubmissionResult,
    createImageError,
} from './types';

/**
 * Abstract base class for image providers
 */
export abstract class ImageProviderBase {
    /**
     * Provider name (e.g., 'fal', 'kie')
     */
    abstract readonly providerName: string;

    /**
     * Submit job to external API
     * Must be implemented by each provider
     */
    protected abstract submitToExternalAPI(
        input: ImageGenerationInput
    ): Promise<JobSubmissionResult>;

    /**
     * Main entry point for image generation
     * Handles the complete workflow:
     * 1. Validate input
     * 2. Create job in database
     * 3. Update project with 'generating' state
     * 4. Submit to external API
     * 5. Return result
     */
    async generateImage(
        input: ImageGenerationInput
    ): Promise<ImageGenerationResult> {
        try {
            // 1. Validate input
            const validation = this.validateInput(input);
            if (!validation.success) {
                return {
                    success: false,
                    error: validation.error,
                };
            }

            // 2. Create job in database (before submission to avoid race condition)
            const tempRequestId = `${this.providerName}_${Date.now()}_${nanoid(8)}`;
            const jobId = await this.createJob(input, tempRequestId);

            console.log(`[${this.providerName}] Job created:`, {
                jobId,
                tempRequestId,
                nodeId: input.nodeId,
                projectId: input.projectId,
            });

            // 3. Update project with 'generating' state
            const generatingState: ImageNodeState = {
                status: 'generating',
                requestId: tempRequestId,
                jobId,
                modelId: input.modelId,
                startedAt: new Date().toISOString(),
            };

            await this.updateProjectNodeState(
                input.projectId,
                input.nodeId,
                generatingState
            );

            console.log(`[${this.providerName}] Project updated with generating state`);

            // 4. Submit to external API
            const submission = await this.submitToExternalAPI(input);

            console.log(`[${this.providerName}] Job submitted:`, {
                requestId: submission.requestId,
                status: submission.status,
            });

            // 5. Update job with real request ID
            if (submission.requestId !== tempRequestId) {
                await this.updateJobRequestId(jobId, submission.requestId);
            }

            // 6. If completed synchronously, update state to 'ready'
            if (submission.status === 'completed' && submission.url) {
                const readyState: ImageNodeState = {
                    status: 'ready',
                    url: submission.url,
                    type: 'image/png',
                    generatedAt: new Date().toISOString(),
                };

                await this.updateProjectNodeState(
                    input.projectId,
                    input.nodeId,
                    readyState
                );

                return {
                    success: true,
                    state: readyState,
                };
            }

            // 7. Return generating state (webhook will complete later)
            return {
                success: true,
                state: generatingState,
            };
        } catch (error) {
            console.error(`[${this.providerName}] Error in generateImage:`, error);

            const imageError = this.handleError(error);

            // Update project with error state
            const errorState: ImageNodeState = {
                status: 'error',
                error: imageError.message,
                errorType: imageError.type,
                canRetry: imageError.canRetry,
                failedAt: new Date().toISOString(),
            };

            try {
                await this.updateProjectNodeState(
                    input.projectId,
                    input.nodeId,
                    errorState
                );
            } catch (updateError) {
                console.error('Failed to update project with error state:', updateError);
            }

            return {
                success: false,
                error: imageError,
            };
        }
    }

    /**
     * Validate input parameters
     */
    protected validateInput(
        input: ImageGenerationInput
    ): { success: true } | { success: false; error: ReturnType<typeof createImageError> } {
        if (!input.prompt && (!input.images || input.images.length === 0)) {
            return {
                success: false,
                error: {
                    type: 'validation',
                    message: 'Either prompt or images must be provided',
                    canRetry: false,
                    silent: false,
                },
            };
        }

        if (!input.nodeId || !input.projectId) {
            return {
                success: false,
                error: {
                    type: 'validation',
                    message: 'Node ID and Project ID are required',
                    canRetry: false,
                    silent: false,
                },
            };
        }

        return { success: true };
    }

    /**
     * Create job record in database
     */
    protected async createJob(
        input: ImageGenerationInput,
        requestId: string
    ): Promise<string> {
        // Get current user
        const { currentUser } = await import('@/lib/auth');
        const user = await currentUser();

        if (!user) {
            throw new Error('User not authenticated');
        }

        const jobId = nanoid();

        await database.insert(falJobs).values({
            id: jobId,
            requestId,
            userId: user.id,
            modelId: input.modelId,
            type: 'image',
            status: 'pending',
            input: {
                prompt: input.prompt,
                size: input.size,
                instructions: input.instructions,
                images: input.images,
                _metadata: {
                    nodeId: input.nodeId,
                    projectId: input.projectId,
                },
            },
            result: null,
            error: null,
            createdAt: new Date(),
            completedAt: null,
        });

        return jobId;
    }

    /**
     * Update job with real request ID from external API
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
     * Update project node with new state
     */
    protected async updateProjectNodeState(
        projectId: string,
        nodeId: string,
        state: ImageNodeState
    ): Promise<void> {
        const project = await database.query.projects.findFirst({
            where: eq(projects.id, projectId),
        });

        if (!project) {
            throw new Error(`Project not found: ${projectId}`);
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
            if (node.id === nodeId) {
                return {
                    ...node,
                    data: {
                        ...node.data,
                        state, // New state machine
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
                updatedAt: new Date(), // Triggers Realtime broadcast
            })
            .where(eq(projects.id, projectId));
    }

    /**
     * Handle errors and convert to ImageGenerationError
     */
    protected handleError(error: unknown): ReturnType<typeof createImageError> {
        if (error instanceof Error) {
            const message = error.message.toLowerCase();

            // Network errors
            if (message.includes('fetch') || message.includes('network')) {
                return {
                    type: 'network',
                    message: 'Network error. Please check your connection and try again.',
                    canRetry: true,
                    silent: false,
                    originalError: error,
                };
            }

            // API errors
            if (message.includes('api') || message.includes('401') || message.includes('403')) {
                return {
                    type: 'api',
                    message: error.message,
                    canRetry: true,
                    silent: false,
                    originalError: error,
                };
            }

            // Validation errors
            if (message.includes('validation') || message.includes('required')) {
                return {
                    type: 'validation',
                    message: error.message,
                    canRetry: false,
                    silent: false,
                    originalError: error,
                };
            }

            // Timeout errors
            if (message.includes('timeout')) {
                return {
                    type: 'timeout',
                    message: 'Request timed out. Please try again.',
                    canRetry: true,
                    silent: false,
                    originalError: error,
                };
            }

            // Generic error
            return {
                type: 'unknown',
                message: error.message,
                canRetry: true,
                silent: false,
                originalError: error,
            };
        }

        // Unknown error type
        return {
            type: 'unknown',
            message: 'An unexpected error occurred',
            canRetry: true,
            silent: false,
            originalError: error,
        };
    }
}
