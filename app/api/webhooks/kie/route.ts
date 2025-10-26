/**
 * Webhook handler para KIE.ai (Refatorado)
 * Processa callbacks da API KIE.ai usando handler unificado
 */

import { NextRequest, NextResponse } from 'next/server';
import { parseError } from '@/lib/error/parse';
import { processImageWebhook } from '@/lib/webhooks/image-webhook-handler';
import type { WebhookPayload } from '@/lib/models/image/types';

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
 * POST handler para webhook KIE.ai
 */
export async function POST(request: NextRequest) {
    try {
        // 1. Parsear body
        const parseResult = await parseWebhookBody(request);
        if (!parseResult.success) {
            return NextResponse.json({ error: parseResult.error }, { status: 400 });
        }

        const body = parseResult.body;

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

        // 3. Processar webhook usando handler unificado
        const result = await processImageWebhook(normalized);

        console.log('✅ Webhook processed:', result);

        // 4. Retornar resposta
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
