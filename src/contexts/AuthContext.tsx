import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'manager' | 'cashier';

interface BusinessInfo {
  id: string;
  business_name: string;
  join_code: string;
  mobile_number: string;
  owner_id: string;
}

interface SubscriptionInfo {
  status: 'active' | 'trialing' | 'expired' | 'cancelled';
  trial_end: string | null;
  current_period_end: string | null;
  plan: {
    name: string;
    features: any;
  } | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: AppRole | null;
  billPrefix: string | null;
  businessId: string | null;
  businessInfo: BusinessInfo | null;
  subscription: SubscriptionInfo | null;
  isSuperAdmin: boolean;
  needsBusinessSetup: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  joinBusiness: (joinCode: string, role: AppRole) => Promise<{ error: string | null }>;
  refreshBusinessInfo: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
  isAdmin: boolean;
  isManager: boolean;
  isCashier: boolean;
  isStaff: boolean; // backwards compat: true for manager (replaces old staff role)
  isViewer: boolean; // backwards compat: true for cashier
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [billPrefix, setBillPrefix] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [needsBusinessSetup, setNeedsBusinessSetup] = useState(false);

  const fetchUserRole = async (userId: string): Promise<AppRole | null> => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role, business_id, bill_prefix')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user role:', error);
        return null;
      }

      if (data?.business_id) {
        setBusinessId(data.business_id);
      }

      if (data?.bill_prefix) {
        setBillPrefix(data.bill_prefix);
      } else {
        setBillPrefix(null);
      }

      return data?.role as AppRole | null;
    } catch (error) {
      console.error('Error fetching user role:', error);
      return null;
    }
  };

  const fetchBusinessInfo = async (userId: string): Promise<void> => {
    try {
      // First check user_roles - this is the most reliable check
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('business_id, role')
        .eq('user_id', userId)
        .maybeSingle();

      if (roleData?.business_id) {
        // User has a role with a business - fetch business info
        const { data: biz } = await supabase
          .from('businesses')
          .select('id, business_name, join_code, mobile_number, owner_id')
          .eq('id', roleData.business_id)
          .maybeSingle();

        if (biz) {
          setBusinessInfo(biz);
          setBusinessId(biz.id);
          setNeedsBusinessSetup(false);
          // Clean up pending data
          localStorage.removeItem('pos_pending_role');
          localStorage.removeItem('pos_pending_join_code');
          return;
        }
      }

      // Also check if user owns a business directly (in case user_roles is missing)
      const { data: ownedBusiness } = await supabase
        .from('businesses')
        .select('id, business_name, join_code, mobile_number, owner_id')
        .eq('owner_id', userId)
        .maybeSingle();

      if (ownedBusiness) {
        setBusinessInfo(ownedBusiness);
        setBusinessId(ownedBusiness.id);
        setNeedsBusinessSetup(false);
        localStorage.removeItem('pos_pending_role');
        localStorage.removeItem('pos_pending_join_code');
        return;
      }

      // User has no business — check the pending role
      const pendingRole = localStorage.getItem('pos_pending_role');
      if (pendingRole === 'owner') {
        setNeedsBusinessSetup(true);
      } else if (pendingRole === 'manager' || pendingRole === 'cashier') {
        // Try to join with pending code
        const pendingCode = localStorage.getItem('pos_pending_join_code');
        if (pendingCode) {
          const dbRole = pendingRole === 'manager' ? 'manager' : 'cashier';
          await joinBusinessInternal(pendingCode, dbRole as AppRole, userId);
        }
      } else {
        // No pending role, no business - they need to pick a role
        setNeedsBusinessSetup(false);
      }
    } catch (error) {
      console.error('Error fetching business info:', error);
    }
  };

  const fetchSuperAdminStatus = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('super_admins')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      return !!data;
    } catch (error) {
      return false;
    }
  };

  const fetchSubscription = async (bizId: string): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          status,
          trial_end,
          current_period_end,
          plan:subscription_plans (
            name,
            features
          )
        `)
        .eq('business_id', bizId)
        .maybeSingle();

      if (data) {
        setSubscription({
          status: data.status as any,
          trial_end: data.trial_end,
          current_period_end: data.current_period_end,
          plan: data.plan as any
        });
      } else {
        setSubscription(null);
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };

  const joinBusinessInternal = async (
    joinCode: string,
    role: AppRole,
    userId: string
  ): Promise<{ error: string | null }> => {
    try {
      const { data, error } = await supabase.rpc('join_business', {
        _join_code: joinCode,
        _user_id: userId,
        _role: role,
      });

      // Clean up localStorage
      localStorage.removeItem('pos_pending_role');
      localStorage.removeItem('pos_pending_join_code');

      if (error) {
        return { error: error.message };
      }

      const result = data as any;

      if (!result.success) {
        return { error: result.error };
      }

      // Refresh state
      setBusinessId(result.business_id);
      setUserRole(role);
      setNeedsBusinessSetup(false);

      // Fetch full business info
      const { data: biz } = await supabase
        .from('businesses')
        .select('id, business_name, join_code, mobile_number, owner_id')
        .eq('id', result.business_id)
        .maybeSingle();

      if (biz) {
        setBusinessInfo(biz);
      }

      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'Failed to join business' };
    }
  };

  const setupUserState = useCallback(async (currentSession: Session | null) => {
    setSession(currentSession);
    setUser(currentSession?.user ?? null);

    if (currentSession?.user) {
      const role = await fetchUserRole(currentSession.user.id);
      setUserRole(role);

      const superStatus = await fetchSuperAdminStatus(currentSession.user.id);
      setIsSuperAdmin(superStatus);

      await fetchBusinessInfo(currentSession.user.id);
    } else {
      setUserRole(null);
      setIsSuperAdmin(false);
      setBusinessId(null);
      setBusinessInfo(null);
      setSubscription(null);
      setNeedsBusinessSetup(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (businessId) {
      fetchSubscription(businessId);
    }
  }, [businessId]);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        // Use setTimeout to avoid potential deadlocks with Supabase
        setTimeout(() => {
          setupUserState(session);
        }, 0);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setupUserState(session);
    });

    return () => subscription.unsubscribe();
  }, [setupUserState]);

  const signUp = async (email: string, password: string, displayName?: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            display_name: displayName || email,
          },
        },
      });
      return { error: error ? new Error(error.message) : null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error: error ? new Error(error.message) : null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) {
      console.error('Google sign-in error:', error.message);
    }
  };

  const signOut = async () => {
    localStorage.removeItem('pos_pending_role');
    localStorage.removeItem('pos_pending_join_code');
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserRole(null);
    setBillPrefix(null);
    setBusinessId(null);
    setBusinessInfo(null);
    setSubscription(null);
    setIsSuperAdmin(false);
    setNeedsBusinessSetup(false);
  };

  const joinBusiness = async (joinCode: string, role: AppRole): Promise<{ error: string | null }> => {
    if (!user) return { error: 'Not authenticated' };
    return joinBusinessInternal(joinCode, role, user.id);
  };

  const refreshBusinessInfo = async () => {
    if (user) {
      const role = await fetchUserRole(user.id);
      setUserRole(role);
      await fetchBusinessInfo(user.id);
      if (businessId) {
        await fetchSubscription(businessId);
      }
    }
  };

  const refreshSubscription = async () => {
    if (businessId) {
      await fetchSubscription(businessId);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    userRole,
    billPrefix,
    businessId,
    businessInfo,
    subscription,
    isSuperAdmin,
    needsBusinessSetup,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    joinBusiness,
    refreshBusinessInfo,
    refreshSubscription,
    isAdmin: userRole === 'admin',
    isManager: userRole === 'manager',
    isCashier: userRole === 'cashier',
    isStaff: userRole === 'manager', // backwards compat
    isViewer: userRole === 'cashier', // backwards compat
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
