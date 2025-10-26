/**
 * Estado Ready - Imagem carregada e pronta
 */

import Image from 'next/image';
import { useState } from 'react';
import { toast } from 'sonner';

interface ReadyStateProps {
    url: string;
    timestamp: string;
    onLoadComplete?: () => void;
}

export function ReadyState({ url, timestamp, onLoadComplete }: ReadyStateProps) {
    const [isLoading, setIsLoading] = useState(true);

    return (
        <>
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-secondary/50 rounded-b-xl">
                    <div className="animate-pulse text-xs text-muted-foreground">
                        Loading image...
                    </div>
                </div>
            )}
            <Image
                key={`${url}-${timestamp}`}
                src={url}
                alt="Generated image"
                width={1000}
                height={1000}
                className="w-full rounded-b-xl object-cover"
                unoptimized={true}
                priority={true}
                onLoad={() => {
                    console.log('✅ Image loaded successfully:', url);
                    setIsLoading(false);
                    onLoadComplete?.();
                }}
                onError={(error) => {
                    console.error('❌ Failed to load image:', { url, error });
                    setIsLoading(false);
                    toast.error('Failed to load image - please try regenerating');
                }}
                onLoadStart={() => {
                    console.log('🔄 Starting to load image:', url);
                    setIsLoading(true);
                }}
            />
        </>
    );
}
