import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Sparkles, Plus, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function PlansManager() {
    const [plans, setPlans] = useState([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);
    const [form, setForm] = useState({
        name: '',
        price: 0,
        duration_days: 30,
        is_active: true,
        features: {}
    });

    const API_URL = 'http://localhost:5000/api';

    const fetchPlans = async () => {
        try {
            const res = await fetch(`${API_URL}/plans`);
            const data = await res.json();
            setPlans(data);
        } catch (err) {
            toast.error('Failed to fetch plans');
        }
    };

    useEffect(() => {
        fetchPlans();
    }, []);

    const handleSave = async () => {
        try {
            const method = editingPlan ? 'PUT' : 'POST';
            const url = editingPlan ? `${API_URL}/plans/${editingPlan.id}` : `${API_URL}/plans`;
            
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });

            if (!res.ok) throw new Error('Save failed');
            toast.success('Plan saved successfully');
            setDialogOpen(false);
            fetchPlans();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleDeactivate = async (id) => {
        try {
            const res = await fetch(`${API_URL}/plans/${id}/deactivate`, { method: 'PATCH' });
            if (!res.ok) throw new Error('Deactivate failed');
            toast.success('Plan deactivated');
            fetchPlans();
        } catch (err) {
            toast.error(err.message);
        }
    };

    const openEdit = (plan) => {
        setEditingPlan(plan);
        setForm({
            name: plan.name,
            price: plan.price,
            duration_days: plan.duration_days,
            is_active: plan.is_active,
            features: plan.features || {}
        });
        setDialogOpen(true);
    };

    const openCreate = () => {
        setEditingPlan(null);
        setForm({
            name: '', price: 0, duration_days: 30, is_active: true, features: {
                exports_enabled: 'true', max_bills_per_day: '-1', max_items: '-1'
            }
        });
        setDialogOpen(true);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-bold text-lg">Subscription Plans (MySQL Backed)</h3>
                    <p className="text-sm text-muted-foreground">Manage plans and dynamic features</p>
                </div>
                <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> New Plan</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plans.map(plan => (
                    <Card key={plan.id} className={!plan.is_active ? 'opacity-60' : ''}>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle>{plan.name}</CardTitle>
                                    <CardDescription>{plan.duration_days ? `${plan.duration_days} Days` : 'Lifetime'}</CardDescription>
                                </div>
                                {!plan.is_active && <Badge variant="secondary">Inactive</Badge>}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold mb-4">₹{plan.price}</div>
                            <div className="text-sm space-y-1 mb-4 text-muted-foreground">
                                <p>Exports: {plan.features.exports_enabled === 'true' ? 'Yes' : 'No'}</p>
                                <p>Max Bills/Day: {plan.features.max_bills_per_day}</p>
                                <p>Max Items: {plan.features.max_items}</p>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => openEdit(plan)}>Edit</Button>
                                {plan.is_active && (
                                    <Button variant="ghost" size="sm" onClick={() => handleDeactivate(plan.id)} className="text-red-500">Deactivate</Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingPlan ? 'Edit Plan' : 'Create Plan'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Plan Name</Label>
                            <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Price (₹)</Label>
                                <Input type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <Label>Duration (Days, empty for Lifetime)</Label>
                                <Input type="number" value={form.duration_days || ''} onChange={e => setForm({...form, duration_days: e.target.value || null})} />
                            </div>
                        </div>
                        <div className="space-y-2 py-2 border-t mt-4">
                            <Label className="font-bold">Dynamic Features</Label>
                            <div className="flex justify-between items-center mt-2">
                                <span>Exports Enabled</span>
                                <Switch checked={form.features.exports_enabled === 'true'} onCheckedChange={c => setForm({...form, features: {...form.features, exports_enabled: c ? 'true' : 'false'}})} />
                            </div>
                            <div className="flex justify-between items-center mt-2">
                                <Label>Max Bills/Day (-1 for unl.)</Label>
                                <Input className="w-24" value={form.features.max_bills_per_day || '-1'} onChange={e => setForm({...form, features: {...form.features, max_bills_per_day: e.target.value}})} />
                            </div>
                            <div className="flex justify-between items-center mt-2">
                                <Label>Max Items (-1 for unl.)</Label>
                                <Input className="w-24" value={form.features.max_items || '-1'} onChange={e => setForm({...form, features: {...form.features, max_items: e.target.value}})} />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
