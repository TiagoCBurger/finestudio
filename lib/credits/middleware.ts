import { currentUser } from '@/lib/auth';
import { calculateDynamicCost, getModelCost } from './costs';
import { debitCredits, getCreditBalance } from './transactions';

/**
 * HOF que protege actions que consomem créditos
 * USO: const protectedAction = withCreditCheck(originalAction, modelId, params);
 */
export const withCreditCheck = <T extends any[], R>(
    action: (...args: T) => Promise<R>,
    modelId: string,
    costParams?: {
        resolution?: string;
        duration?: number;
        quality?: string;
    }
) => {
    return async (...args: T): Promise<R> => {
        // 1. Verificar autenticação
        const user = await currentUser();
        if (!user) {
            throw new Error('Authentication required');
        }

        // 2. Calcular custo
        const cost = costParams
            ? calculateDynamicCost(modelId, costParams)
            : getModelCost(modelId);

        // 3. Verificar saldo ANTES de executar
        const balance = await getCreditBalance(user.id);
        if (balance.available < cost) {
            throw new Error(`Insufficient credits. Required: ${cost}, Available: ${balance.available}`);
        }

        // 4. Debitar créditos ANTES da execução (fail-safe)
        const debitResult = await debitCredits({
            userId: user.id,
            amount: -cost,
            type: 'usage',
            modelUsed: modelId,
            description: `Used ${modelId} model`,
            metadata: {
                costParams,
                args: args.length > 0 ? 'hidden' : undefined // Não logar dados sensíveis
            }
        });

        try {
            // 5. Executar a action original
            const result = await action(...args);

            // 6. Sucesso - créditos já foram debitados
            return result;

        } catch (error) {
            // 7. ERRO - Reembolsar créditos automaticamente
            await debitCredits({
                userId: user.id,
                amount: cost, // Positivo = reembolso
                type: 'refund',
                modelUsed: modelId,
                description: `Refund for failed ${modelId} operation`,
                metadata: {
                    originalTransactionId: debitResult.transaction.id,
                    error: error instanceof Error ? error.message : 'Unknown error'
                }
            });

            throw error; // Re-throw o erro original
        }
    };
};

/**
 * Decorator para actions que consomem créditos
 */
export const requireCredits = (modelId: string, costParams?: any) => {
    return function <T extends any[], R>(
        target: any,
        propertyKey: string,
        descriptor: TypedPropertyDescriptor<(...args: T) => Promise<R>>
    ) {
        const originalMethod = descriptor.value!;

        descriptor.value = withCreditCheck(originalMethod, modelId, costParams);

        return descriptor;
    };
};