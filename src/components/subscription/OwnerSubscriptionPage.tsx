import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function OwnerSubscriptionPage({ businessId = 1 }) { // defaulting to 1 for demo
    const [subscriptionInfo, setSubscriptionInfo] = useState(null);
    const [allPlans, setAllPlans] = useState([]);
    
    const API_URL = 'http://localhost:5000/api';

    useEffect(() => {
        // Fetch current subscription
        fetch(`${API_URL}/subscriptions/my-subscription/${businessId}`)
            .then(r => r.json())
            .then(data => setSubscriptionInfo(data));

        // Fetch all plans for comparison
        fetch(`${API_URL}/plans`)
            .then(r => r.json())
            .then(data => setAllPlans(data));
    }, [businessId]);

    const handleUpgrade = (planId) => {
        // Mock upgrade action. In real app, this goes to payment gateway Native/Razorpay.
        toast.info(`Preparing upgrade to plan ID ${planId}... (Simulated Payment)`);
    };

    if (!subscriptionInfo || !allPlans.length) return <div className="p-4">Loading subscription data...</div>;

    const { hasSubscription, subscription, features } = subscriptionInfo;

    return (
        <div className="space-y-8 max-w-6xl mx-auto p-4">
            <h2 className="text-2xl font-bold tracking-tight">Your Subscription Settings</h2>
            
            {/* Current Plan Overview */}
            <Card className="border-2 border-primary/20">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Current Plan: {hasSubscription ? subscription.plan_name : 'No Active Plan'}</CardTitle>
                            <CardDescription>
                                {hasSubscription 
                                  ? `Status: ${subscription.status.toUpperCase()}` 
                                  : 'Please upgrade to unlock features'}
                            </CardDescription>
                        </div>
                        {hasSubscription && (
                            <Badge className={subscription.status === 'active' ? 'bg-green-100 text-green-800' : subscription.status === 'trial' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>
                                {subscription.status.toUpperCase()}
                            </Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {hasSubscription && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-3 bg-muted rounded-md shrink-0">
                                <p className="text-sm font-semibold mb-1">Expiry Date</p>
                                <p className="text-xs">{subscription.end_date ? new Date(subscription.end_date).toLocaleDateString() : 'Never (Lifetime)'}</p>
                            </div>
                            <div className="p-3 bg-muted rounded-md shrink-0">
                                <p className="text-sm font-semibold mb-1">Exports Enabled</p>
                                <p className="text-xs">{features?.exports_enabled === 'true' ? 'Yes' : 'No'}</p>
                            </div>
                            <div className="p-3 bg-muted rounded-md shrink-0">
                                <p className="text-sm font-semibold mb-1">Max Bills/Day</p>
                                <p className="text-xs">{features?.max_bills_per_day === '-1' ? 'Unlimited' : features?.max_bills_per_day}</p>
                            </div>
                            <div className="p-3 bg-muted rounded-md shrink-0">
                                <p className="text-sm font-semibold mb-1">Max Items</p>
                                <p className="text-xs">{features?.max_items === '-1' ? 'Unlimited' : features?.max_items}</p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Compare Plans Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Choose Your Plan</CardTitle>
                    <CardDescription>Upgrade to unlock more features for your business</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto scrollbar-thin">
                        <table className="w-full text-sm border-collapse min-w-[320px] md:min-w-[600px]">
                            <thead className="bg-muted">
                                <tr>
                                    <th className="p-2 sm:p-3 font-semibold text-xs text-muted-foreground w-28 sm:w-40 md:w-44 sticky left-0 bg-muted z-10 border-r border-border/80 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Features</th>
                                    {allPlans.filter(p => p.is_active).map(p => (
                                        <th key={p.id} className={`p-2 sm:p-3 font-semibold text-center min-w-[100px] sm:min-w-[130px] md:min-w-[150px] ${p.name.includes('Yearly') ? 'text-primary uppercase text-[10px] tracking-wider' : ''}`}>
                                            {p.name.includes('Yearly') && <span className="block text-[8px] bg-primary/20 rounded mb-1 py-0.5 font-bold">⭐ Best Value</span>}
                                            <p className="font-bold text-xs sm:text-sm">{p.name}</p>
                                            <span className="text-[10px] sm:text-xs font-normal text-muted-foreground">₹{p.price}</span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                <tr className="hover:bg-muted/20 transition-colors">
                                    <td className="p-2 sm:p-3 text-xs font-medium sticky left-0 bg-background z-10 border-r border-border/80 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] w-28 sm:w-40 md:w-44 truncate sm:whitespace-normal leading-tight">Export Feature</td>
                                    {allPlans.filter(p => p.is_active).map(p => (
                                        <td key={p.id} className="p-2 sm:p-3 text-center min-w-[100px] sm:min-w-[130px] md:min-w-[150px] text-xs">{p.features?.exports_enabled === 'true' ? '✅' : '❌'}</td>
                                    ))}
                                </tr>
                                <tr className="hover:bg-muted/20 transition-colors">
                                    <td className="p-2 sm:p-3 text-xs font-medium sticky left-0 bg-background z-10 border-r border-border/80 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] w-28 sm:w-40 md:w-44 truncate sm:whitespace-normal leading-tight">Max Bills/Day</td>
                                    {allPlans.filter(p => p.is_active).map(p => (
                                        <td key={p.id} className="p-2 sm:p-3 text-center min-w-[100px] sm:min-w-[130px] md:min-w-[150px] text-xs">{p.features?.max_bills_per_day === '-1' ? 'Unlimited' : p.features?.max_bills_per_day}</td>
                                    ))}
                                </tr>
                                <tr className="hover:bg-muted/20 transition-colors">
                                    <td className="p-2 sm:p-3 text-xs font-medium sticky left-0 bg-background z-10 border-r border-border/80 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] w-28 sm:w-40 md:w-44 truncate sm:whitespace-normal leading-tight">Max Items Limit</td>
                                    {allPlans.filter(p => p.is_active).map(p => (
                                        <td key={p.id} className="p-2 sm:p-3 text-center min-w-[100px] sm:min-w-[130px] md:min-w-[150px] text-xs">{p.features?.max_items === '-1' ? 'Unlimited' : p.features?.max_items}</td>
                                    ))}
                                </tr>
                                <tr className="hover:bg-muted/20 transition-colors">
                                    <td className="p-2 sm:p-3 text-xs font-medium sticky left-0 bg-background z-10 border-r border-border/80 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] w-28 sm:w-40 md:w-44 truncate sm:whitespace-normal leading-tight">Action</td>
                                    {allPlans.filter(p => p.is_active).map(p => (
                                        <td key={p.id} className="p-2 sm:p-3 text-center min-w-[100px] sm:min-w-[130px] md:min-w-[150px] text-xs">
                                            <Button 
                                                variant={p.name.includes('Yearly') ? 'default' : 'outline'} 
                                                size="sm" 
                                                className="w-full text-xs h-8"
                                                onClick={() => handleUpgrade(p.id)}
                                                disabled={subscription?.plan_name === p.name}
                                            >
                                                {subscription?.plan_name === p.name ? 'Current' : 'Choose Plan'}
                                            </Button>
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
