/**
 * Utilitário para detectar e regenerar URLs de storage expiradas
 */

import { r2Storage } from './r2';
import { supabaseStorage } from './supabase';
import type { StorageBucket } from './types';

export interface UrlRefreshOptions {
    userId: string;
    bucket: StorageBucket;
    filename: string;
    contentType: string;
    currentUrl: string;
}

/**
 * Verifica se uma URL está expirada ou inacessível
 */
export async function isUrlExpired(url: string): Promise<boolean> {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return !response.ok;
    } catch {
        return true;
    }
}

/**
 * Detecta se uma URL é uma URL assinada do Cloudflare R2
 */
export function isR2SignedUrl(url: string): boolean {
    return url.includes('r2.cloudflarestorage.com') && url.includes('X-Amz-Signature');
}

/**
 * Detecta se uma URL é do Supabase Storage
 */
export function isSupabaseStorageUrl(url: string): boolean {
    return url.includes('supabase.co/storage/v1/object/public/');
}

/**
 * Extrai informações de uma URL de storage para regeneração
 */
export function parseStorageUrl(url: string): {
    provider: 'r2' | 'supabase' | 'unknown';
    bucket?: string;
    userId?: string;
    filename?: string;
} {
    if (isR2SignedUrl(url)) {
        // Parse R2 URL: https://account.r2.cloudflarestorage.com/bucket/files/userId/filename.ext?...
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/').filter(Boolean);

        if (pathParts.length >= 4) {
            return {
                provider: 'r2',
                bucket: pathParts[1] as StorageBucket,
                userId: pathParts[2],
                filename: pathParts[3],
            };
        }
    }

    if (isSupabaseStorageUrl(url)) {
        // Parse Supabase URL: https://project.supabase.co/storage/v1/object/public/bucket/userId/filename.ext
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/').filter(Boolean);

        if (pathParts.length >= 6) {
            return {
                provider: 'supabase',
                bucket: pathParts[4] as StorageBucket,
                userId: pathParts[5],
                filename: pathParts[6],
            };
        }
    }

    return { provider: 'unknown' };
}

/**
 * Regenera uma URL expirada
 * Nota: Isso só funciona para URLs assinadas do R2. 
 * Para URLs públicas ou do Supabase, não é necessário regenerar.
 */
export async function refreshExpiredUrl(options: UrlRefreshOptions): Promise<string | null> {
    const { currentUrl } = options;

    // Só regenerar se for uma URL assinada do R2
    if (!isR2SignedUrl(currentUrl)) {
        console.log('URL não é uma URL assinada do R2, não precisa regenerar');
        return null;
    }

    // Verificar se realmente está expirada
    const expired = await isUrlExpired(currentUrl);
    if (!expired) {
        console.log('URL ainda está válida');
        return null;
    }

    console.log('🔄 Regenerando URL expirada do R2...');

    try {
        // Criar um buffer vazio para simular o arquivo (não vamos re-upload)
        // Em uma implementação real, você precisaria ter acesso ao arquivo original
        // ou implementar um endpoint específico para regenerar URLs

        // Por enquanto, retornamos null para indicar que não foi possível regenerar
        // A solução recomendada é configurar URLs públicas no R2
        console.warn('⚠️ Regeneração de URL não implementada. Configure URLs públicas no R2.');
        return null;

    } catch (error) {
        console.error('❌ Erro ao regenerar URL:', error);
        return null;
    }
}

/**
 * Hook para usar no React para detectar e lidar com URLs expiradas
 */
export function useUrlRefresh() {
    const checkAndRefreshUrl = async (url: string): Promise<string | null> => {
        if (!url) return null;

        const expired = await isUrlExpired(url);
        if (!expired) return url;

        const urlInfo = parseStorageUrl(url);

        if (urlInfo.provider === 'r2' && isR2SignedUrl(url)) {
            console.warn('⚠️ URL do R2 expirada detectada. Recomendação: configure URLs públicas no R2');
            return null;
        }

        return url;
    };

    return { checkAndRefreshUrl, isUrlExpired, isR2SignedUrl, isSupabaseStorageUrl };
}