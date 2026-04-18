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

    // Free lifetime mode: status 'active', period_end >= 2099, no paid plan
    const isFreeLifetime =
        status === 'active' &&
        (!subscription?.plan?.id || subscription?.plan?.price === 0) &&
        subscription?.current_period_end &&
        new Date(subscription.current_period_end).getFullYear() >= 2099;

    // Active if:
    // - No subscription row at all → brand new business, treat as active trial
    // - status is 'active' (paid plan or free lifetime)
    // - status is 'trialing' AND (no trial_end set yet, OR trial_end is still in the future)
    const isActive =
        !subscription ||
        status === 'active' ||
        (isTrial && (!subscription?.trial_end || isAfter(new Date(subscription.trial_end), new Date())));

    // Feature limits
    let canExport = true;
    let canViewFullHistory = true;
    let historyLimitDays = -1;
    let maxBillsPerDay = undefined;
    let maxItemsPerDay = undefined;
    let planName = subscription?.plan?.name || 'Free Trial';

    if (isFreeLifetime) {
        // Free lifetime: restrict features
        canExport = false;
        canViewFullHistory = false;
        historyLimitDays = 1; // Only today
        maxBillsPerDay = 250;
        maxItemsPerDay = 250;
        planName = 'Free Lifetime';
    } else if (isTrial) {
        // Trial: restrict features (same as free lifetime)
        canExport = false;
        canViewFullHistory = false;
        historyLimitDays = 1;
        maxBillsPerDay = 250;
        maxItemsPerDay = 250;
        planName = 'Free Trial';
    } else if (status === 'active') {
        // Paid plan: use plan features
        const planFeatures = (subscription?.plan?.features as any) || {};
        canExport = !!planFeatures.can_export;
        canViewFullHistory = true;
        historyLimitDays = -1;
        maxBillsPerDay = planFeatures.max_bills_per_day || undefined;
        maxItemsPerDay = planFeatures.max_items_per_day || undefined;
        planName = subscription?.plan?.name || 'Paid Plan';
    } else {
        // Expired or unknown: restrict everything
        canExport = false;
        canViewFullHistory = false;
        historyLimitDays = 0;
        maxBillsPerDay = 0;
        maxItemsPerDay = 0;
        planName = 'No Plan';
    }

    // Can create bills as long as not expired AND isActive
    const canCreateBill = !isExpired && isActive;

    return {
        subscription,
        status,
        isTrial,
        isActive,
        isExpired,
        isFreeLifetime,
        canCreateBill,
        canViewFullHistory,
        canExport,
        historyLimitDays,
        maxBillsPerDay,
        maxItemsPerDay,
        planName,
        loading: false,
    };
}
