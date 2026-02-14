import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
    Building2,
    Users,
    UserMinus,
    UserCheck,
    Search,
    Loader2,
    ExternalLink,
    ShieldAlert
} from 'lucide-react';
import { Input } from '@/components/ui/input';

interface BusinessStats {
    id: string;
    business_name: string;
    join_code: string;
    created_at: string;
    owner_name: string;
    total_users: number;
    managers: number;
    cashiers: number;
    admins: number;
}

interface UserProfile {
    id: string;
    email: string;
    full_name: string;
    is_blocked: boolean;
    created_at: string;
}

export default function SuperAdmin() {
    const [stats, setStats] = useState({ totalBusinesses: 0, totalUsers: 0 });
    const [businesses, setBusinesses] = useState<BusinessStats[]>([]);
    const [profiles, setProfiles] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch Stats
            const { count: bizCount } = await supabase.from('businesses').select('*', { count: 'exact', head: true });
            const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
            setStats({ totalBusinesses: bizCount || 0, totalUsers: userCount || 0 });

            // 2. Fetch Businesses with user counts
            const { data: bizData, error: bizError } = await supabase
                .from('businesses')
                .select(`
                    id, 
                    business_name, 
                    join_code, 
                    created_at, 
                    owner_name,
                    user_roles(role)
                `);

            if (bizError) throw bizError;

            const formattedBusinesses: BusinessStats[] = bizData.map((biz: any) => {
                const roles = biz.user_roles || [];
                return {
                    id: biz.id,
                    business_name: biz.business_name || 'Unnamed',
                    join_code: biz.join_code,
                    created_at: biz.created_at,
                    owner_name: biz.owner_name || 'N/A',
                    total_users: roles.length,
                    admins: roles.filter((r: any) => r.role === 'admin').length,
                    managers: roles.filter((r: any) => r.role === 'manager').length,
                    cashiers: roles.filter((r: any) => r.role === 'cashier').length,
                };
            });
            setBusinesses(formattedBusinesses);

            // 3. Fetch Profiles
            const { data: profData, error: profError } = await supabase
                .from('profiles')
                .select('id, email, full_name, is_blocked, created_at')
                .order('created_at', { ascending: false });

            if (profError) throw profError;
            setProfiles(profData || []);

        } catch (error: any) {
            toast.error(error.message || 'Failed to fetch system data');
        } finally {
            setIsLoading(false);
        }
    };

    const toggleBlockUser = async (user: UserProfile) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ is_blocked: !user.is_blocked })
                .eq('id', user.id);

            if (error) throw error;

            toast.success(`User ${user.is_blocked ? 'unblocked' : 'blocked'} successfully`);
            fetchData();
        } catch (error: any) {
            toast.error(error.message || 'Action failed');
        }
    };

    const filteredProfiles = profiles.filter(p =>
        p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (isLoading && businesses.length === 0) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">System Administration</h1>
                    <p className="text-muted-foreground text-sm">Monitor and manage the entire POS platform.</p>
                </div>
                <Button onClick={fetchData} variant="outline" size="sm" disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Refresh Data'}
                </Button>
            </div>

            {/* Stats Overview */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Businesses</CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalBusinesses}</div>
                        <p className="text-xs text-muted-foreground">Registered businesses</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalUsers}</div>
                        <p className="text-xs text-muted-foreground">Accounts across all businesses</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Blocked Accounts</CardTitle>
                        <ShieldAlert className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-destructive">
                            {profiles.filter(p => p.is_blocked).length}
                        </div>
                        <p className="text-xs text-muted-foreground">Disabled users</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="businesses" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="businesses">Businesses</TabsTrigger>
                    <TabsTrigger value="users">Global Users</TabsTrigger>
                </TabsList>

                <TabsContent value="businesses" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Business Directory</CardTitle>
                            <CardDescription>View all businesses and their staff breakdown.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Business Name</TableHead>
                                            <TableHead>Owner</TableHead>
                                            <TableHead>Join Code</TableHead>
                                            <TableHead className="text-center">Admin</TableHead>
                                            <TableHead className="text-center">Manager</TableHead>
                                            <TableHead className="text-center">Cashier</TableHead>
                                            <TableHead className="text-center">Total</TableHead>
                                            <TableHead>Created At</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {businesses.map((biz) => (
                                            <TableRow key={biz.id}>
                                                <TableCell className="font-medium">{biz.business_name}</TableCell>
                                                <TableCell>{biz.owner_name}</TableCell>
                                                <TableCell className="font-mono text-xs">{biz.join_code}</TableCell>
                                                <TableCell className="text-center">{biz.admins}</TableCell>
                                                <TableCell className="text-center">{biz.managers}</TableCell>
                                                <TableCell className="text-center">{biz.cashiers}</TableCell>
                                                <TableCell className="text-center font-bold">{biz.total_users}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {new Date(biz.created_at).toLocaleDateString()}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="users" className="space-y-4">
                    <div className="flex items-center gap-2 max-w-sm mb-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search by email or name..."
                                className="pl-8"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="rounded-md border overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>User</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Joined</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredProfiles.map((prof) => (
                                            <TableRow key={prof.id}>
                                                <TableCell className="font-medium">{prof.full_name || 'No Name'}</TableCell>
                                                <TableCell>{prof.email}</TableCell>
                                                <TableCell>
                                                    {prof.is_blocked ? (
                                                        <Badge variant="destructive">Blocked</Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {new Date(prof.created_at).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant={prof.is_blocked ? "outline" : "destructive"}
                                                        size="sm"
                                                        onClick={() => toggleBlockUser(prof)}
                                                    >
                                                        {prof.is_blocked ? (
                                                            <><UserCheck className="mr-2 h-4 w-4" /> Unblock</>
                                                        ) : (
                                                            <><UserMinus className="mr-2 h-4 w-4" /> Block</>
                                                        )}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
