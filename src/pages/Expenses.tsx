/**
 * pages/Expenses.tsx — Expense Tracker Page
 *
 * Wrapper page for the ExpenseTracker component.
 * Tracks all business expenses (rent, salaries, utilities, supplies, etc.)
 * Features:
 *  - Add / edit / delete expense entries
 *  - Categories with icons and colors
 *  - Date, amount, description, payment method
 *  - Monthly expense summary
 *  - Used in P&L reports
 */
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
