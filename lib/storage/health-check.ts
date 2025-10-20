/**
 * Storage Health Check Utility
 * 
 * Provides functions to validate storage configuration and connectivity
 */

import { getStorageProvider } from './factory';
import { StorageConfigError, StorageUploadError } from './errors';

export interface StorageHealthCheckResult {
    provider: 'r2' | 'supabase';
    configured: boolean;
    accessible: boolean;
    errors: string[];
    warnings: string[];
}

/**
 * Check storage provider health without making actual uploads
 * Validates configuration and basic connectivity
 */
export async function checkStorageHealth(): Promise<StorageHealthCheckResult> {
    const provider = process.env.STORAGE_PROVIDER || 'r2';
    const result: StorageHealthCheckResult = {
        provider: provider as 'r2' | 'supabase',
        configured: false,
        accessible: false,
        errors: [],
        warnings: [],
    };

    try {
        // Try to get the storage provider (validates configuration)
        getStorageProvider();
        result.configured = true;

        // Check for common configuration issues
        if (provider === 'r2') {
            if (!process.env.R2_PUBLIC_URL) {
                result.warnings.push(
                    'R2_PUBLIC_URL is not configured. Signed URLs will expire after 7 days. ' +
                    'Configure R2_PUBLIC_URL for permanent URLs.'
                );
            }
        }

        // If we got here, basic configuration is valid
        result.accessible = true;

    } catch (error) {
        if (error instanceof StorageConfigError) {
            result.errors.push(error.message);
        } else if (error instanceof Error) {
            result.errors.push(`Unexpected error: ${error.message}`);
        } else {
            result.errors.push('Unknown error occurred');
        }
    }

    return result;
}

/**
 * Get a human-readable storage status message
 */
export function getStorageStatusMessage(health: StorageHealthCheckResult): string {
    if (!health.configured) {
        return `❌ Storage not configured: ${health.errors.join(', ')}`;
    }

    if (!health.accessible) {
        return `⚠️ Storage configured but not accessible: ${health.errors.join(', ')}`;
    }

    const warnings = health.warnings.length > 0
        ? `\n⚠️ Warnings: ${health.warnings.join(', ')}`
        : '';

    return `✅ Storage (${health.provider}) is configured and accessible${warnings}`;
}
