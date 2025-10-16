export class StorageError extends Error {
    constructor(message: string, public readonly provider: string) {
        super(message);
        this.name = 'StorageError';
    }
}

export class StorageConfigError extends StorageError {
    constructor(message: string, provider: string) {
        super(message, provider);
        this.name = 'StorageConfigError';
    }
}

export class StorageUploadError extends StorageError {
    constructor(message: string, provider: string, public readonly cause?: Error) {
        super(message, provider);
        this.name = 'StorageUploadError';
    }
}

export class StorageAuthError extends StorageError {
    constructor(message: string, provider: string) {
        super(message, provider);
        this.name = 'StorageAuthError';
    }
}
