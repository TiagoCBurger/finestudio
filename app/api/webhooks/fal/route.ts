/**
 * Fal.ai Webhook Route (v2)
 * 
 * Refactored webhook using unified webhook handler.
 * Handles image and video generation completion/failure.
 */

import { parseError } from '@/lib/error/parse';
import { database } from '@/lib/database';
import { falJobs } from '@/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { getStorageProvider } from '@/lib/storage/factory';
import { processImageWebhook } from '@/lib/webhooks/image-webhook-handler';
import type { WebhookPayload } from '@/lib/models/image/types';

/**
 * Fal.ai webhook payload structure
 */
type FalWebhookPayload = {
    request_id: string;
    status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'OK' | 'ERROR';
    response_url?: string;
    error?: string;
    logs?: Array<{ message: string; level: string; timestamp: string }>;
    images?: Array<{ url: string }>;
    video?: { url: string };
    [key: string]: any;
};

/**
 * Upload image from URL to permanent storage
 */
async function uploadImageToStorage(
    imageUrl: string,
    userId: string
): Promise<string> {
    console.log('[Fal Webhook] Uploading image to storage...');

    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.status}`);
    }

    const imageArrayBuffer = await imageResponse.arrayBuffer();
    const imageBuffer = Buffer.from(imageArrayBuffer);
    console.log('[Fal Webhook] Image downloaded, size:', imageBuffer.length, 'bytes');

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

    console.log('[Fal Webhook] Image uploaded to storage:', uploadResult.url);
    return uploadResult.url;
}

/**
 * Upload video from URL to permanent storage
 */
async function uploadVideoToStorage(
    videoUrl: string,
    userId: string
): Promise<string> {
    console.log('[Fal Webhook] Uploading video to storage...');

    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
        throw new Error(`Failed to fetch video: ${videoResponse.status}`);
    }

    const videoArrayBuffer = await videoResponse.arrayBuffer();
    const videoBuffer = Buffer.from(videoArrayBuffer);
    console.log('[Fal Webhook] Video downloaded, size:', videoBuffer.length, 'bytes');

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

    console.log('[Fal Webhook] Video uploaded to storage:', uploadResult.url);
    return uploadResult.url;
}

/**
 * POST /api/webhooks/fal
 * 
 * Handles webhooks from Fal.ai for image and video generation.
 */
export const POST = async (req: Request) => {
    try {
        const payload: FalWebhookPayload = await req.json();

        console.log('[Fal Webhook] Received:', {
            request_id: payload.request_id,
            status: payload.status,
            has_response_url: !!payload.response_url,
            has_error: !!payload.error,
        });

        // Log detailed error info for 422 errors
        if (payload.status === 'ERROR' && payload.error?.includes('422')) {
            const detail = (payload as any).payload?.detail;
            console.log('[Fal Webhook] 422 Error details:', JSON.stringify(detail, null, 2));
        }

        // Find job by request ID
        const [job] = await database
            .select()
            .from(falJobs)
            .where(eq(falJobs.requestId, payload.request_id))
            .limit(1);

        if (!job) {
            console.warn('[Fal Webhook] Job not found:', payload.request_id);
            return NextResponse.json(
                { error: 'Job not found' },
                { status: 404 }
            );
        }

        // Handle error/failure
        if (payload.status === 'ERROR' || payload.status === 'FAILED') {
            const errorMessage = payload.error || 'Unknown error';
            const errorDetail = (payload as any).payload?.detail;

            console.error('[Fal Webhook] Job failed:', {
                request_id: payload.request_id,
                error: errorMessage,
                detail: errorDetail,
            });

            // Use unified handler for images
            if (job.type === 'image') {
                const normalizedPayload: WebhookPayload = {
                    requestId: payload.request_id,
                    status: 'failed',
                    error: `${errorMessage}${errorDetail ? ` - ${JSON.stringify(errorDetail)}` : ''}`,
                };

                await processImageWebhook(normalizedPayload);
            } else {
                // Video: just mark as failed
                await database
                    .update(falJobs)
                    .set({
                        status: 'failed',
                        error: `${errorMessage}${errorDetail ? ` - ${JSON.stringify(errorDetail)}` : ''}`,
                        completedAt: new Date(),
                    })
                    .where(eq(falJobs.id, job.id));
            }

            return NextResponse.json({ success: true }, { status: 200 });
        }

        // Handle completion
        if (payload.status === 'COMPLETED' || payload.status === 'OK') {
            // Get result (either from response_url or directly in payload)
            let result;
            if (payload.response_url) {
                const resultResponse = await fetch(payload.response_url);
                result = await resultResponse.json();
            } else {
                const payloadData = (payload as any).payload;
                result = {
                    images: payloadData?.images || payload.images,
                    video: payloadData?.video || payload.video,
                    ...Object.fromEntries(
                        Object.entries(payload).filter(
                            ([key]) =>
                                !['request_id', 'status', 'error', 'logs', 'payload', 'gateway_request_id'].includes(
                                    key
                                )
                        )
                    ),
                };
            }

            console.log('[Fal Webhook] Result received:', {
                hasImages: !!result.images,
                hasVideo: !!result.video,
                imageCount: result.images?.length,
            });

            // Upload to permanent storage
            if (job.type === 'image' && result.images?.[0]?.url) {
                try {
                    const imageUrl = result.images[0].url;
                    const permanentUrl = await uploadImageToStorage(imageUrl, job.userId);

                    // Use unified handler to update project
                    const normalizedPayload: WebhookPayload = {
                        requestId: payload.request_id,
                        status: 'completed',
                        result: {
                            images: [{ url: permanentUrl }],
                        },
                    };

                    const handlerResult = await processImageWebhook(normalizedPayload);

                    if (!handlerResult.success) {
                        console.error('[Fal Webhook] Handler failed:', handlerResult.message);
                    }
                } catch (uploadError) {
                    console.error('[Fal Webhook] Failed to upload image:', uploadError);
                    // Continue anyway - job will be marked as completed
                }
            } else if (job.type === 'video' && result.video?.url) {
                try {
                    const videoUrl = result.video.url;
                    const permanentUrl = await uploadVideoToStorage(videoUrl, job.userId);

                    // Update job with permanent URL
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

                    console.log('[Fal Webhook] Video job completed');
                } catch (uploadError) {
                    console.error('[Fal Webhook] Failed to upload video:', uploadError);
                    // Mark as failed
                    await database
                        .update(falJobs)
                        .set({
                            status: 'failed',
                            error: `Upload failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`,
                            completedAt: new Date(),
                        })
                        .where(eq(falJobs.id, job.id));
                }
            }

            return NextResponse.json({ success: true }, { status: 200 });
        }

        // Unknown status
        console.warn('[Fal Webhook] Unknown status:', payload.status);
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        const message = parseError(error);
        console.error('[Fal Webhook] Error:', message);

        return NextResponse.json(
            {
                error: {
                    http_code: 500,
                    message,
                },
            },
            { status: 500 }
        );
    }
};
