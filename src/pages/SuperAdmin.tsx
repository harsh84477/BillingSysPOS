import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Users, CreditCard, ShieldCheck, Activity, Search, ExternalLink, ShieldAlert } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function SuperAdmin() {
    const { isSuperAdmin } = useAuth();
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');

    if (!isSuperAdmin) {
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] space-y-4">
                <ShieldAlert className="h-16 w-16 text-destructive" />
                <h1 className="text-2xl font-bold">Access Denied</h1>
                <p className="text-muted-foreground">This area is reserved for system administrators.</p>
                <Button onClick={() => window.location.href = '/'}>Go Home</Button>
            </div>
        );
    }

    // Fetch Businesses with Subscriptions
    const { data: businesses = [], isLoading: loadingBiz } = useQuery({
        queryKey: ['super-admin-businesses'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('businesses')
                .select(`
          *,
          subscriptions (
            status,
            trial_end,
            current_period_end,
            plan:subscription_plans (name)
          )
        `);
            if (error) throw error;
            return data;
        },
    });

    // Fetch All Users
    const { data: allUsers = [], isLoading: loadingUsers } = useQuery({
        queryKey: ['super-admin-users'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select(`
          *,
          user_roles (role),
          business:businesses (business_name)
        `);
            if (error) throw error;
            return data;
        },
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active': return <Badge className="bg-green-100 text-green-700">Active</Badge>;
            case 'trialing': return <Badge className="bg-blue-100 text-blue-700">Trial</Badge>;
            case 'expired': return <Badge variant="destructive">Expired</Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const filteredBiz = businesses.filter(b =>
        b.business_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.mobile_number.includes(searchQuery)
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Super Admin Control</h1>
                    <p className="text-muted-foreground font-medium flex items-center gap-1.5 mt-1">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        System-wide business and subscription management
                    </p>
                </div>
            </div>

            <Tabs defaultValue="businesses" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="businesses" className="gap-2">
                        <Building2 className="h-4 w-4" />
                        Businesses
                    </TabsTrigger>
                    <TabsTrigger value="users" className="gap-2">
                        <Users className="h-4 w-4" />
                        Users
                    </TabsTrigger>
                    <TabsTrigger value="plans" className="gap-2">
                        <CreditCard className="h-4 w-4" />
                        Plans
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="businesses" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Registered Businesses</CardTitle>
                                    <CardDescription>Monitor and manage all storefronts on the platform.</CardDescription>
                                </div>
                                <div className="relative w-72">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        placeholder="Search businesses..."
                                        className="pl-9"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Business Name</TableHead>
                                        <TableHead>Contact</TableHead>
                                        <TableHead>Join Code</TableHead>
                                        <TableHead>Subscription</TableHead>
                                        <TableHead>Current Period End</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredBiz.map((biz) => {
                                        const sub = biz.subscriptions?.[0];
                                        return (
                                            <TableRow key={biz.id}>
                                                <TableCell className="font-semibold">{biz.business_name}</TableCell>
                                                <TableCell>{biz.mobile_number}</TableCell>
                                                <TableCell className="font-mono text-xs">{biz.join_code}</TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-1">
                                                        {sub ? getStatusBadge(sub.status) : <Badge variant="outline">No Sub</Badge>}
                                                        <span className="text-[10px] text-muted-foreground">{sub?.plan?.name || 'Manual'}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {sub?.current_period_end ? format(new Date(sub.current_period_end), 'MMM dd, yyyy') : 'N/A'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="sm">
                                                        <ExternalLink className="h-4 w-4 mr-2" />
                                                        Manage
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {filteredBiz.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                                                No businesses found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="users">
                    <Card>
                        <CardHeader>
                            <CardTitle>All Platform Users</CardTitle>
                            <CardDescription>List of all users registered across all businesses.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User Name</TableHead>
                                        <TableHead>Business</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Joined At</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {allUsers.map((profile) => (
                                        <TableRow key={profile.id}>
                                            <TableCell className="font-medium">{profile.display_name || 'No Name'}</TableCell>
                                            <TableCell>{profile.business?.business_name || 'No Business'}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="capitalize">
                                                    {(profile.user_roles as any)?.[0]?.role || 'none'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {format(new Date(profile.created_at), 'MMM dd, yyyy')}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="plans">
                    <div className="flex justify-center py-20 bg-muted/30 rounded-lg border border-dashed text-muted-foreground">
                        Feature Flag / Plan management coming in Phase 2
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
