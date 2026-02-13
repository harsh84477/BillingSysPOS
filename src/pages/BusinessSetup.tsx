import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Building2, Phone, Copy, Check, PartyPopper } from 'lucide-react';

export default function BusinessSetup() {
    const { user, refreshBusinessInfo, businessInfo } = useAuth();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState<'form' | 'success'>('form');
    const [joinCode, setJoinCode] = useState('');
    const [copied, setCopied] = useState(false);

    // If business already exists, redirect to dashboard
    useEffect(() => {
        if (businessInfo) {
            navigate('/dashboard', { replace: true });
            return;
        }
        // Also check directly from DB on mount
        if (user) {
            supabase
                .from('businesses')
                .select('id, join_code')
                .eq('owner_id', user.id)
                .maybeSingle()
                .then(({ data }) => {
                    if (data) {
                        // Business exists, refresh context and redirect
                        refreshBusinessInfo().then(() => {
                            navigate('/dashboard', { replace: true });
                        });
                    }
                });
        }
    }, [user, businessInfo]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!user) return;

        setIsLoading(true);

        const formData = new FormData(e.currentTarget);
        const businessName = formData.get('businessName') as string;
        const mobileNumber = formData.get('mobileNumber') as string;

        if (!businessName.trim()) {
            toast.error('Please enter a business name');
            setIsLoading(false);
            return;
        }

        if (!mobileNumber.trim() || mobileNumber.length < 10) {
            toast.error('Please enter a valid mobile number');
            setIsLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase.rpc('create_business', {
                _business_name: businessName.trim(),
                _mobile_number: mobileNumber.trim(),
                _user_id: user.id,
            });

            if (error) {
                toast.error(error.message);
                setIsLoading(false);
                return;
            }

            const result = data as any;

            if (!result.success) {
                // If business already exists, just go to dashboard
                if (result.error?.includes('already own')) {
                    toast.info('Business already exists! Redirecting...');
                    localStorage.removeItem('pos_pending_role');
                    localStorage.removeItem('pos_pending_join_code');
                    window.location.href = '/dashboard';
                    return;
                }
                toast.error(result.error || 'Failed to create business');
                setIsLoading(false);
                return;
            }

            setJoinCode(result.join_code);
            setStep('success');
            toast.success('Business created successfully!');
        } catch (err: any) {
            toast.error(err.message || 'Something went wrong');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyCode = async () => {
        try {
            await navigator.clipboard.writeText(joinCode);
            setCopied(true);
            toast.success('Code copied!');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast.error('Failed to copy');
        }
    };

    const handleContinue = async () => {
        // Clear any pending role data
        localStorage.removeItem('pos_pending_role');
        localStorage.removeItem('pos_pending_join_code');
        // Hard redirect to force full state re-initialization
        window.location.href = '/dashboard';
    };

    if (step === 'success') {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10">
                            <PartyPopper className="h-7 w-7 text-green-500" />
                        </div>
                        <CardTitle className="text-2xl">Business Created!</CardTitle>
                        <CardDescription>
                            Your business is ready. Share this code with your managers and cashiers so they can join.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Join Code Display */}
                        <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-6 text-center space-y-2">
                            <p className="text-sm text-muted-foreground font-medium">Your Business Join Code</p>
                            <div className="flex items-center justify-center gap-3">
                                <span className="text-4xl font-mono font-bold tracking-[0.3em] text-primary">
                                    {joinCode}
                                </span>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={handleCopyCode}
                                    className="shrink-0"
                                >
                                    {copied ? (
                                        <Check className="h-4 w-4 text-green-500" />
                                    ) : (
                                        <Copy className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Your staff will need this code to join your business
                            </p>
                        </div>

                        {/* Info */}
                        <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                            <p className="text-sm font-medium">What's next?</p>
                            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                                <li>Share this code with your managers and cashiers</li>
                                <li>They'll enter this code when they sign up</li>
                                <li>You can manage your team from Settings → Team</li>
                                <li>You can regenerate this code anytime from Settings</li>
                                <li>Maximum 8 team members per business</li>
                            </ul>
                        </div>

                        <Button className="w-full" size="lg" onClick={handleContinue}>
                            Go to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Set Up Your Business</CardTitle>
                    <CardDescription>
                        Register your business to get started. You'll get a unique code to share with your team.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="businessName">Business Name</Label>
                            <Input
                                id="businessName"
                                name="businessName"
                                placeholder="e.g. My Shop"
                                required
                                disabled={isLoading}
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="mobileNumber">
                                <span className="flex items-center gap-1.5">
                                    <Phone className="h-3.5 w-3.5" />
                                    Mobile Number
                                </span>
                            </Label>
                            <Input
                                id="mobileNumber"
                                name="mobileNumber"
                                type="tel"
                                placeholder="e.g. +91 98765 43210"
                                required
                                disabled={isLoading}
                            />
                            <p className="text-xs text-muted-foreground">
                                This number uniquely identifies your business. Your team members will use this as reference.
                            </p>
                        </div>
                        <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating Business...
                                </>
                            ) : (
                                'Create Business'
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
