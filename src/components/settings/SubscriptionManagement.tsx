import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, CreditCard, Sparkles, Clock, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function SubscriptionManagement() {
    const { subscription, planName, isTrial, isActive, isExpired, historyLimitDays, canExport } = useSubscription();

    // Fetch available plans
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

    const handleUpgrade = (plan: any) => {
        toast.info(`To upgrade to ${plan.name}, please contact our sales team or system admin.`);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-700 border-green-200';
            case 'trialing': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'expired': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className="space-y-6">
            {/* Current Subscription Status */}
            <Card className="overflow-hidden border-2 border-primary/10">
                <CardHeader className="bg-muted/30 pb-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <CreditCard className="h-5 w-5 text-primary" />
                                Current Plan: {planName}
                            </CardTitle>
                            <CardDescription>Your business subscription status and details</CardDescription>
                        </div>
                        <Badge className={getStatusColor(subscription?.status || 'trialing')}>
                            {subscription?.status?.toUpperCase() || 'FREE TRIAL'}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                Period Status
                            </p>
                            <p className="text-sm">
                                {isTrial ? (
                                    <>Trial ends on <strong>{subscription?.trial_end ? format(new Date(subscription.trial_end), 'MMM dd, yyyy HH:mm') : 'N/A'}</strong></>
                                ) : (
                                    <>Valid until <strong>{subscription?.current_period_end ? format(new Date(subscription.current_period_end), 'MMM dd, yyyy HH:mm') : 'N/A'}</strong></>
                                )}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Sparkles className="h-4 w-4" />
                                History Limit
                            </p>
                            <p className="text-sm">
                                {historyLimitDays === -1 ? 'Unlimited History' : `${historyLimitDays} Days Retention`}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Check className="h-4 w-4" />
                                Advanced Features
                            </p>
                            <p className="text-sm">
                                {canExport ? (
                                    <span className="text-green-600 font-medium">Exports Unlocked</span>
                                ) : (
                                    <span className="text-muted-foreground">Exports Locked</span>
                                )}
                            </p>
                        </div>
                    </div>

                    {isExpired && (
                        <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <p className="text-sm font-bold text-red-800">Your subscription has expired</p>
                                <p className="text-xs text-red-700">Bill creation and full history access are currently restricted. Please upgrade to resume operations.</p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Available Plans */}
            <div className="space-y-4">
                <h3 className="text-lg font-bold tracking-tight">Upgrade Options</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {plans.map((plan) => (
                        <Card key={plan.id} className={`flex flex-col ${plan.name.includes('Yearly') ? 'border-primary shadow-md relative' : ''}`}>
                            {plan.name.includes('Yearly') && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                                    Best Value
                                </div>
                            )}
                            <CardHeader>
                                <CardTitle>{plan.name}</CardTitle>
                                <div className="mt-2 flex items-baseline gap-1">
                                    <span className="text-3xl font-bold">₹{plan.price}</span>
                                    <span className="text-sm text-muted-foreground capitalize">/ {plan.billing_period.replace('_', ' ')}</span>
                                </div>
                                <CardDescription className="mt-2">{plan.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <ul className="space-y-2.5 text-sm">
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-green-500 shrink-0" />
                                        <span>Full Billing History</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-green-500 shrink-0" />
                                        <span>Advanced Reports & PDF</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-green-500 shrink-0" />
                                        <span>Unlimited Data Export</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-green-500 shrink-0" />
                                        <span>24/7 Priority Support</span>
                                    </li>
                                </ul>
                            </CardContent>
                            <div className="p-6 pt-0 mt-auto">
                                <Button
                                    className="w-full"
                                    variant={plan.name.includes('Yearly') ? 'default' : 'outline'}
                                    onClick={() => handleUpgrade(plan)}
                                >
                                    Choose {plan.name}
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>

            <p className="text-center text-xs text-muted-foreground pt-4">
                Need a custom plan for multiple branches? <Button variant="link" className="h-auto p-0 text-xs text-primary">Contact Sales</Button>
            </p>
        </div>
    );
}
