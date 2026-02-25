import React from 'react';
import { ExpenseTracker } from '@/components/expenses/ExpenseTracker';
import { useAuth } from '@/contexts/AuthContext';

export default function Expenses() {
    const { businessId } = useAuth();

    if (!businessId) return null;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary">Expense Management</h1>
                <p className="text-sm text-muted-foreground">
                    Track business expenses and monitor overall profitability.
                </p>
            </div>

            <ExpenseTracker businessId={businessId} />
        </div>
    );
}
