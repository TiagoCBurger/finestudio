'use client';

import { getCreditBalance } from '@/lib/credits/transactions';
import { useUser } from '@/hooks/use-user';
import { CoinsIcon, Loader2Icon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from './ui/tooltip';

interface CreditBalance {
    total: number;
    used: number;
    available: number;
}

export const CreditsDisplay = () => {
    const user = useUser();
    const [balance, setBalance] = useState<CreditBalance | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadBalance = async () => {
            if (!user) return;

            try {
                // Chamada para API route (não direct server action)
                const response = await fetch('/api/credits/balance');
                const data = await response.json();

                if (data.success) {
                    setBalance(data.balance);
                }
            } catch (error) {
                console.error('Failed to load credit balance:', error);
            } finally {
                setLoading(false);
            }
        };

        loadBalance();
    }, [user]);

    if (!user || loading) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted">
                <Loader2Icon className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading...</span>
            </div>
        );
    }

    if (!balance) {
        return null;
    }

    const isLowCredits = balance.available < 10;
    const isOutOfCredits = balance.available <= 0;

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${isOutOfCredits
                            ? 'bg-destructive text-destructive-foreground'
                            : isLowCredits
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                : 'bg-muted hover:bg-muted/80'
                        }`}>
                        <CoinsIcon className="h-4 w-4" />
                        <span className="text-sm font-medium">
                            {balance.available.toLocaleString()}
                        </span>
                        {isLowCredits && (
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-6 px-2 text-xs"
                                onClick={() => {
                                    // Redirecionar para página de compra de créditos
                                    window.location.href = '/credits/purchase';
                                }}
                            >
                                Buy More
                            </Button>
                        )}
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <div className="text-sm">
                        <div>Available: {balance.available.toLocaleString()}</div>
                        <div>Used: {balance.used.toLocaleString()}</div>
                        <div>Total: {balance.total.toLocaleString()}</div>
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};