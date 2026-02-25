// ============================================================
// CUSTOMER CREDIT COMPONENT
// ============================================================
// Location: src/components/billing/CustomerCreditDialog.tsx

import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, AlertCircle } from 'lucide-react';

interface CustomerCreditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creditStatus: any;
  onOverride?: () => void;
  totalBillAmount: number;
}

export function CustomerCreditDialog({
  open,
  onOpenChange,
  creditStatus,
  onOverride,
  totalBillAmount,
}: CustomerCreditDialogProps) {
  const [isOverriding, setIsOverriding] = useState(false);

  if (!creditStatus) return null;

  const warningLevel = (creditStatus.current_balance / creditStatus.credit_limit) * 100;
  const willExceed =
    (creditStatus.current_balance + totalBillAmount) / creditStatus.credit_limit * 100 > 100;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[500px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Credit Limit Alert
          </AlertDialogTitle>
          <AlertDialogDescription>
            Customer credit usage is above threshold
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* Credit Status Card */}
          <Card className="p-4 border-2 border-orange-200 bg-orange-50">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Credit Limit</span>
                <Badge variant="outline">₹{creditStatus.credit_limit.toFixed(2)}</Badge>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span>Current Usage</span>
                  <span className="font-semibold">
                    {warningLevel.toFixed(1)}%
                  </span>
                </div>
                <Progress value={Math.min(warningLevel, 100)} className="h-2" />
                <p className="text-xs text-gray-600">
                  ₹{creditStatus.current_balance.toFixed(2)} of ₹{creditStatus.credit_limit.toFixed(2)}
                </p>
              </div>

              <div className="pt-2 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Available Credit</span>
                  <Badge
                    variant={creditStatus.available_credit > 0 ? 'default' : 'destructive'}
                  >
                    ₹{creditStatus.available_credit.toFixed(2)}
                  </Badge>
                </div>
              </div>
            </div>
          </Card>

          {/* Bill Impact */}
          {willExceed && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This bill (₹{totalBillAmount.toFixed(2)}) will exceed the credit limit.
                <br />
                New balance would be: ₹
                {(creditStatus.current_balance + totalBillAmount).toFixed(2)}
              </AlertDescription>
            </Alert>
          )}

          {creditStatus.is_warning && !willExceed && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Credit usage is above {creditStatus.warning_threshold}% threshold.
              </AlertDescription>
            </Alert>
          )}

          {/* Info Message */}
          <Card className="p-3 bg-blue-50 border-blue-200">
            <p className="text-sm text-blue-900">
              Only Manager/Owner roles can override credit limits. Contact your manager if you need
              approval.
            </p>
          </Card>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          {onOverride && (
            <AlertDialogAction
              onClick={() => {
                setIsOverriding(true);
                onOverride();
              }}
              disabled={isOverriding}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isOverriding ? 'Requesting...' : 'Override (Manager)'}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
