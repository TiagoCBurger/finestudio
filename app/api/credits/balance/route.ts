import { currentUser } from '@/lib/auth';
import { getCreditBalance } from '@/lib/credits/transactions';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const user = await currentUser();

        if (!user) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401 }
            );
        }

        const balance = await getCreditBalance(user.id);

        return NextResponse.json({
            success: true,
            balance
        });
    } catch (error) {
        console.error('Error fetching credit balance:', error);

        return NextResponse.json(
            { error: 'Failed to fetch balance' },
            { status: 500 }
        );
    }
}