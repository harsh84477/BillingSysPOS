import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Sparkles, Plus, Edit2, Trash2, Loader2, Package, IndianRupee } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface Plan {
    id: string;
    name: string;
    price: number;
    billing_period: string;
    features: string[];
    max_users: number;
    max_products: number;
    is_active: boolean;
}

const defaultPlan: Partial<Plan> = {
    name: '',
    price: 0,
    billing_period: 'monthly',
    features: [],
    max_users: 5,
    max_products: 100,
    is_active: true,
};

export default function PlansTab() {
    const queryClient = useQueryClient();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<Plan | null>(null);
    const [form, setForm] = useState<Partial<Plan>>(defaultPlan);
    const [featuresText, setFeaturesText] = useState('');

    const { data: plans = [], isLoading } = useQuery({
        queryKey: ['subscription-plans-admin'],
        queryFn: async () => {
            const { data, error } = await (supabase.from as any)('subscription_plans')
                .select('*')
                .order('price');
            if (error) return [];
            return (data || []) as Plan[];
        },
    });

    const saveMutation = useMutation({
        mutationFn: async (plan: Partial<Plan>) => {
            const payload = {
                name: plan.name,
                price: plan.price,
                billing_period: plan.billing_period,
                features: plan.features,
                max_users: plan.max_users,
                max_products: plan.max_products,
                is_active: plan.is_active,
            };
            if (editing) {
                const { error } = await (supabase.from as any)('subscription_plans')
                    .update(payload)
                    .eq('id', editing.id);
                if (error) throw error;
            } else {
                const { error } = await (supabase.from as any)('subscription_plans')
                    .insert(payload);
                if (error) throw error;
            }
        },
        onSuccess: () => {
            toast.success(editing ? 'Plan updated' : 'Plan created');
            queryClient.invalidateQueries({ queryKey: ['subscription-plans-admin'] });
            queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
            closeDialog();
        },
        onError: (err: any) => toast.error(err.message),
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await (supabase.from as any)('subscription_plans')
                .update({ is_active: false })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('Plan deactivated');
            queryClient.invalidateQueries({ queryKey: ['subscription-plans-admin'] });
        },
        onError: (err: any) => toast.error(err.message),
    });

    const openCreate = () => {
        setEditing(null);
        setForm(defaultPlan);
        setFeaturesText('');
        setDialogOpen(true);
    };

    const openEdit = (plan: Plan) => {
        setEditing(plan);
        setForm(plan);
        setFeaturesText((plan.features || []).join('\n'));
        setDialogOpen(true);
    };

    const closeDialog = () => {
        setDialogOpen(false);
        setEditing(null);
        setForm(defaultPlan);
        setFeaturesText('');
    };

    const handleSave = () => {
        if (!form.name?.trim()) { toast.error('Plan name is required'); return; }
        const features = featuresText.split('\n').map(f => f.trim()).filter(Boolean);
        saveMutation.mutate({ ...form, features });
    };

    const periodLabel = (p: string) => {
        switch (p) {
            case 'monthly': return 'Monthly';
            case '6_months': return '6 Months';
            case 'yearly': return 'Yearly';
            default: return p;
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        Subscription Plans
                    </h3>
                    <p className="text-sm text-muted-foreground">Create and manage subscription tiers for businesses.</p>
                </div>
                <Button onClick={openCreate} className="gap-2 shrink-0">
                    <Plus className="h-4 w-4" />
                    New Plan
                </Button>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                        <Card key={i}><CardContent className="pt-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
                    ))}
                </div>
            ) : plans.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                        <Sparkles className="h-12 w-12 opacity-15 mb-4" />
                        <p className="font-semibold text-foreground">No plans yet</p>
                        <p className="text-sm mt-1">Create your first subscription plan to get started.</p>
                        <Button onClick={openCreate} variant="outline" className="mt-4 gap-2">
                            <Plus className="h-4 w-4" />
                            Create Plan
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {plans.map((plan) => (
                        <Card key={plan.id} className={`relative overflow-hidden transition-shadow hover:shadow-md ${!plan.is_active ? 'opacity-50' : ''}`}>
                            {!plan.is_active && (
                                <div className="absolute top-3 right-3">
                                    <Badge variant="secondary" className="text-[10px]">Inactive</Badge>
                                </div>
                            )}
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base">{plan.name}</CardTitle>
                                <CardDescription>{periodLabel(plan.billing_period)}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-black text-primary">₹{plan.price}</span>
                                    <span className="text-sm text-muted-foreground">/ {periodLabel(plan.billing_period).toLowerCase()}</span>
                                </div>

                                <div className="flex gap-3 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1"><Users2Icon className="h-3 w-3" />{plan.max_users} users</span>
                                    <span className="flex items-center gap-1"><Package className="h-3 w-3" />{plan.max_products} products</span>
                                </div>

                                {plan.features && plan.features.length > 0 && (
                                    <ul className="space-y-1">
                                        {plan.features.slice(0, 4).map((f, i) => (
                                            <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                                <span className="text-primary mt-0.5">✓</span>
                                                {f}
                                            </li>
                                        ))}
                                        {plan.features.length > 4 && (
                                            <li className="text-[10px] text-muted-foreground/60">+{plan.features.length - 4} more</li>
                                        )}
                                    </ul>
                                )}

                                <div className="flex gap-2 pt-2 border-t border-border">
                                    <Button variant="outline" size="sm" className="flex-1 h-8 text-xs gap-1" onClick={() => openEdit(plan)}>
                                        <Edit2 className="h-3 w-3" />Edit
                                    </Button>
                                    {plan.is_active && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 text-xs text-destructive hover:text-destructive gap-1"
                                            disabled={deleteMutation.isPending}
                                            onClick={() => deleteMutation.mutate(plan.id)}
                                        >
                                            <Trash2 className="h-3 w-3" />Deactivate
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit Plan' : 'Create New Plan'}</DialogTitle>
                        <DialogDescription>
                            {editing ? 'Update the subscription plan details.' : 'Set up a new subscription tier for your businesses.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label>Plan Name</Label>
                            <Input
                                placeholder="e.g. Starter, Pro, Enterprise"
                                value={form.name || ''}
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label>Price (₹)</Label>
                                <Input
                                    type="number"
                                    placeholder="299"
                                    value={form.price || ''}
                                    onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Billing Period</Label>
                                <Select value={form.billing_period} onValueChange={v => setForm(f => ({ ...f, billing_period: v }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="monthly">Monthly</SelectItem>
                                        <SelectItem value="6_months">6 Months</SelectItem>
                                        <SelectItem value="yearly">Yearly</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label>Max Users</Label>
                                <Input
                                    type="number"
                                    value={form.max_users || ''}
                                    onChange={e => setForm(f => ({ ...f, max_users: Number(e.target.value) }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Max Products</Label>
                                <Input
                                    type="number"
                                    value={form.max_products || ''}
                                    onChange={e => setForm(f => ({ ...f, max_products: Number(e.target.value) }))}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Features (one per line)</Label>
                            <textarea
                                className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                placeholder={"Unlimited billing\nInventory tracking\nMulti-user support"}
                                value={featuresText}
                                onChange={e => setFeaturesText(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label>Active</Label>
                            <Switch
                                checked={form.is_active ?? true}
                                onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={closeDialog}>Cancel</Button>
                        <Button onClick={handleSave} disabled={saveMutation.isPending} className="gap-2">
                            {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                            {editing ? 'Update Plan' : 'Create Plan'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Simple users icon for the card
function Users2Icon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    );
}
