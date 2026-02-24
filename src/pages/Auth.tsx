import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, ShoppingCart, Crown, UserCog, User, ArrowLeft, KeyRound, LogIn, Briefcase } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

type SelectedRole = 'owner' | 'manager' | 'cashier' | 'salesman' | 'existing' | null;

const ROLE_CARDS = [
  {
    role: 'owner' as const,
    title: 'Business Owner',
    description: 'Create and manage your business. Full admin access to everything.',
    icon: Crown,
    gradient: 'from-amber-500/20 to-orange-500/20',
    border: 'border-amber-500/30 hover:border-amber-500/60',
    iconColor: 'text-amber-500',
  },
  {
    role: 'manager' as const,
    title: 'Manager',
    description: 'Join an existing business as a manager with extended permissions.',
    icon: UserCog,
    gradient: 'from-blue-500/20 to-cyan-500/20',
    border: 'border-blue-500/30 hover:border-blue-500/60',
    iconColor: 'text-blue-500',
  },
  {
    role: 'cashier' as const,
    title: 'Cashier',
    description: 'Join an existing business as a cashier for billing operations.',
    icon: User,
    gradient: 'from-emerald-500/20 to-green-500/20',
    border: 'border-emerald-500/30 hover:border-emerald-500/60',
    iconColor: 'text-emerald-500',
  },
  {
    role: 'salesman' as const,
    title: 'Salesman',
    description: 'Create draft orders from the field. View products & live stock.',
    icon: Briefcase,
    gradient: 'from-teal-500/20 to-cyan-500/20',
    border: 'border-teal-500/30 hover:border-teal-500/60',
    iconColor: 'text-teal-500',
  },
  {
    role: 'existing' as const,
    title: 'Existing Account',
    description: 'Already have an account? Sign in to access your business.',
    icon: LogIn,
    gradient: 'from-purple-500/20 to-violet-500/20',
    border: 'border-purple-500/30 hover:border-purple-500/60',
    iconColor: 'text-purple-500',
  },
];

function GoogleIcon() {
  return (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<SelectedRole>(null);
  const [joinCode, setJoinCode] = useState('');
  const [joinCodeVerified, setJoinCodeVerified] = useState(false);
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleRoleSelect = (role: SelectedRole) => {
    setSelectedRole(role);
    setJoinCode('');
    setJoinCodeVerified(false);
    // Store selected role in localStorage for post-OAuth flow (not for existing accounts)
    if (role && role !== 'existing') {
      localStorage.setItem('pos_pending_role', role);
    } else {
      localStorage.removeItem('pos_pending_role');
      localStorage.removeItem('pos_pending_join_code');
    }
  };

  const handleJoinCodeSubmit = () => {
    if (joinCode.trim().length < 4) {
      toast.error('Please enter a valid business code');
      return;
    }
    // Store join code for post-auth flow
    localStorage.setItem('pos_pending_join_code', joinCode.trim().toUpperCase());
    setJoinCodeVerified(true);
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { error } = await signIn(email, password);

    if (error) {
      toast.error(error.message);
      setIsLoading(false);
    } else {
      toast.success('Signed in successfully!');
      // Navigation is handled by AuthContext after checking business setup
    }
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const displayName = formData.get('displayName') as string;

    const { error } = await signUp(email, password, displayName);

    if (error) {
      toast.error(error.message);
      setIsLoading(false);
    } else {
      toast.success('Account created! Check your email to confirm.');
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      toast.error('Failed to sign in with Google');
      setIsGoogleLoading(false);
    }
  };

  const goBack = () => {
    if (joinCodeVerified) {
      setJoinCodeVerified(false);
    } else {
      setSelectedRole(null);
      localStorage.removeItem('pos_pending_role');
      localStorage.removeItem('pos_pending_join_code');
    }
  };

  // Step 1: Role Selection
  if (!selectedRole) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-2xl space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg">
              <ShoppingCart className="h-7 w-7 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Smart POS</h1>
            <p className="text-muted-foreground text-lg">
              Who are you? Select your role to continue.
            </p>
          </div>

          {/* Role Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ROLE_CARDS.map(({ role, title, description, icon: Icon, gradient, border, iconColor }) => (
              <button
                key={role}
                onClick={() => handleRoleSelect(role)}
                className={`group relative flex flex-col items-center rounded-xl border-2 ${border} bg-gradient-to-br ${gradient} p-6 text-center transition-all duration-300 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]`}
              >
                <div className={`mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-background/80 shadow-sm group-hover:shadow-md transition-shadow`}>
                  <Icon className={`h-7 w-7 ${iconColor}`} />
                </div>
                <h3 className="font-semibold text-lg">{title}</h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  {description}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Step 2 for Manager/Cashier: Enter Join Code
  if ((selectedRole === 'manager' || selectedRole === 'cashier' || selectedRole === 'salesman') && !joinCodeVerified) {
    const roleLabel = selectedRole === 'manager' ? 'Manager' : selectedRole === 'salesman' ? 'Salesman' : 'Cashier';
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Button
              variant="ghost"
              size="sm"
              className="absolute left-4 top-4"
              onClick={goBack}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <KeyRound className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Join as {roleLabel}</CardTitle>
            <CardDescription>
              Enter the business code shared by your business owner to join their business.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="join-code">Business Code</Label>
              <Input
                id="join-code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="e.g. A1B2C3"
                className="text-center text-2xl tracking-[0.5em] font-mono uppercase"
                maxLength={6}
                autoFocus
              />
              <p className="text-xs text-muted-foreground text-center">
                Ask your business owner for the 6-digit code
              </p>
            </div>
            <Button
              className="w-full"
              onClick={handleJoinCodeSubmit}
              disabled={joinCode.trim().length < 4}
            >
              Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 3: Auth Form (same for all roles, just with different context)
  const roleLabel = selectedRole === 'owner'
    ? 'Business Owner'
    : selectedRole === 'existing'
      ? 'Your Account'
      : selectedRole === 'manager'
        ? 'Manager'
        : selectedRole === 'salesman'
          ? 'Salesman'
          : 'Cashier';

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Button
            variant="ghost"
            size="sm"
            className="absolute left-4 top-4"
            onClick={goBack}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
            <ShoppingCart className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Smart POS</CardTitle>
          <CardDescription>
            {selectedRole === 'owner'
              ? 'Sign in to manage your business'
              : selectedRole === 'existing'
                ? 'Sign in to access your existing account'
                : `Sign in to join as ${roleLabel}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    disabled={isLoading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogleSignIn}
                disabled={isLoading || isGoogleLoading}
              >
                {isGoogleLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <GoogleIcon />
                )}
                Sign in with Google
              </Button>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Display Name</Label>
                  <Input
                    id="signup-name"
                    name="displayName"
                    type="text"
                    placeholder="Your Name"
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    minLength={6}
                    required
                    disabled={isLoading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </form>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogleSignIn}
                disabled={isLoading || isGoogleLoading}
              >
                {isGoogleLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <GoogleIcon />
                )}
                Sign up with Google
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
