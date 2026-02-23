import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ShieldCheck } from 'lucide-react';
import SuperAdminLayout from '@/components/layout/SuperAdminLayout';

// Sub-modules
import DashboardTab from '@/components/super-admin/DashboardTab';
import BusinessTab from '@/components/super-admin/BusinessTab';
import SubscriptionTab from '@/components/super-admin/SubscriptionTab';
import UsersTab from '@/components/super-admin/UsersTab';
import PlansTab from '@/components/super-admin/PlansTab';
import LogsTab from '@/components/super-admin/LogsTab';

export default function SuperAdmin() {
    const { isSuperAdmin } = useAuth();
    const [activeTab, setActiveTab] = useState('dashboard');

    const { data: plans = [] } = useQuery({
        queryKey: ['subscription-plans'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('subscription_plans')
                .select('*')
                .eq('is_active', true)
                .order('price');
            if (error) throw error;
            return data;
        },
    });

    if (!isSuperAdmin) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#0f1117] text-white/40">
                <div className="text-center space-y-3">
                    <ShieldCheck className="h-12 w-12 mx-auto opacity-10" />
                    <p className="font-bold text-white/60">Access Denied</p>
                    <p className="text-sm">Super Admin privileges required.</p>
                </div>
            </div>
        );
    }

    const renderTab = () => {
        switch (activeTab) {
            case 'dashboard': return <DashboardTab />;
            case 'businesses': return <BusinessTab plans={plans} />;
            case 'subscriptions': return <SubscriptionTab />;
            case 'users': return <UsersTab />;
            case 'plans': return <PlansTab />;
            case 'logs': return <LogsTab />;
            default: return <DashboardTab />;
        }
    };

    return (
        <SuperAdminLayout activeTab={activeTab} onTabChange={setActiveTab}>
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
                {renderTab()}
            </div>
        </SuperAdminLayout>
    );
}
