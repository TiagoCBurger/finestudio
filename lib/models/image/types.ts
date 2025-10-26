/**
 * Tipos compartilhados para geração de imagens
 * Define estados, erros e estruturas de dados comuns
 */

/**
 * Estados possíveis de um nó de imagem
 */
export type ImageNodeState =
    | { status: 'idle' }
    | { status: 'generating'; requestId: string; jobId: string; modelId: string }
    | { status: 'loading_image'; url: string }
    | { status: 'ready'; url: string; timestamp: string }
    | { status: 'error'; error: ImageGenerationError };

/**
 * Tipos de erro na geração de imagem
 */
export type ImageGenerationError =
    | { type: 'validation'; message: string; canRetry: false }
    | { type: 'api'; message: string; canRetry: true; statusCode?: number }
    | { type: 'network'; message: string; canRetry: true }
    | { type: 'timeout'; message: string; canRetry: true }
    | { type: 'node_deleted'; message: string; canRetry: false; silent: true }
    | { type: 'project_deleted'; message: string; canRetry: false; silent: true }
    | { type: 'webhook'; message: string; canRetry: false };

/**
 * Resultado da submissão de um job
 */
export interface JobSubmissionResult {
    requestId: string;
    jobId: string;
    webhookUrl?: string;
    mode: 'webhook' | 'polling';
}

/**
 * Input para geração de imagem
 */
export interface ImageGenerationInput {
    prompt: string;
    modelId: string;
    size?: string;
    images?: string[]; // Para edit mode
    strength?: number; // Para edit mode
    metadata: {
        nodeId: string;
        projectId: string;
        userId: string;
    };
}

/**
 * Resultado da geração de imagem
 */
export interface ImageGenerationResult {
    state: ImageNodeState;
    nodeData: {
        state: ImageNodeState;
        updatedAt: string;
    };
}

/**
 * Payload do webhook (normalizado)
 */
export interface WebhookPayload {
    requestId: string;
    status: 'pending' | 'completed' | 'failed';
    result?: {
        images?: Array<{ url: string }>;
        [key: string]: unknown;
    };
    error?: string;
}

/**
 * Job no banco de dados
 */
export interface FalJob {
    id: string;
    requestId: string;
    userId: string;
    modelId: string;
    type: 'image' | 'video';
    status: 'pending' | 'completed' | 'failed';
    input: {
        prompt?: string;
        _metadata?: {
            nodeId: string;
            projectId: string;
        };
        [key: string]: unknown;
    } | null;
    result: {
        images?: Array<{ url: string }>;
        [key: string]: unknown;
    } | null;
    error: string | null;
    createdAt: string;
    completedAt: string | null;
}

/**
 * Configuração do provider
 */
export interface ProviderConfig {
    apiKey: string;
    webhookUrl?: string;
    timeout?: number;
}

/**
 * Metadados do job para atualização do projeto
 */
export interface JobMetadata {
    nodeId: string;
    projectId: string;
}
