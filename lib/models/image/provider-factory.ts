/**
 * Factory para criar providers de geração de imagem
 * Centraliza a criação e configuração de providers
 */

import { env } from '@/lib/env';
import { KieImageProvider } from './kie.server';
import type { ImageProviderBase } from './provider-base';

/**
 * Tipos de provider suportados
 */
export type ProviderType = 'kie' | 'fal';

/**
 * Mapa de providers
 */
const providers = new Map<string, ImageProviderBase>();

/**
 * Obter URL do webhook baseado no ambiente
 */
function getWebhookUrl(providerType: ProviderType): string | undefined {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!baseUrl) {
        return undefined;
    }

    return `${baseUrl}/api/webhooks/${providerType}`;
}

/**
 * Criar provider KIE
 */
function createKieProvider(): KieImageProvider {
    if (!env.KIE_API_KEY) {
        throw new Error('KIE_API_KEY is not configured');
    }

    const webhookUrl = getWebhookUrl('kie');

    if (!webhookUrl) {
        console.warn('⚠️ NEXT_PUBLIC_APP_URL not set, KIE provider will not work');
    }

    return new KieImageProvider({
        apiKey: env.KIE_API_KEY,
        webhookUrl,
    });
}

/**
 * Obter provider por tipo
 */
export function getImageProvider(providerType: ProviderType): ImageProviderBase {
    // Verificar se já existe instância em cache
    const cached = providers.get(providerType);
    if (cached) {
        return cached;
    }

    // Criar nova instância
    let provider: ImageProviderBase;

    switch (providerType) {
        case 'kie':
            provider = createKieProvider();
            break;

        case 'fal':
            throw new Error('Fal provider not implemented yet in v2');

        default:
            throw new Error(`Unknown provider type: ${providerType}`);
    }

    // Cachear instância
    providers.set(providerType, provider);

    return provider;
}

/**
 * Obter provider por model ID
 */
export function getProviderByModelId(modelId: string): ImageProviderBase {
    // Determinar provider baseado no model ID

    // KIE models: google/* ou kie-*
    if (modelId.startsWith('google/') || modelId.startsWith('kie-')) {
        return getImageProvider('kie');
    }

    // FAL models: fal-* ou fal-ai/*
    if (modelId.startsWith('fal-') || modelId.startsWith('fal-ai/')) {
        return getImageProvider('fal');
    }

    throw new Error(`Cannot determine provider for model: ${modelId}`);
}

/**
 * Limpar cache de providers (útil para testes)
 */
export function clearProviderCache(): void {
    providers.clear();
}
