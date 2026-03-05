import React from 'react';
import { ActivityLogs } from '@/components/admin/ActivityLogs';
import { useAuth } from '@/contexts/AuthContext';

export default function ActivityLogsPage() {
    const { businessId } = useAuth();

    if (!businessId) return null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
                <h1 className="spos-page-heading">Activity Audit Log</h1>
                <p className="spos-page-subhead">
                    Detailed history of all actions performed by users in the system.
                </p>
            </div>

            <ActivityLogs businessId={businessId} />
        </div>
    );
}
