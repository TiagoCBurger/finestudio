/**
 * Image Webhook Handler
 * 
 * Centralized handler for image generation webhooks.
 * Handles completion and failure scenarios with robust validation.
 */

import { database } from '@/lib/database';
import { projects, falJobs } from '@/schema';
import { eq } from 'drizzle-orm';
import type { Node, Edge, Viewport } from '@xyflow/react';
import type { ImageNodeState } from '@/lib/models/image/types';

/**
 * Project content structure
 */
interface ProjectContent {
    nodes: Node[];
    edges: Edge[];
    viewport: Viewport;
}

/**
 * Job metadata from input
 */
interface JobMetadata {
    nodeId?: string;
    projectId?: string;
}

/**
 * Job input structure
 */
interface JobInput {
    _metadata?: JobMetadata;
    [key: string]: unknown;
}

/**
 * Result of webhook handling
 */
interface WebhookHandlerResult {
    success: boolean;
    message: string;
    silent?: boolean; // If true, don't log as error
}

/**
 * Image Webhook Handler
 * 
 * Provides common functionality for handling image generation webhooks.
 * Used by both Fal.ai and Kie.ai webhook routes.
 */
export class ImageWebhookHandler {
    /**
     * Handle successful image generation
     * 
     * Updates the project node with the final image URL and marks job as completed.
     * Handles cases where project or node may have been deleted.
     * 
     * @param jobId - Database job ID
     * @param imageUrl - Permanent URL of generated image
     * @returns Result indicating success or failure
     */
    async handleCompletion(
        jobId: string,
        imageUrl: string
    ): Promise<WebhookHandlerResult> {
        console.log('[WebhookHandler] Handling completion:', {
            jobId,
            imageUrl: imageUrl.substring(0, 50) + '...',
        });

        // Get job to extract metadata
        const job = await this.findJob(jobId);
        if (!job) {
            return {
                success: false,
                message: 'Job not found',
            };
        }

        const jobInput = job.input as JobInput;
        const nodeId = jobInput?._metadata?.nodeId;
        const projectId = jobInput?._metadata?.projectId;

        if (!nodeId || !projectId) {
            console.log('[WebhookHandler] No metadata found, marking job as completed');
            await this.markJobCompleted(jobId, imageUrl);
            return {
                success: true,
                message: 'Job completed (no project update needed)',
            };
        }

        // Validate project exists
        const project = await this.findProject(projectId);
        if (!project) {
            console.warn('[WebhookHandler] Project not found:', projectId);
            await this.markJobCompleted(jobId, imageUrl, {
                note: 'Project was deleted before webhook completed',
            });
            return {
                success: true,
                message: 'Job completed but project not found',
                silent: true, // Don't log as error
            };
        }

        // Validate project content structure
        const content = project.content as ProjectContent;
        if (!content || !Array.isArray(content.nodes)) {
            console.error('[WebhookHandler] Invalid project content structure');
            await this.markJobCompleted(jobId, imageUrl, {
                note: 'Invalid project content structure',
            });
            return {
                success: false,
                message: 'Invalid project content structure',
            };
        }

        // Validate node exists
        const targetNode = content.nodes.find((n) => n.id === nodeId);
        if (!targetNode) {
            console.warn('[WebhookHandler] Target node not found:', nodeId);
            await this.markJobCompleted(jobId, imageUrl, {
                note: 'Node was deleted before webhook completed',
            });
            return {
                success: true,
                message: 'Job completed but node not found',
                silent: true, // Don't log as error
            };
        }

        // Update node with ready state
        const readyState: ImageNodeState = {
            status: 'ready',
            url: imageUrl,
            type: 'image/png',
            generatedAt: new Date().toISOString(),
        };

        await this.updateNodeState(projectId, nodeId, readyState);
        await this.markJobCompleted(jobId, imageUrl);

        console.log('[WebhookHandler] ✅ Completion handled successfully');

        return {
            success: true,
            message: 'Project updated successfully',
        };
    }

    /**
     * Handle failed image generation
     * 
     * Updates the project node with error state and marks job as failed.
     * Classifies error type for appropriate handling.
     * 
     * @param jobId - Database job ID
     * @param error - Error message
     * @returns Result indicating success or failure
     */
    async handleFailure(
        jobId: string,
        error: string
    ): Promise<WebhookHandlerResult> {
        console.log('[WebhookHandler] Handling failure:', {
            jobId,
            error,
        });

        // Get job to extract metadata
        const job = await this.findJob(jobId);
        if (!job) {
            return {
                success: false,
                message: 'Job not found',
            };
        }

        const jobInput = job.input as JobInput;
        const nodeId = jobInput?._metadata?.nodeId;
        const projectId = jobInput?._metadata?.projectId;

        // Classify error type
        const errorType = this.classifyError(error);
        const canRetry = errorType === 'api' || errorType === 'network';

        // Mark job as failed
        await this.markJobFailed(jobId, error);

        // If no metadata, we're done
        if (!nodeId || !projectId) {
            console.log('[WebhookHandler] No metadata found, job marked as failed');
            return {
                success: true,
                message: 'Job marked as failed (no project update needed)',
            };
        }

        // Try to update project with error state
        const project = await this.findProject(projectId);
        if (project) {
            const content = project.content as ProjectContent;
            if (content && Array.isArray(content.nodes)) {
                const targetNode = content.nodes.find((n) => n.id === nodeId);
                if (targetNode) {
                    const errorState: ImageNodeState = {
                        status: 'error',
                        error,
                        errorType,
                        canRetry,
                        failedAt: new Date().toISOString(),
                    };

                    await this.updateNodeState(projectId, nodeId, errorState);
                    console.log('[WebhookHandler] ✅ Error state updated in project');
                }
            }
        }

        return {
            success: true,
            message: 'Job marked as failed',
        };
    }

    /**
     * Find job by ID
     */
    private async findJob(jobId: string) {
        const [job] = await database
            .select()
            .from(falJobs)
            .where(eq(falJobs.id, jobId))
            .limit(1);

        return job;
    }

    /**
     * Find project by ID
     */
    private async findProject(projectId: string) {
        const project = await database.query.projects.findFirst({
            where: eq(projects.id, projectId),
        });

        return project;
    }

    /**
     * Update node state in project
     */
    private async updateNodeState(
        projectId: string,
        nodeId: string,
        state: ImageNodeState
    ) {
        const project = await this.findProject(projectId);
        if (!project) {
            throw new Error(`Project not found: ${projectId}`);
        }

        const content = project.content as ProjectContent;
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

        console.log('[WebhookHandler] Project node updated:', {
            projectId,
            nodeId,
            status: state.status,
        });
    }

    /**
     * Mark job as completed
     */
    private async markJobCompleted(
        jobId: string,
        imageUrl: string,
        metadata?: { note: string }
    ) {
        await database
            .update(falJobs)
            .set({
                status: 'completed',
                result: {
                    images: [{ url: imageUrl }],
                    ...(metadata ? { _metadata: metadata } : {}),
                },
                completedAt: new Date(),
            })
            .where(eq(falJobs.id, jobId));

        console.log('[WebhookHandler] Job marked as completed:', jobId);
    }

    /**
     * Mark job as failed
     */
    private async markJobFailed(jobId: string, error: string) {
        await database
            .update(falJobs)
            .set({
                status: 'failed',
                error,
                completedAt: new Date(),
            })
            .where(eq(falJobs.id, jobId));

        console.log('[WebhookHandler] Job marked as failed:', jobId);
    }

    /**
     * Classify error type based on error message
     */
    private classifyError(error: string): 'validation' | 'api' | 'network' | 'storage' | 'timeout' | 'node_deleted' | 'project_deleted' | 'unknown' {
        const errorLower = error.toLowerCase();

        if (errorLower.includes('validation') || errorLower.includes('required')) {
            return 'validation';
        }

        if (
            errorLower.includes('api') ||
            errorLower.includes('401') ||
            errorLower.includes('403')
        ) {
            return 'api';
        }

        if (errorLower.includes('network') || errorLower.includes('fetch')) {
            return 'network';
        }

        if (errorLower.includes('storage') || errorLower.includes('upload')) {
            return 'storage';
        }

        if (errorLower.includes('timeout')) {
            return 'timeout';
        }

        if (errorLower.includes('node') && errorLower.includes('deleted')) {
            return 'node_deleted';
        }

        if (errorLower.includes('project') && errorLower.includes('deleted')) {
            return 'project_deleted';
        }

        return 'unknown';
    }
}
