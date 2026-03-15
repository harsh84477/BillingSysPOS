import React from 'react';
import { ExpenseTracker } from '@/components/expenses/ExpenseTracker';
import { useAuth } from '@/contexts/AuthContext';

export default function Expenses() {
    const { businessId } = useAuth();

    if (!businessId) return null;

    return (
        <div className="w-full space-y-3">
            <div>
                <h1 className="spos-page-heading">Expense Management</h1>
                <p className="spos-page-subhead">
                    Track business expenses and monitor overall profitability.
                </p>
            </div>

            <ExpenseTracker businessId={businessId} />
        </div>
    );
}
