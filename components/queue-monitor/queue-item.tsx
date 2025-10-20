'use client';

import { Clock, Loader2, CheckCircle2, XCircle, Image as ImageIcon, Video, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface FalJob {
    id: string;
    requestId: string;
    userId?: string;
    modelId: string;
    type: 'image' | 'video';
    status: 'pending' | 'completed' | 'failed';
    input: {
        prompt?: string;
        _metadata?: {
            nodeId: string;
            projectId: string;
        };
        [key: string]: any;
    } | null;
    result: {
        images?: Array<{ url: string }>;
        video?: { url: string };
        [key: string]: any;
    } | null;
    error: string | null;
    createdAt: Date | string;
    completedAt: Date | string | null;
}

interface QueueItemProps {
    job: FalJob;
    onRemove: (jobId: string) => void;
    onNavigate?: (nodeId: string) => void;
}

export function QueueItem({ job, onRemove, onNavigate }: QueueItemProps) {
    const getStatusIcon = () => {
        switch (job.status) {
            case 'pending':
                return <Loader2 className="size-4 animate-spin text-blue-500" />;
            case 'completed':
                return <CheckCircle2 className="size-4 text-green-500" />;
            case 'failed':
                return <XCircle className="size-4 text-red-500" />;
            default:
                return <Clock className="size-4 text-yellow-500" />;
        }
    };

    const getTypeIcon = () => {
        return job.type === 'image' ? (
            <ImageIcon className="size-4 text-muted-foreground" />
        ) : (
            <Video className="size-4 text-muted-foreground" />
        );
    };

    const getTimeElapsed = () => {
        const createdAt = new Date(job.createdAt);
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - createdAt.getTime()) / 1000);

        if (job.status === 'completed' && job.completedAt) {
            const completedAt = new Date(job.completedAt);
            const totalTime = Math.floor((completedAt.getTime() - createdAt.getTime()) / 1000);
            return formatTime(totalTime);
        }

        return formatTime(elapsed);
    };

    const formatTime = (seconds: number) => {
        if (seconds < 60) {
            return `${seconds}s`;
        }
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds}s`;
    };

    const getThumbnailUrl = () => {
        if (job.status !== 'completed' || !job.result) return null;

        if (job.type === 'image' && job.result.images?.[0]?.url) {
            return job.result.images[0].url;
        }

        if (job.type === 'video' && job.result.video?.url) {
            return job.result.video.url;
        }

        return null;
    };

    const thumbnailUrl = getThumbnailUrl();
    const nodeId = job.input?._metadata?.nodeId;

    return (
        <div className="flex items-start gap-3 rounded-lg border bg-card p-3 shadow-xs">
            <div className="flex items-center gap-2">
                {getStatusIcon()}
                {getTypeIcon()}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                            {job.type === 'image' ? 'Imagem' : 'Vídeo'} - {job.modelId}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {job.status === 'pending' && `Processando... ${getTimeElapsed()}`}
                            {job.status === 'completed' && `Completado em ${getTimeElapsed()}`}
                            {job.status === 'failed' && 'Erro'}
                        </p>
                    </div>

                    {(job.status === 'completed' || job.status === 'failed') && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-6 shrink-0"
                            onClick={() => onRemove(job.id)}
                            aria-label="Remover"
                        >
                            <X className="size-3" />
                        </Button>
                    )}
                </div>

                {job.status === 'failed' && job.error && (
                    <p className="text-xs text-red-500 mt-1 line-clamp-2">
                        {job.error}
                    </p>
                )}

                {thumbnailUrl && (
                    <div className="mt-2">
                        {job.type === 'image' ? (
                            <img
                                src={thumbnailUrl}
                                alt="Preview"
                                className="w-full h-20 object-cover rounded"
                            />
                        ) : (
                            <video
                                src={thumbnailUrl}
                                className="w-full h-20 object-cover rounded"
                                muted
                                playsInline
                            />
                        )}
                    </div>
                )}

                {job.status === 'completed' && nodeId && onNavigate && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 w-full"
                        onClick={() => onNavigate(nodeId)}
                    >
                        Ver no canvas
                    </Button>
                )}
            </div>
        </div>
    );
}
