// ============================================================
// SPLIT PAYMENT COMPONENT
// ============================================================
// Location: src/components/billing/SplitPaymentModal.tsx

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { useSplitPayment } from '@/hooks/useBillingSystem';
import { CreditCard, Banknote, QrCode, DollarSign, Trash2 } from 'lucide-react';

interface SplitPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billId: string;
  totalAmount: number;
  onPaymentComplete?: () => void;
}

export function SplitPaymentModal({
  open,
  onOpenChange,
  billId,
  totalAmount,
  onPaymentComplete,
}: SplitPaymentModalProps) {
  const { payments, totalPaid, addPayment, isLoading } = useSplitPayment(billId);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'card' | 'credit'>('cash');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  const remaining = totalAmount - totalPaid;
  const isFullyPaid = remaining <= 0;

  const handleAddPayment = () => {
    if (!amount || parseFloat(amount) <= 0) return;

    addPayment({
      payment_mode: paymentMode,
      amount: parseFloat(amount),
      transaction_reference: reference || undefined,
      notes: notes || undefined,
    });

    // Reset form
    setAmount('');
    setReference('');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Split Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Payment Summary */}
          <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold">₹{totalAmount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Paid</p>
                <p className="text-2xl font-bold text-green-600">₹{totalPaid.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Remaining</p>
                <p className={`text-2xl font-bold ${isFullyPaid ? 'text-green-600' : 'text-orange-600'}`}>
                  ₹{remaining.toFixed(2)}
                </p>
              </div>
            </div>
          </Card>

          {/* Payment History */}
          {payments && payments.length > 0 && (
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Payment History</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {payments.map((payment, idx) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <div className="flex items-center gap-3">
                      {payment.payment_mode === 'cash' && <Banknote className="w-4 h-4" />}
                      {payment.payment_mode === 'upi' && <QrCode className="w-4 h-4" />}
                      {payment.payment_mode === 'card' && <CreditCard className="w-4 h-4" />}
                      {payment.payment_mode === 'credit' && <DollarSign className="w-4 h-4" />}
                      <div>
                        <p className="font-medium capitalize">{payment.payment_mode}</p>
                        <p className="text-xs text-gray-600">
                          {new Date(payment.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold">₹{payment.amount.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Add Payment Form */}
          {!isFullyPaid && (
            <Card className="p-4 space-y-4">
              <h3 className="font-semibold">Add Payment</h3>

              <div className="space-y-2">
                <Label>Payment Mode</Label>
                <Select value={paymentMode} onValueChange={(val: any) => setPaymentMode(val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="credit">Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Amount (₹)</Label>
                <Input
                  type="number"
                  placeholder={`Max: ₹${remaining.toFixed(2)}`}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  max={remaining}
                  step="0.01"
                />
              </div>

              {paymentMode !== 'cash' && (
                <>
                  <div className="space-y-2">
                    <Label>Transaction Reference (Optional)</Label>
                    <Input
                      placeholder="UPI ID / Card Last 4 Digits"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Input
                  placeholder="Add payment notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <Button
                onClick={handleAddPayment}
                disabled={!amount || parseFloat(amount) <= 0 || isLoading}
                className="w-full"
              >
                {isLoading ? 'Adding...' : 'Add Payment'}
              </Button>
            </Card>
          )}
        </div>

        <DialogFooter>
          {isFullyPaid && (
            <div className="w-full text-center p-4 bg-green-50 rounded-lg">
              <p className="text-green-700 font-semibold">✓ Bill fully paid</p>
            </div>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isFullyPaid ? 'Done' : 'Close'}
          </Button>
          {onPaymentComplete && isFullyPaid && (
            <Button onClick={onPaymentComplete}>Finalize Bill</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
