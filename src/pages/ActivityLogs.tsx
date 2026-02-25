import React from 'react';
import { ActivityLogs } from '@/components/admin/ActivityLogs';
import { useAuth } from '@/contexts/AuthContext';

export default function ActivityLogsPage() {
    const { businessId } = useAuth();

    if (!businessId) return null;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary">Activity Audit Log</h1>
                <p className="text-sm text-muted-foreground">
                    Detailed history of all actions performed by users in the system.
                </p>
            </div>

            <ActivityLogs businessId={businessId} />
        </div>
    );
}
