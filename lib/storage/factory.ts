import type { StorageProvider } from './types';
import { r2Storage } from './r2';
import { supabaseStorage } from './supabase';
import { StorageConfigError } from './errors';

/**
 * Get the configured storage provider based on STORAGE_PROVIDER env var
 * 
 * Supported providers:
 * - 'r2': Cloudflare R2 (default, recommended for production)
 * - 'supabase': Supabase Storage (fallback option)
 * 
 * @throws {StorageConfigError} If provider is not configured or invalid
 */
export function getStorageProvider(): StorageProvider {
    const provider = process.env.STORAGE_PROVIDER || 'r2';

    switch (provider) {
        case 'r2':
            // Validate R2 configuration early
            validateR2Config();
            return r2Storage;

        case 'supabase':
            // Supabase uses the existing client configuration
            return supabaseStorage;

        default:
            throw new StorageConfigError(
                `Invalid STORAGE_PROVIDER: "${provider}". Must be "r2" or "supabase".`,
                provider
            );
    }
}

/**
 * Validate R2 configuration without initializing the client
 * Provides early feedback if credentials are missing
 */
function validateR2Config(): void {
    const requiredVars = [
        'R2_ACCOUNT_ID',
        'R2_ACCESS_KEY_ID',
        'R2_SECRET_ACCESS_KEY',
        'R2_BUCKET_NAME'
    ];

    const missing = requiredVars.filter(varName => !process.env[varName]);

    if (missing.length > 0) {
        throw new StorageConfigError(
            `R2 storage is not properly configured. Missing environment variables: ${missing.join(', ')}. ` +
            `Either configure R2 or set STORAGE_PROVIDER=supabase to use Supabase Storage.`,
            'r2'
        );
    }

    // Warn if public URL is not configured (will use signed URLs with expiration)
    if (!process.env.R2_PUBLIC_URL) {
        console.warn(
            '[Storage Factory] R2_PUBLIC_URL is not configured. ' +
            'Signed URLs will be used and will expire after 7 days. ' +
            'For production, configure R2_PUBLIC_URL or enable public access on your R2 bucket.'
        );
    }
}
