import { useAuth } from '@/contexts/AuthContext';
import { isAfter } from 'date-fns';

export function useSubscription() {
    const { subscription, subscriptionLoading, isSuperAdmin } = useAuth();

    // Super admins bypass everything
    if (isSuperAdmin) {
        return {
            subscription,
            status: 'active',
            isTrial: false,
            isActive: true,
            isExpired: false,
            canCreateBill: true,
            canViewFullHistory: true,
            canExport: true,
            historyLimitDays: -1,
            planName: 'Super Admin',
            loading: false,
        };
    }

    if (subscriptionLoading) {
        return {
            subscription: null,
            status: 'loading',
            isTrial: false,
            isActive: true, // Optimistically active while loading
            isExpired: false,
            canCreateBill: true,
            canViewFullHistory: true,
            canExport: true,
            historyLimitDays: -1,
            planName: 'Loading...',
            loading: true,
        };
    }

    const status = subscription?.status || 'trialing'; // Default to trialing for new businesses
    const isTrial = status === 'trialing';
    const isExpired = status === 'expired';

    // Active if:
    // - No subscription row at all → brand new business, treat as active trial
    // - status is 'active' (paid plan)
    // - status is 'trialing' AND (no trial_end set yet, OR trial_end is still in the future)
    const isActive =
        !subscription ||
        status === 'active' ||
        (isTrial && (!subscription?.trial_end || isAfter(new Date(subscription.trial_end), new Date())));

    // During trial → unlock EVERYTHING (bills, export, full history)
    // Paid active plan → use plan-specific feature flags
    const planFeatures = (subscription?.plan?.features as any) || {};
    const canExport = isTrial || !!planFeatures.can_export;
    const canViewFullHistory = isTrial || status === 'active';
    const historyLimitDays = (isTrial || status === 'active') ? -1 : (planFeatures.history_days || 7);

    // Can create bills as long as not expired AND isActive
    const canCreateBill = !isExpired && isActive;

    return {
        subscription,
        status,
        isTrial,
        isActive,
        isExpired,
        canCreateBill,
        canViewFullHistory,
        canExport,
        historyLimitDays,
        planName: subscription?.plan?.name || 'Free Trial',
        loading: false,
    };
}
