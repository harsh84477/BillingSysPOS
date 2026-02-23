import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
    LayoutDashboard,
    Building2,
    CreditCard,
    Users,
    Sparkles,
    ScrollText,
    ShieldCheck
} from 'lucide-react';

// Sub-modules
import DashboardTab from '@/components/super-admin/DashboardTab';
import BusinessTab from '@/components/super-admin/BusinessTab';
import SubscriptionTab from '@/components/super-admin/SubscriptionTab';
import UsersTab from '@/components/super-admin/UsersTab';
import PlansTab from '@/components/super-admin/PlansTab';
import LogsTab from '@/components/super-admin/LogsTab';

export default function SuperAdmin() {
    const { isSuperAdmin } = useAuth();

    // Fetch plans once at the shell level to pass down where needed
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
            <div className="flex h-full items-center justify-center text-muted-foreground">
                <div className="text-center space-y-2">
                    <ShieldCheck className="h-12 w-12 mx-auto opacity-20" />
                    <p className="font-bold">Access Denied</p>
                    <p className="text-sm">Super Admin privileges required.</p>
                </div>
            </div>
        );
    }

    const tabs = [
        {
            value: 'dashboard',
            label: 'Dashboard',
            icon: LayoutDashboard,
            content: <DashboardTab />,
        },
        {
            value: 'businesses',
            label: 'Businesses',
            icon: Building2,
            content: <BusinessTab plans={plans} />,
        },
        {
            value: 'subscriptions',
            label: 'Subscriptions',
            icon: CreditCard,
            content: <SubscriptionTab />,
        },
        {
            value: 'users',
            label: 'Users',
            icon: Users,
            content: <UsersTab />,
        },
        {
            value: 'plans',
            label: 'Plans',
            icon: Sparkles,
            content: <PlansTab />,
        },
        {
            value: 'logs',
            label: 'Logs',
            icon: ScrollText,
            content: <LogsTab />,
        },
    ];

    return (
        <div className="space-y-6 pb-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                        <ShieldCheck className="h-7 w-7 text-primary" />
                        Super Admin
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Platform-wide control center — all actions are logged.
                    </p>
                </div>
                <Badge variant="outline" className="text-xs font-mono px-3 py-1">
                    🔒 Restricted Access
                </Badge>
            </div>

            {/* Tabbed Shell */}
            <Tabs defaultValue="dashboard" className="space-y-6">
                <TabsList className="flex flex-wrap h-auto gap-1 p-1 bg-muted/50 rounded-xl w-full sm:w-auto sm:inline-flex">
                    {tabs.map((tab) => (
                        <TabsTrigger
                            key={tab.value}
                            value={tab.value}
                            className="gap-2 data-[state=active]:shadow-sm rounded-lg px-4 py-2"
                        >
                            <tab.icon className="h-4 w-4" />
                            <span className="hidden sm:inline">{tab.label}</span>
                        </TabsTrigger>
                    ))}
                </TabsList>

                {tabs.map((tab) => (
                    <TabsContent
                        key={tab.value}
                        value={tab.value}
                        className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                    >
                        {tab.content}
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
}
