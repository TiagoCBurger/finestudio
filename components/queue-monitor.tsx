'use client';

import { useState } from 'react';
import { List, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQueueMonitor } from '@/hooks/use-queue-monitor';
import { QueueItem } from '@/components/queue-monitor/queue-item';
import { Skeleton } from '@/components/ui/skeleton';

interface QueueMonitorProps {
    userId: string;
    projectId?: string;
}

type QueueFilter = 'all' | 'pending' | 'completed' | 'failed';

/**
 * QueueMonitor Component
 * 
 * Displays a button with badge showing active job count.
 * Opens a modal with detailed job list when clicked.
 * Styled to match existing top-right buttons (Menu component).
 */
export function QueueMonitor({ userId, projectId }: QueueMonitorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [filter, setFilter] = useState<QueueFilter>('all');

    const {
        jobs,
        activeCount,
        isLoading,
        removeJob,
        clearCompleted,
        clearFailed,
    } = useQueueMonitor({ userId, projectId });

    // Filter jobs based on selected tab
    const filteredJobs = jobs.filter((job) => {
        switch (filter) {
            case 'pending':
                return job.status === 'pending';
            case 'completed':
                return job.status === 'completed';
            case 'failed':
                return job.status === 'failed';
            default:
                return true;
        }
    });

    const handleClearCompleted = () => {
        clearCompleted();
        // If we're on the completed tab and cleared all, switch to all
        if (filter === 'completed' && filteredJobs.length === jobs.filter(j => j.status === 'completed').length) {
            setFilter('all');
        }
    };

    const handleClearFailed = () => {
        clearFailed();
        // If we're on the failed tab and cleared all, switch to all
        if (filter === 'failed' && filteredJobs.length === jobs.filter(j => j.status === 'failed').length) {
            setFilter('all');
        }
    };

    return (
        <>
            {/* Queue Indicator Button */}
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="relative rounded-full"
                            onClick={() => setIsOpen(true)}
                            aria-label={`Fila de requisições, ${activeCount} ativas`}
                            aria-expanded={isOpen}
                        >
                            <List className="size-4" />
                            {activeCount > 0 && (
                                <Badge
                                    variant="default"
                                    className="absolute -top-1 -right-1 size-5 flex items-center justify-center p-0 text-[10px]"
                                    aria-label={`${activeCount} requisições ativas`}
                                >
                                    {activeCount}
                                </Badge>
                            )}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        {activeCount === 0 ? 'Nenhuma requisição em andamento' : `${activeCount} ${activeCount === 1 ? 'requisição' : 'requisições'} em andamento`}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            {/* Queue Modal */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Fila de Requisições</DialogTitle>
                    </DialogHeader>

                    <Tabs value={filter} onValueChange={(value) => setFilter(value as QueueFilter)} className="flex-1 flex flex-col overflow-hidden">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="all" className="flex items-center gap-1.5">
                                <List className="size-3.5" />
                                <span className="hidden sm:inline">Todas</span>
                            </TabsTrigger>
                            <TabsTrigger value="pending" className="flex items-center gap-1.5">
                                <Clock className="size-3.5" />
                                <span className="hidden sm:inline">Pendentes</span>
                            </TabsTrigger>
                            <TabsTrigger value="completed" className="flex items-center gap-1.5">
                                <CheckCircle2 className="size-3.5" />
                                <span className="hidden sm:inline">Completadas</span>
                            </TabsTrigger>
                            <TabsTrigger value="failed" className="flex items-center gap-1.5">
                                <XCircle className="size-3.5" />
                                <span className="hidden sm:inline">Erros</span>
                            </TabsTrigger>
                        </TabsList>

                        <div className="flex-1 overflow-hidden mt-4">
                            <TabsContent value={filter} className="h-full m-0">
                                <ScrollArea className="h-[calc(80vh-200px)]">
                                    {isLoading ? (
                                        <div className="space-y-3">
                                            {[1, 2, 3].map((i) => (
                                                <div key={i} className="flex items-start gap-3 rounded-lg border bg-card p-3">
                                                    <Skeleton className="size-8 rounded" />
                                                    <div className="flex-1 space-y-2">
                                                        <Skeleton className="h-4 w-3/4" />
                                                        <Skeleton className="h-3 w-1/2" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : filteredJobs.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 text-center">
                                            <div className="rounded-full bg-muted p-3 mb-4">
                                                {filter === 'pending' && <Clock className="size-6 text-muted-foreground" />}
                                                {filter === 'completed' && <CheckCircle2 className="size-6 text-muted-foreground" />}
                                                {filter === 'failed' && <XCircle className="size-6 text-muted-foreground" />}
                                                {filter === 'all' && <List className="size-6 text-muted-foreground" />}
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {filter === 'all' && 'Nenhuma requisição na fila'}
                                                {filter === 'pending' && 'Nenhuma requisição pendente'}
                                                {filter === 'completed' && 'Nenhuma requisição completada'}
                                                {filter === 'failed' && 'Nenhuma requisição com erro'}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3 pr-4">
                                            {filteredJobs.map((job) => (
                                                <QueueItem
                                                    key={job.id}
                                                    job={job}
                                                    onRemove={removeJob}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </ScrollArea>
                            </TabsContent>
                        </div>
                    </Tabs>

                    <DialogFooter className="flex-row gap-2 sm:gap-2">
                        <Button
                            variant="outline"
                            onClick={handleClearCompleted}
                            disabled={jobs.filter(j => j.status === 'completed').length === 0}
                            className="flex-1 sm:flex-initial"
                        >
                            Limpar Completadas
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleClearFailed}
                            disabled={jobs.filter(j => j.status === 'failed').length === 0}
                            className="flex-1 sm:flex-initial"
                        >
                            Limpar Erros
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
