import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function SubscriptionAssignment() {
    const [plans, setPlans] = useState([]);
    const [businesses] = useState([
        { id: 1, name: 'Main Branch' },
        { id: 2, name: 'Downtown Store' }
    ]); // Mock for demo, ideally fetched
    
    const [selectedBusiness, setSelectedBusiness] = useState('');
    const [selectedPlan, setSelectedPlan] = useState('');
    const [isTrial, setIsTrial] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);

    const API_URL = 'http://localhost:5000/api';

    useEffect(() => {
        fetch(`${API_URL}/plans`).then(r => r.json()).then(setPlans);
    }, []);

    const handleAssign = async () => {
        try {
            const res = await fetch(`${API_URL}/subscriptions/assign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    business_id: selectedBusiness,
                    plan_id: selectedPlan,
                    is_trial: isTrial
                })
            });

            if (!res.ok) throw new Error('Assignment failed');
            toast.success('Subscription assigned successfully');
            setConfirmOpen(false);
            setSelectedBusiness('');
            setSelectedPlan('');
        } catch (err) {
            toast.error(err.message);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Assign Subscription to Business</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <label>Select Business</label>
                    <Select value={selectedBusiness} onValueChange={setSelectedBusiness}>
                        <SelectTrigger><SelectValue placeholder="Select business" /></SelectTrigger>
                        <SelectContent>
                            {businesses.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <label>Select Plan</label>
                    <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                        <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
                        <SelectContent>
                            {plans.filter(p => p.is_active).map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex gap-4 pt-2">
                    <Button onClick={() => { setIsTrial(false); setConfirmOpen(true); }} disabled={!selectedBusiness || !selectedPlan}>
                        Assign Plan
                    </Button>
                    <Button variant="outline" onClick={() => { setIsTrial(true); setConfirmOpen(true); }} disabled={!selectedBusiness || !selectedPlan}>
                        Start 7-Day Trial
                    </Button>
                </div>
            </CardContent>

            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Assignment</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to assign this plan? This will log the action in the database and override the current active subscription.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
                        <Button onClick={handleAssign}>Confirm</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
