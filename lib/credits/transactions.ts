'use server';

import { database } from '@/lib/database';
import { creditTransactions, profile } from '@/schema';
import { and, eq, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export type CreditTransactionType = 'usage' | 'purchase' | 'bonus' | 'refund';

interface CreateTransactionParams {
    userId: string;
    amount: number; // Negativo para débito, positivo para crédito
    type: CreditTransactionType;
    modelUsed?: string;
    description: string;
    metadata?: Record<string, any>;
}

/**
 * FUNÇÃO CRÍTICA: Debita créditos de forma atômica e segura
 * Esta função NUNCA deve ser chamada do frontend
 */
export const debitCredits = async (params: CreateTransactionParams) => {
    const { userId, amount, type, modelUsed, description, metadata } = params;

    if (amount >= 0) {
        throw new Error('Debit amount must be negative');
    }

    // Transação atômica no banco
    return await database.transaction(async (tx) => {
        // 1. Verificar saldo atual
        const userProfile = await tx.query.profile.findFirst({
            where: eq(profile.id, userId),
            columns: { credits: true, creditsUsed: true }
        });

        if (!userProfile) {
            throw new Error('User not found');
        }

        const availableCredits = userProfile.credits - userProfile.creditsUsed;
        const requiredCredits = Math.abs(amount);

        if (availableCredits < requiredCredits) {
            throw new Error(`Insufficient credits. Available: ${availableCredits}, Required: ${requiredCredits}`);
        }

        // 2. Atualizar créditos usados (ATOMICAMENTE)
        const updateResult = await tx
            .update(profile)
            .set({
                creditsUsed: sql`credits_used + ${requiredCredits}`,
                updatedAt: new Date()
            })
            .where(eq(profile.id, userId))
            .returning({ newCreditsUsed: profile.creditsUsed });

        if (updateResult.length === 0) {
            throw new Error('Failed to update credits');
        }

        // 3. Registrar transação para auditoria
        const transaction = await tx
            .insert(creditTransactions)
            .values({
                id: nanoid(),
                userId,
                amount,
                type,
                modelUsed,
                description,
                metadata: metadata ? JSON.stringify(metadata) : null,
            })
            .returning();

        return {
            success: true,
            transaction: transaction[0],
            newBalance: userProfile.credits - updateResult[0].newCreditsUsed
        };
    });
};

/**
 * Adiciona créditos (compra, bônus, etc)
 */
export const creditCredits = async (params: CreateTransactionParams) => {
    const { userId, amount, type, description, metadata } = params;

    if (amount <= 0) {
        throw new Error('Credit amount must be positive');
    }

    return await database.transaction(async (tx) => {
        // Adicionar créditos ao saldo
        const updateResult = await tx
            .update(profile)
            .set({
                credits: sql`credits + ${amount}`,
                updatedAt: new Date()
            })
            .where(eq(profile.id, userId))
            .returning({ newCredits: profile.credits });

        // Registrar transação
        const transaction = await tx
            .insert(creditTransactions)
            .values({
                id: nanoid(),
                userId,
                amount,
                type,
                modelUsed: null,
                description,
                metadata: metadata ? JSON.stringify(metadata) : null,
            })
            .returning();

        return {
            success: true,
            transaction: transaction[0],
            newBalance: updateResult[0].newCredits
        };
    });
};

/**
 * Consulta saldo de créditos (somente leitura)
 */
export const getCreditBalance = async (userId: string) => {
    const userProfile = await database.query.profile.findFirst({
        where: eq(profile.id, userId),
        columns: { credits: true, creditsUsed: true }
    });

    if (!userProfile) {
        throw new Error('User not found');
    }

    return {
        total: userProfile.credits,
        used: userProfile.creditsUsed,
        available: userProfile.credits - userProfile.creditsUsed
    };
};

/**
 * Histórico de transações do usuário
 */
export const getCreditHistory = async (userId: string, limit = 50) => {
    return await database.query.creditTransactions.findMany({
        where: eq(creditTransactions.userId, userId),
        orderBy: (transactions, { desc }) => [desc(transactions.createdAt)],
        limit
    });
};