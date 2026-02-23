import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Lock, User, ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SuperAdminLogin() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { superAdminLogin } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username || !password) {
            toast.error('Please enter both username and password');
            return;
        }

        setLoading(true);
        try {
            const { error } = await superAdminLogin(username, password);
            if (error) {
                toast.error(error);
            } else {
                toast.success('Successfully logged in as Super Admin');
                navigate('/super-admin');
            }
        } catch (err: any) {
            toast.error(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
            <div className="w-full max-w-md space-y-4">
                <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-muted-foreground hover:text-foreground"
                    onClick={() => navigate('/')}
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to POS
                </Button>

                <Card className="border-2 shadow-xl">
                    <CardHeader className="space-y-1 text-center">
                        <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-2">
                            <ShieldCheck className="h-8 w-8 text-primary" />
                        </div>
                        <CardTitle className="text-2xl font-bold">Admin Console</CardTitle>
                        <CardDescription>
                            Enter your system credentials to access the control panel
                        </CardDescription>
                    </CardHeader>
                    <form onSubmit={handleLogin}>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="username">Username</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="username"
                                        placeholder="admin"
                                        className="pl-10"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        className="pl-10"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button
                                type="submit"
                                className="w-full h-11 text-base font-semibold"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Authenticating...
                                    </>
                                ) : (
                                    'Login to Super Admin'
                                )}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>

                <p className="text-center text-xs text-muted-foreground">
                    Unauthorized access is strictly prohibited and logged.
                </p>
            </div>
        </div>
    );
}
