/**
 * Handler unificado para webhooks de geração de imagem
 * Processa webhooks de diferentes providers (Fal, KIE, etc)
 */

import { database } from '@/lib/database';
import { falJobs, projects } from '@/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { getStorageProvider } from '@/lib/storage/factory';
import type { WebhookPayload, ImageNodeState, FalJob } from '@/lib/models/image/types';
import type { Node } from '@xyflow/react';

/**
 * Resultado do processamento do webhook
 */
export interface WebhookProcessingResult {
    success: boolean;
    message: string;
    status: 'pending' | 'completed' | 'failed';
    imageUrl?: string;
}

/**
 * Extrair URL da imagem do resultado
 */
function extractImageUrl(result: unknown): string | null {
    if (!result) {
        return null;
    }

    // Se result é uma string JSON, parsear primeiro
    if (typeof result === 'string') {
        try {
            const parsed = JSON.parse(result);
            // Tentar extrair do objeto parseado
            if (parsed.resultUrls && Array.isArray(parsed.resultUrls) && parsed.resultUrls.length > 0) {
                return parsed.resultUrls[0];
            }
            if (Array.isArray(parsed.images) && parsed.images.length > 0) {
                const firstImage = parsed.images[0];
                if (typeof firstImage === 'string') {
                    return firstImage;
                }
                if (typeof firstImage === 'object' && firstImage.url) {
                    return firstImage.url;
                }
            }
        } catch {
            // Se não for JSON válido, ignorar
        }
    }

    // Se não é objeto, não há mais o que fazer
    if (typeof result !== 'object') {
        return null;
    }

    const resultObj = result as any;

    // Tentar diferentes formatos de objeto
    // 1. resultJson (KIE format - string JSON dentro de objeto)
    if (typeof resultObj.resultJson === 'string') {
        try {
            const parsed = JSON.parse(resultObj.resultJson);
            if (parsed.resultUrls && Array.isArray(parsed.resultUrls) && parsed.resultUrls.length > 0) {
                return parsed.resultUrls[0];
            }
        } catch {
            // Ignorar erro de parse
        }
    }

    // 2. resultUrls array (KIE format parsed)
    if (Array.isArray(resultObj.resultUrls) && resultObj.resultUrls.length > 0) {
        return resultObj.resultUrls[0];
    }

    // 3. images array (Fal format)
    if (Array.isArray(resultObj.images) && resultObj.images.length > 0) {
        const firstImage = resultObj.images[0];
        if (typeof firstImage === 'string') {
            return firstImage;
        }
        if (typeof firstImage === 'object' && firstImage.url) {
            return firstImage.url;
        }
    }

    // 4. output array ou string
    if (Array.isArray(resultObj.output) && resultObj.output.length > 0) {
        const firstOutput = resultObj.output[0];
        if (typeof firstOutput === 'string') {
            return firstOutput;
        }
        if (typeof firstOutput === 'object' && firstOutput.url) {
            return firstOutput.url;
        }
    }

    if (typeof resultObj.output === 'string') {
        return resultObj.output;
    }

    return null;
}

/**
 * Fazer upload da imagem para storage permanente
 */
async function uploadImageToStorage(
    imageUrl: string,
    userId: string
): Promise<{ url: string; type: string }> {
    const timestamp = new Date().toISOString();
    console.log('[WEBHOOK-V2] Starting storage upload:', {
        timestamp,
        userId,
        imageUrl: imageUrl.substring(0, 100),
        step: 'upload_start',
    });

    // Baixar imagem
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
        console.error('[WEBHOOK-V2] Failed to fetch image:', {
            timestamp,
            userId,
            status: imageResponse.status,
            statusText: imageResponse.statusText,
            step: 'fetch_failed',
        });
        throw new Error(`Failed to fetch image: ${imageResponse.status}`);
    }

    const imageArrayBuffer = await imageResponse.arrayBuffer();
    const imageBuffer = Buffer.from(imageArrayBuffer);
    console.log('[WEBHOOK-V2] Image downloaded:', {
        timestamp,
        userId,
        sizeBytes: imageBuffer.length,
        step: 'download_complete',
    });

    // Upload para storage
    const storage = getStorageProvider();
    const fileName = `${nanoid()}.png`;

    console.log('[WEBHOOK-V2] Uploading to storage provider:', {
        timestamp,
        userId,
        fileName,
        bucket: 'files',
        step: 'storage_upload_start',
    });

    const uploadResult = await storage.upload(userId, 'files', fileName, imageBuffer, {
        contentType: 'image/png',
        upsert: false,
    });

    console.log('[WEBHOOK-V2] Storage upload complete:', {
        timestamp,
        userId,
        fileName,
        resultUrl: uploadResult.url,
        resultType: uploadResult.type,
        step: 'upload_complete',
    });

    return uploadResult;
}

/**
 * Atualizar estado do nó no projeto
 */
async function updateNodeState(
    projectId: string,
    nodeId: string,
    state: ImageNodeState
): Promise<void> {
    const timestamp = new Date().toISOString();
    console.log('[WEBHOOK-V2] updateNodeState called:', {
        timestamp,
        projectId,
        nodeId,
        state,
        step: 'update_node_start',
    });

    console.log('[WEBHOOK-V2] Fetching project from database:', {
        timestamp,
        projectId,
        step: 'fetch_project_start',
    });

    const project = await database.query.projects.findFirst({
        where: eq(projects.id, projectId),
    });

    if (!project) {
        console.error('[WEBHOOK-V2] Project not found:', {
            timestamp,
            projectId,
            step: 'project_not_found',
        });
        throw new Error('Project not found');
    }

    console.log('[WEBHOOK-V2] Project fetched:', {
        timestamp,
        projectId,
        hasContent: !!project.content,
        step: 'project_fetched',
    });

    const content = project.content as {
        nodes: Node[];
        edges: any[];
        viewport: any;
    };

    if (!content || !Array.isArray(content.nodes)) {
        console.error('[WEBHOOK-V2] Invalid project content structure:', {
            timestamp,
            projectId,
            hasContent: !!content,
            isNodesArray: Array.isArray(content?.nodes),
            step: 'invalid_content',
        });
        throw new Error('Invalid project content structure');
    }

    console.log('[WEBHOOK-V2] Searching for target node:', {
        timestamp,
        projectId,
        nodeId,
        totalNodes: content.nodes.length,
        nodeIds: content.nodes.map(n => n.id),
        step: 'search_node',
    });

    const targetNode = content.nodes.find((n) => n.id === nodeId);
    if (!targetNode) {
        console.error('[WEBHOOK-V2] Target node not found:', {
            timestamp,
            projectId,
            nodeId,
            availableNodeIds: content.nodes.map(n => n.id),
            step: 'node_not_found',
        });
        throw new Error(`Node ${nodeId} not found in project`);
    }

    console.log('[WEBHOOK-V2] Target node found, updating:', {
        timestamp,
        projectId,
        nodeId,
        nodeType: targetNode.type,
        currentData: targetNode.data,
        newState: state,
        step: 'node_found',
    });

    // Atualizar nó com novo estado
    const updatedNodes = content.nodes.map((node) => {
        if (node.id === nodeId) {
            return {
                ...node,
                data: {
                    ...node.data,
                    state,
                    updatedAt: new Date().toISOString(),
                },
            };
        }
        return node;
    });

    console.log('[WEBHOOK-V2] Calling database.update() on projects:', {
        timestamp,
        projectId,
        nodeId,
        updatedNodeData: updatedNodes.find(n => n.id === nodeId)?.data,
        step: 'db_update_start',
    });

    // Salvar projeto (triggers Realtime broadcast)
    const updateResult = await database
        .update(projects)
        .set({
            content: {
                ...content,
                nodes: updatedNodes,
            },
            updatedAt: new Date(), // Importante para trigger
        })
        .where(eq(projects.id, projectId));

    console.log('[WEBHOOK-V2] database.update() complete:', {
        timestamp,
        projectId,
        nodeId,
        updateResult,
        step: 'db_update_complete',
        note: 'projects_broadcast_trigger should fire now',
    });
}

/**
 * Processar webhook de status pending
 */
async function handlePendingStatus(): Promise<WebhookProcessingResult> {
    console.log('⏳ Job still pending, no action needed');
    return {
        success: true,
        message: 'Status received but not final',
        status: 'pending',
    };
}

/**
 * Processar webhook de status failed
 */
async function handleFailedStatus(
    jobId: string,
    error: string | null
): Promise<WebhookProcessingResult> {
    const timestamp = new Date().toISOString();
    console.error('[WEBHOOK-V2] Handling failed status:', {
        timestamp,
        jobId,
        error: error || 'Unknown error',
        step: 'handle_failed_start',
    });

    const updateResult = await database
        .update(falJobs)
        .set({
            status: 'failed',
            error: error || 'Unknown error',
            completedAt: new Date(),
        })
        .where(eq(falJobs.id, jobId));

    console.log('[WEBHOOK-V2] Job marked as failed in database:', {
        timestamp,
        jobId,
        updateResult,
        step: 'handle_failed_complete',
        note: 'fal_jobs_broadcast_trigger should fire now',
    });

    return {
        success: true,
        message: 'Job marked as failed',
        status: 'failed',
    };
}

/**
 * Processar webhook de status completed
 */
async function handleCompletedStatus(
    job: FalJob,
    result: unknown
): Promise<WebhookProcessingResult> {
    const timestamp = new Date().toISOString();
    console.log('[WEBHOOK-V2] Handling completed status:', {
        timestamp,
        jobId: job.id,
        userId: job.userId,
        hasResult: !!result,
        step: 'handle_completed_start',
    });

    // Extrair URL da imagem
    console.log('[WEBHOOK-V2] Attempting to extract image URL:', {
        timestamp,
        jobId: job.id,
        resultType: typeof result,
        resultPreview: typeof result === 'string' ? result.substring(0, 200) : JSON.stringify(result).substring(0, 200),
        step: 'extract_url_start',
    });

    const imageUrl = extractImageUrl(result);

    console.log('[WEBHOOK-V2] Image URL extraction result:', {
        timestamp,
        jobId: job.id,
        imageUrl: imageUrl ? imageUrl.substring(0, 100) : null,
        success: !!imageUrl,
        step: 'extract_url_complete',
    });

    if (!imageUrl) {
        console.warn('[WEBHOOK-V2] No image URL found in result:', {
            timestamp,
            jobId: job.id,
            result,
            resultType: typeof result,
            step: 'no_image_url',
        });

        const updateResult = await database
            .update(falJobs)
            .set({
                status: 'completed',
                result: result as any,
                completedAt: new Date(),
            })
            .where(eq(falJobs.id, job.id));

        console.log('[WEBHOOK-V2] Job marked as completed (no image):', {
            timestamp,
            jobId: job.id,
            updateResult,
            step: 'completed_no_image',
        });

        return {
            success: true,
            message: 'Job completed but no image URL found',
            status: 'completed',
        };
    }

    console.log('[WEBHOOK-V2] Image URL extracted:', {
        timestamp,
        jobId: job.id,
        imageUrl: imageUrl.substring(0, 100),
        step: 'image_url_extracted',
    });

    // Upload para storage permanente
    console.log('[WEBHOOK-V2] Starting storage upload process:', {
        timestamp,
        jobId: job.id,
        userId: job.userId,
        step: 'storage_process_start',
    });

    const uploadResult = await uploadImageToStorage(imageUrl, job.userId);

    console.log('[WEBHOOK-V2] Storage upload complete, updating job:', {
        timestamp,
        jobId: job.id,
        permanentUrl: uploadResult.url,
        step: 'storage_complete',
    });

    // Atualizar job no banco
    const jobUpdateResult = await database
        .update(falJobs)
        .set({
            status: 'completed',
            result: {
                images: [{ url: uploadResult.url }],
            } as any,
            completedAt: new Date(),
        })
        .where(eq(falJobs.id, job.id));

    console.log('[WEBHOOK-V2] Job updated with permanent URL:', {
        timestamp,
        jobId: job.id,
        permanentUrl: uploadResult.url,
        updateResult: jobUpdateResult,
        step: 'job_updated',
        note: 'fal_jobs_broadcast_trigger should fire now',
    });

    // Atualizar nó no projeto
    const metadata = job.input?._metadata;
    if (metadata?.nodeId && metadata?.projectId) {
        console.log('[WEBHOOK-V2] Metadata found, updating project node:', {
            timestamp,
            jobId: job.id,
            projectId: metadata.projectId,
            nodeId: metadata.nodeId,
            step: 'calling_update_node',
        });

        try {
            await updateNodeState(metadata.projectId, metadata.nodeId, {
                status: 'ready',
                url: uploadResult.url,
                timestamp: new Date().toISOString(),
            });

            console.log('[WEBHOOK-V2] Project node updated successfully:', {
                timestamp,
                jobId: job.id,
                projectId: metadata.projectId,
                nodeId: metadata.nodeId,
                step: 'node_update_complete',
            });
        } catch (updateError) {
            // Se falhar ao atualizar projeto, não falhar o webhook
            // O job foi processado com sucesso
            console.error('[WEBHOOK-V2] Failed to update project node:', {
                timestamp,
                jobId: job.id,
                projectId: metadata.projectId,
                nodeId: metadata.nodeId,
                error: updateError instanceof Error ? updateError.message : String(updateError),
                stack: updateError instanceof Error ? updateError.stack : undefined,
                step: 'node_update_failed',
            });

            // Verificar se é erro de nó/projeto deletado
            const errorMessage =
                updateError instanceof Error ? updateError.message : String(updateError);

            if (
                errorMessage.includes('not found') ||
                errorMessage.includes('deleted')
            ) {
                console.log('[WEBHOOK-V2] Node or project was deleted:', {
                    timestamp,
                    jobId: job.id,
                    projectId: metadata.projectId,
                    nodeId: metadata.nodeId,
                    step: 'node_deleted',
                });
            }
        }
    } else {
        console.warn('[WEBHOOK-V2] No metadata found, skipping project update:', {
            timestamp,
            jobId: job.id,
            hasMetadata: !!metadata,
            hasNodeId: !!metadata?.nodeId,
            hasProjectId: !!metadata?.projectId,
            step: 'no_metadata',
        });
    }

    console.log('[WEBHOOK-V2] Webhook processing complete:', {
        timestamp,
        jobId: job.id,
        permanentUrl: uploadResult.url,
        step: 'webhook_complete',
    });

    return {
        success: true,
        message: 'Webhook processed successfully',
        status: 'completed',
        imageUrl: uploadResult.url,
    };
}

/**
 * Processar webhook de geração de imagem
 */
export async function processImageWebhook(
    payload: WebhookPayload
): Promise<WebhookProcessingResult> {
    const timestamp = new Date().toISOString();
    const { requestId, status, result, error } = payload;

    console.log('[WEBHOOK-V2] Processing image webhook:', {
        timestamp,
        requestId,
        status,
        hasResult: !!result,
        hasError: !!error,
        step: 'webhook_received',
    });

    // Buscar job no banco
    console.log('[WEBHOOK-V2] Searching for job in database:', {
        timestamp,
        requestId,
        step: 'search_job_start',
    });

    const [job] = await database
        .select()
        .from(falJobs)
        .where(eq(falJobs.requestId, requestId))
        .limit(1);

    if (!job) {
        console.warn('[WEBHOOK-V2] Job not found:', {
            timestamp,
            requestId,
            step: 'job_not_found',
        });
        throw new Error('Job not found');
    }

    console.log('[WEBHOOK-V2] Found job:', {
        timestamp,
        requestId,
        jobId: job.id,
        userId: job.userId,
        modelId: job.modelId,
        currentStatus: job.status,
        step: 'job_found',
    });

    // Processar baseado no status
    console.log('[WEBHOOK-V2] Routing to status handler:', {
        timestamp,
        requestId,
        jobId: job.id,
        status,
        step: 'route_handler',
    });

    switch (status) {
        case 'pending':
            return handlePendingStatus();

        case 'failed':
            return handleFailedStatus(job.id, error ?? null);

        case 'completed':
            return handleCompletedStatus(
                {
                    ...job,
                    createdAt: job.createdAt.toISOString(),
                    completedAt: job.completedAt?.toISOString() ?? null,
                } as FalJob,
                result
            );

        default:
            console.warn('[WEBHOOK-V2] Unknown status:', {
                timestamp,
                requestId,
                jobId: job.id,
                status,
                step: 'unknown_status',
            });
            return {
                success: false,
                message: 'Unknown status received',
                status: 'pending',
            };
    }
}
