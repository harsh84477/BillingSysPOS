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
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted">
                                <tr>
                                    <th className="p-3 font-semibold">Features</th>
                                    {allPlans.filter(p => p.is_active).map(p => (
                                        <th key={p.id} className={`p-3 font-semibold text-center ${p.name.includes('Yearly') ? 'text-primary uppercase text-xs tracking-wider' : ''}`}>
                                            {p.name.includes('Yearly') && <span className="block text-[10px] bg-primary/20 rounded mb-1 py-0.5">⭐ Best Value</span>}
                                            {p.name}<br/>
                                            <span className="text-xs font-normal">₹{p.price}</span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                <tr>
                                    <td className="p-3 font-medium">Export Feature</td>
                                    {allPlans.filter(p => p.is_active).map(p => (
                                        <td key={p.id} className="p-3 text-center">{p.features?.exports_enabled === 'true' ? '✅' : '❌'}</td>
                                    ))}
                                </tr>
                                <tr>
                                    <td className="p-3 font-medium">Max Bills/Day</td>
                                    {allPlans.filter(p => p.is_active).map(p => (
                                        <td key={p.id} className="p-3 text-center">{p.features?.max_bills_per_day === '-1' ? 'Unlimited' : p.features?.max_bills_per_day}</td>
                                    ))}
                                </tr>
                                <tr>
                                    <td className="p-3 font-medium">Max Items Limit</td>
                                    {allPlans.filter(p => p.is_active).map(p => (
                                        <td key={p.id} className="p-3 text-center">{p.features?.max_items === '-1' ? 'Unlimited' : p.features?.max_items}</td>
                                    ))}
                                </tr>
                                <tr>
                                    <td className="p-3 font-medium">Action</td>
                                    {allPlans.filter(p => p.is_active).map(p => (
                                        <td key={p.id} className="p-3 text-center">
                                            <Button 
                                                variant={p.name.includes('Yearly') ? 'default' : 'outline'} 
                                                size="sm" 
                                                className="w-full"
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
