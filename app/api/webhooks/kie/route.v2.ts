/**
 * Kie.ai Webhook Route (v2)
 * 
 * Refactored webhook using ImageWebhookHandler for cleaner code.
 * Handles image generation completion/failure from Kie.ai.
 */

import { NextRequest, NextResponse } from 'next/server';
import { database } from '@/lib/database';
import { falJobs } from '@/schema';
import { eq } from 'drizzle-orm';
import { parseError } from '@/lib/error/parse';
import { getStorageProvider } from '@/lib/storage/factory';
import { nanoid } from 'nanoid';
import { ImageWebhookHandler } from '@/lib/webhooks/image-webhook-handler';

/**
 * Kie.ai webhook payload structure
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
 * Status constants
 */
const STATUS = {
    PENDING: 'pending' as const,
    COMPLETED: 'completed' as const,
    FAILED: 'failed' as const,
    SUCCESS: 'success' as const,
    ERROR: 'error' as const,
};

/**
 * Extract request ID from Kie webhook payload
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
 * Normalize Kie webhook status
 */
function normalizeStatus(payload: KieWebhookPayload): 'pending' | 'completed' | 'failed' {
    const rawStatus = (
        payload.status ||
        payload.state ||
        payload.data?.state ||
        ''
    ).toLowerCase();

    if (rawStatus === STATUS.COMPLETED || rawStatus === STATUS.SUCCESS) {
        return STATUS.COMPLETED;
    }

    if (rawStatus === STATUS.FAILED || rawStatus === STATUS.ERROR || payload.error) {
        return STATUS.FAILED;
    }

    return STATUS.PENDING;
}

/**
 * Extract error message from Kie webhook payload
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
 * Extract image URL from Kie result
 */
function extractImageUrl(result: unknown): string | null {
    if (!result) {
        return null;
    }

    // If result is a string (like resultJson), try to parse it
    if (typeof result === 'string') {
        try {
            const parsed = JSON.parse(result);
            if (parsed.resultUrls && Array.isArray(parsed.resultUrls) && parsed.resultUrls.length > 0) {
                return parsed.resultUrls[0];
            }
            return extractImageUrl(parsed);
        } catch {
            if (result.startsWith('http')) {
                return result;
            }
            return null;
        }
    }

    if (typeof result !== 'object') {
        return null;
    }

    const resultObj = result as any;

    // Check for resultUrls array (KIE format)
    if (Array.isArray(resultObj.resultUrls) && resultObj.resultUrls.length > 0) {
        return resultObj.resultUrls[0];
    }

    // Check for images array
    if (Array.isArray(resultObj.images) && resultObj.images.length > 0) {
        const item = resultObj.images[0];
        return typeof item === 'string' ? item : item?.url || null;
    }

    // Check for output array
    if (Array.isArray(resultObj.output) && resultObj.output.length > 0) {
        const item = resultObj.output[0];
        return typeof item === 'string' ? item : item?.url || null;
    }

    // Check for output string
    if (typeof resultObj.output === 'string') {
        return resultObj.output;
    }

    return null;
}

/**
 * Upload image from URL to permanent storage
 */
async function uploadImageToStorage(
    imageUrl: string,
    userId: string
): Promise<string> {
    console.log('[Kie Webhook] Uploading image to storage...');

    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.status}`);
    }

    const imageArrayBuffer = await imageResponse.arrayBuffer();
    const imageBuffer = Buffer.from(imageArrayBuffer);
    console.log('[Kie Webhook] Image downloaded, size:', imageBuffer.length, 'bytes');

    const storage = getStorageProvider();
    const fileName = `${nanoid()}.png`;

    const uploadResult = await storage.upload(
        userId,
        'files',
        fileName,
        imageBuffer,
        {
            contentType: 'image/png',
            upsert: false,
        }
    );

    console.log('[Kie Webhook] Image uploaded to storage:', uploadResult.url);
    return uploadResult.url;
}

/**
 * POST /api/webhooks/kie
 * 
 * Handles webhooks from Kie.ai for image generation.
 */
export async function POST(request: NextRequest) {
    try {
        // Parse request body
        const rawBody = await request.text();

        if (!rawBody || rawBody.trim() === '') {
            console.error('[Kie Webhook] Empty body received');
            return NextResponse.json(
                { error: 'Empty request body' },
                { status: 400 }
            );
        }

        let body: KieWebhookPayload;
        try {
            body = JSON.parse(rawBody) as KieWebhookPayload;
        } catch (parseError) {
            console.error('[Kie Webhook] Failed to parse JSON:', parseError);
            return NextResponse.json(
                { error: 'Invalid JSON in request body' },
                { status: 400 }
            );
        }

        console.log('[Kie Webhook] Received:', {
            hasBody: !!body,
            bodyKeys: Object.keys(body || {}),
        });

        // Extract request ID
        const requestId = extractRequestId(body);
        if (!requestId) {
            console.error('[Kie Webhook] Missing request ID in payload');
            return NextResponse.json(
                { error: 'Missing request ID in webhook payload' },
                { status: 400 }
            );
        }

        // Normalize status
        const status = normalizeStatus(body);
        const error = extractError(body);

        console.log('[Kie Webhook] Processing:', {
            requestId,
            status,
            hasError: !!error,
        });

        // Find job by request ID
        const [job] = await database
            .select()
            .from(falJobs)
            .where(eq(falJobs.requestId, requestId))
            .limit(1);

        if (!job) {
            console.warn('[Kie Webhook] Job not found:', requestId);
            return NextResponse.json(
                { error: 'Job not found' },
                { status: 404 }
            );
        }

        // Handle based on status
        if (status === STATUS.PENDING) {
            console.log('[Kie Webhook] Job still pending, no action needed');
            return NextResponse.json({
                message: 'Status received but not final',
                status: STATUS.PENDING,
            });
        }

        if (status === STATUS.FAILED) {
            console.error('[Kie Webhook] Job failed:', error || 'Unknown error');

            const handler = new ImageWebhookHandler();
            await handler.handleFailure(job.id, error || 'Unknown error from KIE.ai');

            return NextResponse.json({
                message: 'Job marked as failed',
                status: STATUS.FAILED,
                error,
            });
        }

        if (status === STATUS.COMPLETED) {
            console.log('[Kie Webhook] Job completed successfully');

            // Extract result
            const result = body.resultJson || body.data?.resultJson || body.result || body.data;

            // Extract image URL
            const imageUrl = extractImageUrl(result);

            if (!imageUrl) {
                console.warn('[Kie Webhook] No image URL found in result');

                await database
                    .update(falJobs)
                    .set({
                        status: STATUS.COMPLETED,
                        result,
                        completedAt: new Date(),
                    })
                    .where(eq(falJobs.id, job.id));

                return NextResponse.json({
                    message: 'Job completed but no image URL found',
                    status: STATUS.COMPLETED,
                });
            }

            console.log('[Kie Webhook] Extracted image URL:', imageUrl.substring(0, 50) + '...');

            // Upload to permanent storage
            try {
                const permanentUrl = await uploadImageToStorage(imageUrl, job.userId);

                // Use handler to update project
                const handler = new ImageWebhookHandler();
                const handlerResult = await handler.handleCompletion(job.id, permanentUrl);

                if (!handlerResult.success && !handlerResult.silent) {
                    console.error('[Kie Webhook] Handler failed:', handlerResult.message);
                }

                console.log('[Kie Webhook] ✅ Webhook processing complete');

                return NextResponse.json({
                    message: 'Webhook processed successfully',
                    status: STATUS.COMPLETED,
                    imageUrl: permanentUrl,
                });
            } catch (uploadError) {
                console.error('[Kie Webhook] Failed to process image:', uploadError);

                await database
                    .update(falJobs)
                    .set({
                        status: STATUS.FAILED,
                        error: `Processing failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`,
                        completedAt: new Date(),
                    })
                    .where(eq(falJobs.id, job.id));

                return NextResponse.json(
                    {
                        message: 'Job processing failed',
                        status: STATUS.FAILED,
                        error: uploadError instanceof Error ? uploadError.message : 'Unknown error',
                    },
                    { status: 500 }
                );
            }
        }

        // Unknown status
        console.warn('[Kie Webhook] Unknown status:', status);
        return NextResponse.json(
            {
                message: 'Unknown status received',
                status,
            },
            { status: 400 }
        );
    } catch (error) {
        const message = parseError(error);
        console.error('[Kie Webhook] Error:', message);

        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
