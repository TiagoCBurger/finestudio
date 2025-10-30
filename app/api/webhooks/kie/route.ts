/**
 * Webhook handler para KIE.ai (Refatorado)
 * Processa callbacks da API KIE.ai para imagens e vídeos
 */

import { NextRequest, NextResponse } from 'next/server';
import { parseError } from '@/lib/error/parse';
import { processImageWebhook } from '@/lib/webhooks/image-webhook-handler';
import type { WebhookPayload } from '@/lib/models/image/types';
import { database } from '@/lib/database';
import { falJobs, projects } from '@/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { getStorageProvider } from '@/lib/storage/factory';

/**
 * Payload do webhook KIE.ai (formato bruto)
 */
interface KieWebhookPayload {
    taskId?: string;
    recordId?: string;
    id?: string;
    data?: {
        taskId?: string;
        recordId?: string;
        state?: string;
        images?: Array<{ url: string } | string>;
        output?: Array<{ url: string } | string> | string;
        resultJson?: string;
        [key: string]: unknown;
    };
    status?: string;
    state?: string;
    result?: {
        images?: Array<{ url: string } | string>;
        output?: Array<{ url: string } | string> | string;
        [key: string]: unknown;
    };
    resultJson?: string;
    error?: string | { message: string; code?: string };
    [key: string]: unknown;
}

/**
 * Extrair request ID do payload KIE
 */
function extractRequestId(payload: KieWebhookPayload): string | null {
    return (
        payload.taskId ||
        payload.data?.taskId ||
        payload.recordId ||
        payload.data?.recordId ||
        payload.id ||
        null
    );
}

/**
 * Normalizar status do KIE para formato padrão
 */
function normalizeStatus(
    payload: KieWebhookPayload
): 'pending' | 'completed' | 'failed' {
    const rawStatus = (
        payload.status ||
        payload.state ||
        payload.data?.state ||
        ''
    ).toLowerCase();

    if (rawStatus === 'completed' || rawStatus === 'success') {
        return 'completed';
    }

    if (rawStatus === 'failed' || rawStatus === 'error' || payload.error) {
        return 'failed';
    }

    // Check for GPT-4o Image success format (code: 200 with result_urls)
    const code = (payload as any).code;
    if (code === 200 && payload.data?.info && typeof payload.data.info === 'object' && payload.data.info !== null && 'result_urls' in payload.data.info) {
        return 'completed';
    }

    return 'pending';
}

/**
 * Extrair mensagem de erro
 */
function extractError(payload: KieWebhookPayload): string | null {
    if (!payload.error) {
        return null;
    }

    if (typeof payload.error === 'string') {
        return payload.error;
    }

    if (typeof payload.error === 'object' && 'message' in payload.error) {
        return payload.error.message;
    }

    return 'Unknown error from KIE.ai';
}

/**
 * Extrair resultado do payload
 */
function extractResult(payload: KieWebhookPayload): unknown {
    // Priorizar resultJson (formato KIE)
    if (payload.resultJson) {
        return payload.resultJson;
    }

    if (payload.data && 'resultJson' in payload.data) {
        return payload.data.resultJson;
    }

    // Check for GPT-4o Image format (result_urls in data.info)
    if (payload.data?.info && typeof payload.data.info === 'object' && payload.data.info !== null && 'result_urls' in payload.data.info) {
        const info = payload.data.info as any;
        if (Array.isArray(info.result_urls)) {
            return { resultUrls: info.result_urls };
        }
    }

    // Check for GPT-4o Image format (images array directly in data)
    if (payload.data?.images && Array.isArray(payload.data.images)) {
        return { images: payload.data.images };
    }

    // Fallback para result ou data
    return payload.result || payload.data || null;
}

/**
 * Normalizar payload KIE para formato padrão
 */
function normalizeKiePayload(payload: KieWebhookPayload): WebhookPayload | null {
    const requestId = extractRequestId(payload);

    if (!requestId) {
        return null;
    }

    return {
        requestId,
        status: normalizeStatus(payload),
        result: extractResult(payload) as any,
        error: extractError(payload) ?? undefined,
    };
}

/**
 * Validar e parsear body do webhook
 */
async function parseWebhookBody(
    request: NextRequest
): Promise<{ success: true; body: KieWebhookPayload } | { success: false; error: string }> {
    try {
        const rawBody = await request.text();

        console.log('🔔 KIE.ai webhook received (raw):', {
            hasContent: !!rawBody,
            contentLength: rawBody.length,
            contentPreview: rawBody.substring(0, 200),
        });

        if (!rawBody || rawBody.trim() === '') {
            return { success: false, error: 'Empty request body' };
        }

        let body: KieWebhookPayload;
        try {
            body = JSON.parse(rawBody) as KieWebhookPayload;
        } catch (parseError) {
            console.error('❌ Failed to parse JSON:', parseError);
            return { success: false, error: 'Invalid JSON in request body' };
        }

        console.log('🔔 KIE.ai webhook parsed:', {
            hasBody: !!body,
            bodyKeys: Object.keys(body || {}),
            fullBody: JSON.stringify(body, null, 2),
        });

        return { success: true, body };
    } catch (error) {
        console.error('❌ Error reading request:', error);
        return { success: false, error: 'Failed to read request body' };
    }
}

/**
 * Update project node with video URL
 */
async function updateProjectNodeWithVideo(
    projectId: string,
    nodeId: string,
    videoUrl: string
): Promise<void> {
    const [project] = await database
        .select()
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1);

    if (!project) {
        throw new Error('Project not found');
    }

    const content = project.content as any;
    if (!content || !Array.isArray(content.nodes)) {
        throw new Error('Invalid project content');
    }

    const updatedNodes = content.nodes.map((node: any) => {
        if (node.id === nodeId) {
            return {
                ...node,
                data: {
                    ...node.data,
                    generated: {
                        url: videoUrl,
                        type: 'video/mp4',
                    },
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
        .where(eq(projects.id, projectId));
}

/**
 * Upload video from URL to permanent storage
 */
async function uploadVideoToStorage(
    videoUrl: string,
    userId: string
): Promise<string> {
    console.log('[KIE Webhook] Uploading video to storage...');

    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
        throw new Error(`Failed to fetch video: ${videoResponse.status}`);
    }

    const videoArrayBuffer = await videoResponse.arrayBuffer();
    const videoBuffer = Buffer.from(videoArrayBuffer);
    console.log('[KIE Webhook] Video downloaded, size:', videoBuffer.length, 'bytes');

    const storage = getStorageProvider();
    const fileName = `${nanoid()}.mp4`;

    const uploadResult = await storage.upload(
        userId,
        'files',
        fileName,
        videoBuffer,
        {
            contentType: 'video/mp4',
            upsert: false,
        }
    );

    console.log('[KIE Webhook] Video uploaded to storage:', uploadResult.url);
    return uploadResult.url;
}

/**
 * POST handler para webhook KIE.ai
 */
export async function POST(request: NextRequest) {
    console.log('🔔 [KIE Webhook] Received webhook request');

    try {
        // 1. Parsear body
        const parseResult = await parseWebhookBody(request);
        if (!parseResult.success) {
            console.error('❌ [KIE Webhook] Failed to parse body:', parseResult.error);
            return NextResponse.json({ error: parseResult.error }, { status: 400 });
        }

        const body = parseResult.body;
        console.log('📦 [KIE Webhook] Parsed body:', JSON.stringify(body, null, 2));

        // 2. Normalizar payload
        const normalized = normalizeKiePayload(body);
        if (!normalized) {
            console.error('❌ Missing request ID in payload');
            return NextResponse.json(
                { error: 'Missing request ID in webhook payload' },
                { status: 400 }
            );
        }

        console.log('🔍 Processing KIE.ai webhook:', {
            requestId: normalized.requestId,
            status: normalized.status,
            hasResult: !!normalized.result,
            hasError: !!normalized.error,
        });

        // 3. Check if this is a video job
        const [job] = await database
            .select()
            .from(falJobs)
            .where(eq(falJobs.requestId, normalized.requestId))
            .limit(1);

        if (job && job.type === 'video') {
            // Handle video webhook
            if (normalized.status === 'failed') {
                await database
                    .update(falJobs)
                    .set({
                        status: 'failed',
                        error: normalized.error || 'Unknown error',
                        completedAt: new Date(),
                    })
                    .where(eq(falJobs.id, job.id));

                return NextResponse.json({ success: true }, { status: 200 });
            }

            if (normalized.status === 'completed') {
                // Parse resultJson to get video URL
                let videoUrl: string | null = null;

                if (typeof normalized.result === 'string') {
                    try {
                        const parsed = JSON.parse(normalized.result);
                        videoUrl = parsed.resultUrls?.[0];
                    } catch {
                        console.error('❌ Failed to parse resultJson');
                    }
                } else if (normalized.result && typeof normalized.result === 'object') {
                    videoUrl = (normalized.result as any).resultUrls?.[0];
                }

                if (!videoUrl) {
                    console.error('❌ No video URL in result');
                    await database
                        .update(falJobs)
                        .set({
                            status: 'failed',
                            error: 'No video URL in result',
                            completedAt: new Date(),
                        })
                        .where(eq(falJobs.id, job.id));

                    return NextResponse.json({ error: 'No video URL' }, { status: 400 });
                }

                try {
                    const permanentUrl = await uploadVideoToStorage(videoUrl, job.userId);

                    await database
                        .update(falJobs)
                        .set({
                            status: 'completed',
                            result: {
                                video: { url: permanentUrl },
                            },
                            completedAt: new Date(),
                        })
                        .where(eq(falJobs.id, job.id));

                    console.log('✅ Video job completed');

                    // Atualizar o nó do projeto com o vídeo (similar às imagens)
                    const jobInput = job.input as any;
                    if (jobInput?._metadata?.projectId && jobInput?._metadata?.nodeId) {
                        console.log('[KIE Webhook] Updating project node with video:', {
                            projectId: jobInput._metadata.projectId,
                            nodeId: jobInput._metadata.nodeId,
                            videoUrl: permanentUrl,
                        });

                        try {
                            await updateProjectNodeWithVideo(
                                jobInput._metadata.projectId,
                                jobInput._metadata.nodeId,
                                permanentUrl
                            );
                            console.log('[KIE Webhook] Project node updated successfully');
                        } catch (updateError) {
                            console.error('[KIE Webhook] Failed to update project node:', updateError);
                            // Não falhar o webhook se a atualização do projeto falhar
                        }
                    }

                    return NextResponse.json({ success: true }, { status: 200 });
                } catch (uploadError) {
                    console.error('❌ Failed to upload video:', uploadError);
                    await database
                        .update(falJobs)
                        .set({
                            status: 'failed',
                            error: `Upload failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`,
                            completedAt: new Date(),
                        })
                        .where(eq(falJobs.id, job.id));

                    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
                }
            }
        }

        // 4. Handle image webhook (existing logic)
        console.log('🖼️ [KIE Webhook] Processing as image webhook:', {
            requestId: normalized.requestId,
            status: normalized.status,
        });

        const result = await processImageWebhook(normalized);

        console.log('✅ [KIE Webhook] Image webhook processed:', result);

        // 5. Retornar resposta
        return NextResponse.json({
            message: result.message,
            status: result.status,
            imageUrl: result.imageUrl,
        });
    } catch (error) {
        const message = parseError(error);
        console.error('❌ Webhook error:', message);

        return NextResponse.json({ error: message }, { status: 500 });
    }
}
