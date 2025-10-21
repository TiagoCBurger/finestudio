import { NextRequest, NextResponse } from 'next/server';
import { database } from '@/lib/database';
import { falJobs, projects } from '@/schema';
import { eq } from 'drizzle-orm';
import { parseError } from '@/lib/error/parse';
import { getStorageProvider } from '@/lib/storage/factory';
import { nanoid } from 'nanoid';

// Constants
const IMAGE_CONTENT_TYPE = 'image/png' as const;
const STORAGE_BUCKET = 'files' as const;
const RAW_BODY_PREVIEW_LENGTH = 200;
const ERROR_BODY_PREVIEW_LENGTH = 500;

// Status constants for consistency
const STATUS = {
    PENDING: 'pending' as const,
    COMPLETED: 'completed' as const,
    FAILED: 'failed' as const,
    SUCCESS: 'success' as const,
    ERROR: 'error' as const,
} as const;

/**
 * Job metadata stored in job.input
 */
interface JobMetadata {
    nodeId?: string;
    projectId?: string;
}

/**
 * Job input structure with metadata
 */
interface JobInput {
    _metadata?: JobMetadata;
    [key: string]: unknown;
}

/**
 * Project node structure
 */
interface ProjectNode {
    id: string;
    type: string;
    data: {
        generated?: {
            url: string;
            type: string;
        };
        loading?: boolean;
        status?: string;
        requestId?: string;
        updatedAt?: string;
        [key: string]: unknown;
    };
    [key: string]: unknown;
}

/**
 * Project content structure
 */
interface ProjectContent {
    nodes: ProjectNode[];
    edges: unknown[];
    viewport: unknown;
}

/**
 * KIE.ai webhook payload structure
 * KIE can send data in multiple formats, so we need to handle all variations
 */
interface KieWebhookPayload {
    // Request identifiers (can be at root or nested in data)
    taskId?: string;
    recordId?: string;
    id?: string;
    data?: {
        taskId?: string;
        recordId?: string;
        state?: string; // KIE sends status here
        images?: Array<{ url: string } | string>;
        output?: Array<{ url: string } | string> | string;
        resultJson?: string; // KIE sends results here
        [key: string]: unknown;
    };

    // Status fields (KIE uses different naming conventions)
    status?: string;
    state?: string;

    // Result data
    result?: {
        images?: Array<{ url: string } | string>;
        output?: Array<{ url: string } | string> | string;
        [key: string]: unknown;
    };

    // KIE specific result format (JSON string)
    resultJson?: string;

    // Error information
    error?: string | { message: string; code?: string };

    // Additional fields
    [key: string]: unknown;
}

/**
 * Normalized webhook data after extraction
 */
interface NormalizedWebhookData {
    requestId: string;
    status: 'pending' | 'completed' | 'failed';
    result: unknown;
    error: string | null;
}

/**
 * Result object with possible image formats
 */
interface KieResult {
    resultUrls?: string[]; // KIE format from parsed resultJson
    images?: Array<{ url: string } | string>;
    output?: Array<{ url: string } | string> | string;
    [key: string]: unknown;
}

/**
 * Extract request ID from KIE webhook payload
 * KIE can send the ID in multiple locations, so we check all possibilities
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
 * Normalize KIE webhook status to our internal status format
 * KIE uses 'success' while we use 'completed'
 * Status can be in payload.status, payload.state, or payload.data.state
 */
function normalizeStatus(payload: KieWebhookPayload): 'pending' | 'completed' | 'failed' {
    const rawStatus = (
        payload.status ||
        payload.state ||
        payload.data?.state ||
        ''
    ).toLowerCase();

    // Map KIE status values to our internal format
    if (rawStatus === STATUS.COMPLETED || rawStatus === STATUS.SUCCESS) {
        return STATUS.COMPLETED;
    }

    if (rawStatus === STATUS.FAILED || rawStatus === STATUS.ERROR || payload.error) {
        return STATUS.FAILED;
    }

    return STATUS.PENDING;
}

// Error message constants
const ERROR_MESSAGES = {
    UNKNOWN_KIE_ERROR: 'Unknown error from KIE.ai',
    EMPTY_BODY: 'Empty request body',
    INVALID_JSON: 'Invalid JSON in request body',
    FAILED_READ_BODY: 'Failed to read request body',
    MISSING_REQUEST_ID: 'Missing request ID in webhook payload',
    JOB_NOT_FOUND: 'Job not found',
} as const;

/**
 * Extract error message from KIE webhook payload
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

    return ERROR_MESSAGES.UNKNOWN_KIE_ERROR;
}

/**
 * Extract result data from KIE webhook payload
 * KIE sends results in resultJson (string) or result/data objects
 */
function extractResult(payload: KieWebhookPayload): unknown {
    // Check for resultJson first (KIE format)
    if (payload.resultJson) {
        return payload.resultJson; // Will be parsed in extractImageUrl
    }

    // Check data.resultJson
    if (payload.data && 'resultJson' in payload.data) {
        return payload.data.resultJson;
    }

    // Fallback to result or data
    return payload.result || payload.data || null;
}

/**
 * Normalize KIE webhook payload into a consistent format
 */
function normalizeWebhookPayload(payload: KieWebhookPayload): NormalizedWebhookData | null {
    const requestId = extractRequestId(payload);

    if (!requestId) {
        return null;
    }

    return {
        requestId,
        status: normalizeStatus(payload),
        result: extractResult(payload),
        error: extractError(payload),
    };
}

/**
 * Helper to extract URL from array item (string or object with url property)
 */
function extractUrlFromArrayItem(item: unknown): string | null {
    if (typeof item === 'string') {
        return item;
    }
    if (typeof item === 'object' && item !== null && 'url' in item) {
        return (item as { url: string }).url;
    }
    return null;
}

/**
 * Helper to extract URL from array (first valid item)
 */
function extractUrlFromArray(arr: unknown): string | null {
    if (!Array.isArray(arr) || arr.length === 0) {
        return null;
    }
    return extractUrlFromArrayItem(arr[0]);
}

/**
 * Extract image URL from KIE result
 * KIE can return images in multiple formats:
 * - resultJson: "{\"resultUrls\":[\"url\"]}" (string that needs parsing)
 * - images: [{ url: "..." }] or ["url"]
 * - output: [{ url: "..." }] or ["url"] or "url"
 */
function extractImageUrl(result: unknown): string | null {
    if (!result) {
        return null;
    }

    // If result is a string (like resultJson), try to parse it
    if (typeof result === 'string') {
        try {
            const parsed = JSON.parse(result);
            // Check for resultUrls array (KIE format)
            if (parsed.resultUrls && Array.isArray(parsed.resultUrls) && parsed.resultUrls.length > 0) {
                return parsed.resultUrls[0];
            }
            // Recursively check parsed object
            return extractImageUrl(parsed);
        } catch {
            // If parsing fails, might be a direct URL
            if (result.startsWith('http')) {
                return result;
            }
            return null;
        }
    }

    if (typeof result !== 'object') {
        return null;
    }

    const resultObj = result as KieResult;

    // Check for resultUrls array (KIE format from parsed resultJson)
    const resultUrlsUrl = extractUrlFromArray(resultObj.resultUrls);
    if (resultUrlsUrl) return resultUrlsUrl;

    // Check for images array
    const imagesUrl = extractUrlFromArray(resultObj.images);
    if (imagesUrl) return imagesUrl;

    // Check for output array
    const outputArrayUrl = extractUrlFromArray(resultObj.output);
    if (outputArrayUrl) return outputArrayUrl;

    // Check for output string
    if (typeof resultObj.output === 'string') {
        return resultObj.output;
    }

    return null;
}

/**
 * Upload image from URL to storage
 */
async function uploadImageToStorage(
    imageUrl: string,
    userId: string
): Promise<{ url: string; type: string }> {
    console.log('📤 Uploading image to storage...');

    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.status}`);
    }

    const imageArrayBuffer = await imageResponse.arrayBuffer();
    const imageBuffer = Buffer.from(imageArrayBuffer);
    console.log('✅ Image downloaded, size:', imageBuffer.length, 'bytes');

    const storage = getStorageProvider();
    const fileName = `${nanoid()}.png`;

    const uploadResult = await storage.upload(
        userId,
        STORAGE_BUCKET,
        fileName,
        imageBuffer,
        {
            contentType: IMAGE_CONTENT_TYPE,
            upsert: false,
        }
    );

    console.log('✅ Image uploaded to storage:', uploadResult.url);
    return uploadResult;
}

/**
 * Update job with completed result
 */
async function updateJobWithResult(jobId: string, imageUrl: string): Promise<void> {
    await database
        .update(falJobs)
        .set({
            status: STATUS.COMPLETED,
            result: {
                images: [{ url: imageUrl }],
            },
            completedAt: new Date(),
        })
        .where(eq(falJobs.id, jobId));
}

/**
 * Mark job as failed with error message
 */
async function markJobAsFailed(jobId: string, errorMessage: string): Promise<void> {
    await database
        .update(falJobs)
        .set({
            status: STATUS.FAILED,
            error: errorMessage,
            completedAt: new Date(),
        })
        .where(eq(falJobs.id, jobId));
}

/**
 * Update project node with generated image
 * Returns success status and message
 */
async function updateProjectNode(
    job: { id: string; input: unknown },
    imageUrl: string
): Promise<{ success: boolean; message: string }> {
    const jobInput = job.input as JobInput;
    const nodeId = jobInput?._metadata?.nodeId;
    const projectId = jobInput?._metadata?.projectId;

    if (!nodeId || !projectId) {
        console.log('ℹ️ No project metadata found, skipping project update');
        return { success: true, message: 'Job completed (no project update needed)' };
    }

    console.log('📝 Updating project node with permanent URL...');

    const project = await database.query.projects.findFirst({
        where: eq(projects.id, projectId),
    });

    if (!project) {
        console.warn('⚠️ Project not found:', projectId);
        return { success: false, message: 'Job completed but project not found' };
    }

    const content = project.content as ProjectContent;

    if (!content || !Array.isArray(content.nodes)) {
        console.error('❌ Invalid project content structure');
        return { success: false, message: 'Job completed but invalid project structure' };
    }

    const targetNode = content.nodes.find((n) => n.id === nodeId);
    if (!targetNode) {
        console.warn('⚠️ Target node not found:', nodeId);

        await markJobAsFailed(
            job.id,
            `Target node ${nodeId} not found in project ${projectId}. Node may have been deleted.`
        );

        return { success: false, message: 'Job completed but node not found' };
    }

    // Update node with permanent URL
    const updatedNodes = content.nodes.map((node): ProjectNode => {
        if (node.id === nodeId) {
            return {
                ...node,
                data: {
                    ...node.data,
                    generated: {
                        url: imageUrl,
                        type: IMAGE_CONTENT_TYPE,
                    },
                    loading: false,
                    status: undefined,
                    requestId: undefined,
                    updatedAt: new Date().toISOString(),
                },
            };
        }
        return node;
    });

    // Save updated project (triggers Supabase Realtime broadcast)
    await database
        .update(projects)
        .set({
            content: {
                ...content,
                nodes: updatedNodes,
            },
            updatedAt: new Date(), // Triggers realtime broadcast
        })
        .where(eq(projects.id, projectId));

    console.log('✅ Project node updated successfully, realtime should trigger now');
    return { success: true, message: 'Project updated successfully' };
}

/**
 * Parse and validate webhook request body
 * Handles empty bodies and invalid JSON with detailed logging
 */
async function parseWebhookBody(request: NextRequest): Promise<
    { success: true; body: KieWebhookPayload } |
    { success: false; response: NextResponse }
> {
    try {
        const rawBody = await request.text();

        console.log('🔔 KIE.ai webhook received (raw):', {
            hasContent: !!rawBody,
            contentLength: rawBody.length,
            contentPreview: rawBody.substring(0, RAW_BODY_PREVIEW_LENGTH),
        });

        if (!rawBody || rawBody.trim() === '') {
            console.error('❌ KIE.ai webhook: Empty body received');
            return {
                success: false,
                response: NextResponse.json(
                    { error: ERROR_MESSAGES.EMPTY_BODY },
                    { status: 400 }
                ),
            };
        }

        let body: KieWebhookPayload;
        try {
            body = JSON.parse(rawBody) as KieWebhookPayload;
        } catch (parseError) {
            console.error('❌ KIE.ai webhook: Failed to parse JSON:', {
                error: parseError instanceof Error ? parseError.message : 'Unknown error',
                rawBody: rawBody.substring(0, ERROR_BODY_PREVIEW_LENGTH),
            });
            return {
                success: false,
                response: NextResponse.json(
                    { error: ERROR_MESSAGES.INVALID_JSON },
                    { status: 400 }
                ),
            };
        }

        console.log('🔔 KIE.ai webhook parsed:', {
            hasBody: !!body,
            bodyKeys: Object.keys(body || {}),
            fullBody: JSON.stringify(body, null, 2),
        });

        return { success: true, body };
    } catch (error) {
        console.error('❌ KIE.ai webhook error reading request:', error);
        return {
            success: false,
            response: NextResponse.json(
                { error: ERROR_MESSAGES.FAILED_READ_BODY },
                { status: 400 }
            ),
        };
    }
}

/**
 * Job record from database
 */
interface JobRecord {
    id: string;
    userId: string;
    modelId: string;
    type: string;
    status: string;
    input: unknown;
    [key: string]: unknown;
}

/**
 * Find job by request ID
 */
async function findJobByRequestId(requestId: string): Promise<JobRecord | undefined> {
    const [job] = await database
        .select()
        .from(falJobs)
        .where(eq(falJobs.requestId, requestId))
        .limit(1);

    if (job) {
        console.log('✅ Found job:', {
            jobId: job.id,
            userId: job.userId,
            modelId: job.modelId,
            type: job.type,
            currentStatus: job.status,
        });
    }

    return job as JobRecord | undefined;
}

/**
 * Handle pending status webhook
 * 
 * When KIE.ai sends a pending status, we acknowledge it but don't update the database.
 * The job remains in its current state until a final status (completed/failed) is received.
 * 
 * @returns NextResponse with pending status acknowledgment
 */
async function handlePendingStatus(): Promise<NextResponse> {
    console.log('⏳ Job still pending, no action needed');
    return NextResponse.json({
        message: 'Status received but not final',
        status: STATUS.PENDING
    });
}

/**
 * Handle failed status webhook
 * 
 * Marks the job as failed in the database and returns an error response.
 * The error message from KIE.ai is stored for debugging purposes.
 * 
 * @param jobId - Database ID of the job to mark as failed
 * @param error - Error message from KIE.ai (null if not provided)
 * @returns NextResponse with failed status and error details
 */
async function handleFailedStatus(
    jobId: string,
    error: string | null
): Promise<NextResponse> {
    console.error('❌ Job failed:', error || 'Unknown error');

    await database
        .update(falJobs)
        .set({
            status: STATUS.FAILED,
            error: error || 'Unknown error from KIE.ai',
            completedAt: new Date(),
        })
        .where(eq(falJobs.id, jobId));

    return NextResponse.json({
        message: 'Job marked as failed',
        status: STATUS.FAILED,
        error
    });
}

/**
 * Handle completed status webhook
 * 
 * Processes a successful job completion:
 * 1. Extracts the image URL from the result
 * 2. Downloads and uploads the image to permanent storage (R2/Supabase)
 * 3. Updates the job record with the permanent URL
 * 4. Updates the project node to display the generated image
 * 5. Triggers Supabase Realtime broadcast for multi-window sync
 * 
 * @param job - Job record from database
 * @param result - Result data from KIE.ai webhook
 * @returns NextResponse with completion status and image URL
 */
async function handleCompletedStatus(
    job: JobRecord,
    result: unknown
): Promise<NextResponse> {
    console.log('✅ Job completed successfully, processing result...');

    // Extract image URL from result
    const imageUrl = extractImageUrl(result);

    if (!imageUrl) {
        console.warn('⚠️ No image URL found in result');

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
            status: STATUS.COMPLETED
        });
    }

    console.log('🖼️ Extracted image URL:', imageUrl.substring(0, 50) + '...');

    // Upload image to storage and update project
    try {
        const uploadResult = await uploadImageToStorage(imageUrl, job.userId);
        await updateJobWithResult(job.id, uploadResult.url);

        console.log('🔄 Calling updateProjectNode...');
        const projectUpdateResult = await updateProjectNode(job, uploadResult.url);
        console.log('📊 Project update result:', projectUpdateResult);

        if (!projectUpdateResult.success) {
            console.warn('⚠️ Project update was not successful:', projectUpdateResult.message);
            return NextResponse.json({
                message: projectUpdateResult.message,
                status: STATUS.COMPLETED
            });
        }

        console.log('✅ Webhook processing complete, returning success response');
        return NextResponse.json({
            message: 'Webhook processed successfully',
            status: STATUS.COMPLETED,
            imageUrl: uploadResult.url
        });

    } catch (uploadError) {
        console.error('❌ Failed to process image:', uploadError);

        await markJobAsFailed(
            job.id,
            `Processing failed: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`
        );

        return NextResponse.json({
            message: 'Job processing failed',
            status: STATUS.FAILED,
            error: uploadError instanceof Error ? uploadError.message : 'Unknown error'
        }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    // TODO: Add webhook signature verification for production security
    // Verify that the webhook is actually from KIE.ai by checking a signature header
    // Example: const signature = request.headers.get('x-kie-signature');
    // if (!verifySignature(signature, body)) { return 401 }

    // Parse request body with validation
    const parseResult = await parseWebhookBody(request);
    if (!parseResult.success) {
        return parseResult.response;
    }
    const body = parseResult.body;

    try {
        // Normalize the webhook payload
        const normalized = normalizeWebhookPayload(body);

        if (!normalized) {
            console.error('❌ KIE.ai webhook: Missing request ID in payload');
            return NextResponse.json(
                { error: ERROR_MESSAGES.MISSING_REQUEST_ID },
                { status: 400 }
            );
        }

        const { requestId, status, result, error } = normalized;

        console.log('🔍 Processing KIE.ai webhook:', {
            requestId,
            status,
            hasResult: !!result,
            hasError: !!error,
        });

        // Find job in database
        const job = await findJobByRequestId(requestId);

        if (!job) {
            console.warn('⚠️ KIE.ai webhook: Job not found for request ID:', requestId);
            return NextResponse.json(
                { error: ERROR_MESSAGES.JOB_NOT_FOUND },
                { status: 404 }
            );
        }

        // Route to appropriate handler based on status
        switch (status) {
            case STATUS.PENDING:
                return handlePendingStatus();

            case STATUS.FAILED:
                return handleFailedStatus(job.id, error);

            case STATUS.COMPLETED:
                return handleCompletedStatus(job, result);

            default:
                console.warn('⚠️ Unknown status:', status);
                return NextResponse.json({
                    message: 'Unknown status received',
                    status
                }, { status: 400 });
        }

    } catch (error) {
        const message = parseError(error);
        console.error('❌ KIE.ai webhook error:', message);

        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
