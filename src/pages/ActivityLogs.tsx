import React from 'react';
import { ActivityLogs } from '@/components/admin/ActivityLogs';
import { useAuth } from '@/contexts/AuthContext';

export default function ActivityLogsPage() {
    const { businessId } = useAuth();

    if (!businessId) return null;

    return (
        <div className="h-full flex flex-col p-4 md:p-6 lg:p-8 animate-in fade-in duration-300">
            <ActivityLogs businessId={businessId} />
        </div>
    );
}
