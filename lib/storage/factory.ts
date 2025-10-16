import type { StorageProvider } from './types';
import { r2Storage } from './r2';
import { supabaseStorage } from './supabase';
import { StorageConfigError } from './errors';

export type StorageProviderType = 'r2' | 'supabase';

export function getStorageProvider(): StorageProvider {
    const providerType = (process.env.STORAGE_PROVIDER || 'r2') as StorageProviderType;

    // Validate provider type
    if (providerType !== 'r2' && providerType !== 'supabase') {
        throw new StorageConfigError(
            `Unknown storage provider: '${providerType}'. Valid options are: 'r2', 'supabase'`,
            providerType
        );
    }

    try {
        switch (providerType) {
            case 'r2':
                return r2Storage;
            case 'supabase':
                return supabaseStorage;
            default:
                throw new StorageConfigError(
                    `Unknown storage provider: '${providerType}'. Valid options are: 'r2', 'supabase'`,
                    providerType
                );
        }
    } catch (error) {
        if (error instanceof StorageConfigError) {
            throw error;
        }
        if (error instanceof Error) {
            throw new StorageConfigError(
                `Failed to initialize storage provider '${providerType}': ${error.message}`,
                providerType
            );
        }
        throw new StorageConfigError(
            `Failed to initialize storage provider '${providerType}': Unknown error`,
            providerType
        );
    }
}
