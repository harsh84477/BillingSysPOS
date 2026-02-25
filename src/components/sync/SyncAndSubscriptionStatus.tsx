// ============================================================
// OFFLINE SYNC & SUBSCRIPTION STATUS COMPONENTS
// ============================================================
// Location: src/components/sync/OfflineSyncStatus.tsx

import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useOfflineSync } from '@/hooks/useBillingSystem';
import { Wifi, WifiOff, Clock, CheckCircle2, AlertCircle, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OfflineSyncStatusProps {
  businessId: string;
  userId: string;
}

export function OfflineSyncStatus({ businessId, userId }: OfflineSyncStatusProps) {
  const { syncStatus, pendingCount, getPendingCount } = useOfflineSync(businessId, userId);
  const isOnline = navigator.onLine;

  React.useEffect(() => {
    getPendingCount();
    const interval = setInterval(getPendingCount, 5000);
    return () => clearInterval(interval);
  }, [getPendingCount]);

  if (isOnline && syncStatus === 'synced') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'gap-2 rounded-full transition-all',
              !isOnline && 'bg-red-50 border-red-200 hover:bg-red-100',
              isOnline && syncStatus === 'syncing' && 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100',
              isOnline && syncStatus === 'synced' && 'bg-green-50 border-green-200 hover:bg-green-100'
            )}
          >
            {!isOnline && (
              <>
                <WifiOff className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-red-700">Offline</span>
                {pendingCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {pendingCount}
                  </Badge>
                )}
              </>
            )}
            {isOnline && syncStatus === 'syncing' && (
              <>
                <Clock className="w-4 h-4 text-yellow-600 animate-spin" />
                <span className="text-sm font-medium text-yellow-700">Syncing...</span>
              </>
            )}
            {isOnline && syncStatus === 'synced' && (
              <>
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">Synced</span>
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <div className="space-y-3 p-4">
            {!isOnline && (
              <>
                <div className="flex items-center gap-3">
                  <WifiOff className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="font-semibold text-sm">Offline Mode</p>
                    <p className="text-xs text-gray-600">
                      Your changes will be synced when you're back online
                    </p>
                  </div>
                </div>
                {pendingCount > 0 && (
                  <Alert variant="destructive" className="border-red-200">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {pendingCount} pending operation{pendingCount > 1 ? 's' : ''} waiting to sync
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}

            {isOnline && syncStatus === 'syncing' && (
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-yellow-600 animate-spin" />
                <div>
                  <p className="font-semibold text-sm">Synchronizing</p>
                  <p className="text-xs text-gray-600">Uploading offline changes...</p>
                </div>
              </div>
            )}

            {isOnline && syncStatus === 'synced' && (
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-semibold text-sm">All Synced</p>
                  <p className="text-xs text-gray-600">Your data is up to date</p>
                </div>
              </div>
            )}

            <DropdownMenuItem asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={getPendingCount}
              >
                <Download className="w-4 h-4" />
                Refresh Status
              </Button>
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ============================================================
// SUBSCRIPTION STATUS BANNER
// ============================================================
// Location: src/components/subscription/SubscriptionBanner.tsx

import { useSubscriptionStatus } from '@/hooks/useBillingSystem';
import { AlertTriangle, Clock, Lock } from 'lucide-react';

interface SubscriptionBannerProps {
  businessId: string;
}

export function SubscriptionBanner({ businessId }: SubscriptionBannerProps) {
  const { subscription, isActive, isExpired, daysUntilExpiration } =
    useSubscriptionStatus(businessId);

  if (isActive && daysUntilExpiration > 7) {
    return null;
  }

  if (isExpired) {
    return (
      <Alert className="border-red-200 bg-red-50 mb-4">
        <Lock className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          <strong>Subscription Expired</strong> - Your subscription has expired. Analytics and
          exports are disabled. Please renew your subscription to continue.
          <Button variant="link" className="text-red-700 underline ml-2 p-0 h-auto">
            Renew Now
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (daysUntilExpiration <= 7 && daysUntilExpiration > 0) {
    return (
      <Alert className="border-yellow-200 bg-yellow-50 mb-4">
        <Clock className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800">
          <strong>Subscription Expiring Soon</strong> - Your subscription expires in {daysUntilExpiration}{' '}
          days. Renew now to avoid service interruption.
          <Button variant="link" className="text-yellow-700 underline ml-2 p-0 h-auto">
            Renew Subscription
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (subscription?.status === 'trialing') {
    return (
      <Alert className="border-blue-200 bg-blue-50 mb-4">
        <AlertTriangle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Trial Period</strong> - You have {daysUntilExpiration} days remaining in your trial.
          Choose a plan to continue after trial expires.
          <Button variant="link" className="text-blue-700 underline ml-2 p-0 h-auto">
            Choose Plan
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
