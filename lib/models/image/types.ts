/**
 * Image Generation Types
 * 
 * Defines the state machine and types for image generation workflow.
 * This provides a clear, type-safe way to track image generation status.
 */

/**
 * Image node state machine
 * 
 * States:
 * - idle: No image generated yet, waiting for user action
 * - generating: Job submitted to external API, waiting for webhook
 * - loading_image: Image URL received, loading from storage
 * - ready: Image loaded and displayed successfully
 * - error: Generation or loading failed
 */
export type ImageNodeState =
    | { status: 'idle' }
    | {
        status: 'generating';
        requestId: string;
        jobId: string;
        modelId: string;
        startedAt: string;
    }
    | {
        status: 'loading_image';
        url: string;
        requestId?: string;
        jobId?: string;
    }
    | {
        status: 'ready';
        url: string;
        type: string;
        generatedAt: string;
    }
    | {
        status: 'error';
        error: string;
        errorType: ImageGenerationErrorType;
        canRetry: boolean;
        failedAt: string;
    };

/**
 * Error types for image generation
 * 
 * - validation: Input validation failed (e.g., missing prompt)
 * - api: External API error (e.g., Fal.ai, Kie.ai)
 * - network: Network connectivity issue
 * - storage: Storage upload/download failed
 * - node_deleted: Node was deleted after job started (silent error)
 * - project_deleted: Project was deleted after job started (silent error)
 * - timeout: Operation timed out
 * - unknown: Unexpected error
 */
export type ImageGenerationErrorType =
    | 'validation'
    | 'api'
    | 'network'
    | 'storage'
    | 'node_deleted'
    | 'project_deleted'
    | 'timeout'
    | 'unknown';

/**
 * Structured error for image generation
 */
export interface ImageGenerationError {
    type: ImageGenerationErrorType;
    message: string;
    canRetry: boolean;
    silent: boolean; // If true, don't show toast to user
    originalError?: unknown;
}

/**
 * Result from image generation action
 */
export type ImageGenerationResult =
    | {
        success: true;
        state: ImageNodeState;
    }
    | {
        success: false;
        error: ImageGenerationError;
    };

/**
 * Job submission result from provider
 */
export interface JobSubmissionResult {
    requestId: string;
    jobId: string;
    status: 'pending' | 'completed';
    url?: string; // Only present if completed synchronously
    headers?: Record<string, string>;
}

/**
 * Input for image generation
 */
export interface ImageGenerationInput {
    prompt: string;
    modelId: string;
    instructions?: string;
    size?: string;
    nodeId: string;
    projectId: string;
    images?: string[]; // For image-to-image models
}

/**
 * Helper to create error objects
 */
export function createImageError(
    type: ImageGenerationErrorType,
    message: string,
    originalError?: unknown
): ImageGenerationError {
    // Determine if error should be silent (not shown to user)
    const silent = type === 'node_deleted' || type === 'project_deleted';

    // Determine if error is retryable
    const canRetry = type === 'api' || type === 'network' || type === 'timeout';

    return {
        type,
        message,
        canRetry,
        silent,
        originalError,
    };
}

/**
 * Helper to check if state is loading
 */
export function isLoadingState(state: ImageNodeState): boolean {
    return state.status === 'generating' || state.status === 'loading_image';
}

/**
 * Helper to check if state has image
 */
export function hasImage(state: ImageNodeState): boolean {
    return (
        state.status === 'ready' ||
        state.status === 'loading_image'
    );
}

/**
 * Helper to get image URL from state
 */
export function getImageUrl(state: ImageNodeState): string | null {
    if (state.status === 'ready' || state.status === 'loading_image') {
        return state.url;
    }
    return null;
}

/**
 * Helper to check if error should be shown to user
 */
export function shouldShowError(error: ImageGenerationError): boolean {
    return !error.silent;
}
