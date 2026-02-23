import { useAuth } from '@/contexts/AuthContext';
import { isAfter } from 'date-fns';

export function useSubscription() {
    const { subscription, isSuperAdmin } = useAuth();

    // Super admins have bypass on everything
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
        };
    }

    const status = subscription?.status || 'trialing'; // Default to trialing for new businesses
    const isTrial = status === 'trialing';
    const isExpired = status === 'expired';

    // Active if:
    // - status is 'active' (paid plan)
    // - status is 'trialing' AND (no trial_end set yet, OR trial_end is still in the future)
    // - No subscription at all → treat as active trial (brand new business)
    const isActive = !subscription ||
        status === 'active' ||
        (status === 'trialing' && (!subscription?.trial_end || isAfter(new Date(subscription.trial_end), new Date())));

    // Features based on plan
    const planFeatures = (subscription?.plan?.features as any) || {};
    const canExport = !!planFeatures.can_export;
    const historyLimitDays = planFeatures.history_days || 7; // Default 7 days for trial/expired

    // Businesses can create bills ONLY if active or trialing (not expired)
    const canCreateBill = !isExpired && isActive;

    // Only paid 'active' plans get full history (trial/expired are limited)
    const canViewFullHistory = status === 'active' && !isExpired;

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
    };
}
