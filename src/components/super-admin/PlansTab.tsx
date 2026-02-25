import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sparkles, Plus, Edit2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function PlansTab() {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [form, setForm] = useState({ name: '', description: '', price: '', billing_period: 'monthly', history_days: '-1', can_export: true, is_active: true });

    const { data: plans = [], isLoading } = useQuery({
        queryKey: ['subscription-plans-admin'],
        queryFn: async () => {
            const { data, error } = await supabase.from('subscription_plans').select('*').order('price');
            if (error) throw error;
            return data;
        },
    });

    const savePlanMutation = useMutation({
        mutationFn: async (values: typeof form & { id?: string }) => {
            const { error } = await (supabase.rpc as any)('manage_subscription_plan', {
                p_id: values.id || null,
                p_name: values.name,
                p_description: values.description,
                p_price: Number(values.price),
                p_billing_period: values.billing_period,
                p_is_active: values.is_active,
                p_features: { history_days: Number(values.history_days), can_export: values.can_export },
            });
            if (error) throw error;

            await (supabase.rpc as any)('log_admin_action', {
                p_admin_id: user?.id || 'super-admin',
                p_action: values.id ? 'edit_plan' : 'create_plan',
                p_target_id: values.id || null,
                p_target_type: 'subscription_plan',
                p_details: { name: values.name, price: values.price },
            });
        },
        onSuccess: () => {
            toast.success(editing ? 'Plan updated' : 'Plan created');
            queryClient.invalidateQueries({ queryKey: ['subscription-plans-admin'] });
            queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
            setOpen(false);
            setEditing(null);
            setForm({ name: '', description: '', price: '', billing_period: 'monthly', history_days: '-1', can_export: true, is_active: true });
        },
        onError: (err: any) => toast.error(err.message),
    });

    const toggleActiveMutation = useMutation({
        mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
            const { error } = await (supabase.rpc as any)('manage_subscription_plan', {
                p_id: id,
                p_is_active: is_active,
            });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('Plan status updated');
            queryClient.invalidateQueries({ queryKey: ['subscription-plans-admin'] });
        },
        onError: (err: any) => toast.error(err.message),
    });

    const openEdit = (plan: any) => {
        setEditing(plan);
        setForm({
            name: plan.name,
            description: plan.description || '',
            price: String(plan.price),
            billing_period: plan.billing_period,
            history_days: String((plan.features as any)?.history_days ?? -1),
            can_export: (plan.features as any)?.can_export ?? true,
            is_active: plan.is_active ?? true,
        });
        setOpen(true);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-lg">Subscription Plans</h3>
                    <p className="text-sm text-muted-foreground">Create and manage available plans</p>
                </div>
                <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm({ name: '', description: '', price: '', billing_period: 'monthly', history_days: '-1', can_export: true, is_active: true }); } }}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="gap-2">
                            <Plus className="h-4 w-4" />New Plan
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editing ? 'Edit Plan' : 'Create New Plan'}</DialogTitle>
                        </DialogHeader>
                        <form
                            className="space-y-4 pt-2"
                            onSubmit={(e) => { e.preventDefault(); savePlanMutation.mutate({ ...form, id: editing?.id }); }}
                        >
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1 col-span-2">
                                    <Label>Plan Name</Label>
                                    <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                                </div>
                                <div className="space-y-1 col-span-2">
                                    <Label>Description</Label>
                                    <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                                </div>
                                <div className="space-y-1">
                                    <Label>Price (₹)</Label>
                                    <Input type="number" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} required />
                                </div>
                                <div className="space-y-1">
                                    <Label>Billing Period</Label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={form.billing_period}
                                        onChange={e => setForm(f => ({ ...f, billing_period: e.target.value }))}
                                    >
                                        <option value="monthly">Monthly</option>
                                        <option value="6_months">6 Months</option>
                                        <option value="yearly">Yearly</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <Label>History Limit (days, -1 for unlimited)</Label>
                                    <Input type="number" value={form.history_days} onChange={e => setForm(f => ({ ...f, history_days: e.target.value }))} />
                                </div>
                                <div className="flex items-center justify-between col-span-2 pt-2 border-t">
                                    <Label>Can Export Data</Label>
                                    <Switch checked={form.can_export} onCheckedChange={v => setForm(f => ({ ...f, can_export: v }))} />
                                </div>
                                <div className="flex items-center justify-between col-span-2">
                                    <Label>Plan Active</Label>
                                    <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
                                </div>
                            </div>
                            <Button type="submit" className="w-full" disabled={savePlanMutation.isPending}>
                                {editing ? 'Save Changes' : 'Create Plan'}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {plans.map((plan: any) => (
                    <Card key={plan.id} className={cn('relative', !plan.is_active && 'opacity-50')}>
                        {!plan.is_active && (
                            <div className="absolute top-2 right-2">
                                <Badge variant="outline" className="text-[10px]">Disabled</Badge>
                            </div>
                        )}
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-primary" />
                                {plan.name}
                            </CardTitle>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-extrabold">₹{plan.price}</span>
                                <span className="text-xs text-muted-foreground">/ {plan.billing_period.replace('_', ' ')}</span>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <p className="text-xs text-muted-foreground">{plan.description}</p>
                            <div className="space-y-1 text-xs">
                                <div className="flex items-center gap-2">
                                    <Check className="h-3 w-3 text-green-500" />
                                    History: {(plan.features as any)?.history_days === -1 ? 'Unlimited' : `${(plan.features as any)?.history_days}d`}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Check className={cn('h-3 w-3', (plan.features as any)?.can_export ? 'text-green-500' : 'text-muted-foreground')} />
                                    Export: {(plan.features as any)?.can_export ? 'Enabled' : 'Disabled'}
                                </div>
                            </div>
                            <div className="flex gap-2 pt-2 border-t">
                                <Button size="sm" variant="outline" className="flex-1 h-8 text-xs gap-1.5" onClick={() => openEdit(plan)}>
                                    <Edit2 className="h-3 w-3" />Edit
                                </Button>
                                <Button
                                    size="sm"
                                    variant={plan.is_active ? 'destructive' : 'outline'}
                                    className="flex-1 h-8 text-xs"
                                    disabled={toggleActiveMutation.isPending}
                                    onClick={() => toggleActiveMutation.mutate({ id: plan.id, is_active: !plan.is_active })}
                                >
                                    {plan.is_active ? 'Disable' : 'Enable'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
                {isLoading && <div className="col-span-3 text-center py-10 text-muted-foreground">Loading plans...</div>}
            </div>
        </div>
    );
}
