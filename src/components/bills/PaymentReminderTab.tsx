// @ts-nocheck
/**
 * components/bills/PaymentReminderTab.tsx — WhatsApp Payment Reminder Tab
 *
 * Shown inside DueBills page. Groups outstanding bills by customer and lets
 * the user send a pre-filled WhatsApp reminder message.
 * - Groups multiple bills per customer → shows total outstanding per customer
 * - "Send WhatsApp" button opens wa.me with pre-filled message
 * - "Log Reminder" button inserts a record into activity_logs
 */
import React, { useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessSettings } from '@/hooks/useBusinessSettings';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { MessageCircle, CheckCircle2, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Props {
  dueBills: any[];
}

export default function PaymentReminderTab({ dueBills }: Props) {
  const { businessId, user } = useAuth();
  const { data: settings } = useBusinessSettings();
  const businessName = settings?.business_name || settings?.print_company_name_text || 'our store';
  const currencySymbol = settings?.currency_symbol || '₹';

  // Fetch last reminder timestamps keyed by customer_id
  const { data: lastReminders = {}, refetch: refetchReminders } = useQuery({
    queryKey: ['whatsapp-reminders', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('description, created_at, target_type')
        .eq('business_id', businessId)
        .eq('action', 'whatsapp_reminder')
        .order('created_at', { ascending: false });
      if (error) throw error;
      // Index by customer_id extracted from description metadata
      const map: Record<string, string> = {};
      (data || []).forEach((log: any) => {
        // description format: "customer_id:<uuid>|..."
        const match = log.description?.match(/customer_id:([^|]+)/);
        if (match && !map[match[1]]) {
          map[match[1]] = log.created_at;
        }
      });
      return map;
    },
    enabled: !!businessId,
  });

  // Group due bills by customer_id
  const customerGroups = useMemo(() => {
    const map: Record<string, {
      customer_id: string;
      name: string;
      phone: string;
      totalDue: number;
      billCount: number;
      bills: any[];
    }> = {};
    for (const bill of dueBills) {
      const cid = bill.customer_id || '__walkin__';
      if (!map[cid]) {
        map[cid] = {
          customer_id: cid,
          name: bill.customers?.name || 'Walk-in',
          phone: bill.customers?.phone || '',
          totalDue: 0,
          billCount: 0,
          bills: [],
        };
      }
      map[cid].totalDue += Number(bill.due_amount || 0);
      map[cid].billCount += 1;
      map[cid].bills.push(bill);
    }
    return Object.values(map).filter(g => g.phone).sort((a, b) => b.totalDue - a.totalDue);
  }, [dueBills]);

  const logMutation = useMutation({
    mutationFn: async ({ customerId, customerName, amount }: { customerId: string; customerName: string; amount: number }) => {
      const { error } = await supabase.from('activity_logs').insert({
        business_id: businessId,
        user_id: user?.id,
        action: 'whatsapp_reminder',
        target_type: 'customer',
        description: `customer_id:${customerId}|Sent WhatsApp reminder to ${customerName} for ${currencySymbol}${amount.toFixed(2)}`,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      refetchReminders();
    },
  });

  const handleSendWhatsApp = (group: typeof customerGroups[0]) => {
    const phone = group.phone.replace(/\D/g, '');
    const billNums = group.bills.map((b: any) => b.bill_number).join(', ');
    const msg = `Dear ${group.name}, you have an outstanding payment of ${currencySymbol}${group.totalDue.toFixed(2)} (Bill${group.billCount > 1 ? 's' : ''}: ${billNums}) at ${businessName}. Kindly clear your dues at the earliest. Thank you.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');

    // Auto-log the reminder
    if (group.customer_id !== '__walkin__') {
      logMutation.mutate({
        customerId: group.customer_id,
        customerName: group.name,
        amount: group.totalDue,
      });
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  if (customerGroups.length === 0) {
    return (
      <EmptyState
        icon="check"
        title="No customers with phone numbers"
        description="Customers need a phone number to receive WhatsApp reminders."
      />
    );
  }

  return (
    <div className="space-y-3 pb-24">
      <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl p-3 flex items-start gap-3">
        <MessageCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
        <p className="text-xs text-green-700 dark:text-green-300">
          Sends a pre-filled WhatsApp message to customers with outstanding dues. Only customers with phone numbers are shown.
        </p>
      </div>

      {customerGroups.map((group) => {
        const lastSent = lastReminders[group.customer_id];
        return (
          <div
            key={group.customer_id}
            className="bg-card border rounded-2xl p-4"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-sm truncate">{group.name}</span>
                  {group.billCount > 1 && (
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      {group.billCount} bills
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                  <Phone className="h-3 w-3" />
                  <span>{group.phone}</span>
                </div>
                {lastSent && (
                  <div className="flex items-center gap-1 text-[10px] text-emerald-600">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Last reminded: {formatDate(lastSent)}</span>
                  </div>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Total Due</p>
                <p className="text-lg font-black text-rose-600">{currencySymbol}{group.totalDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t flex items-center justify-between gap-2">
              <p className="text-[10px] text-muted-foreground truncate">
                {group.bills.slice(0, 3).map((b: any) => b.bill_number).join(', ')}
                {group.bills.length > 3 && ` +${group.bills.length - 3} more`}
              </p>
              <Button
                size="sm"
                className={cn(
                  'h-8 px-3 gap-1.5 text-xs font-semibold shrink-0',
                  'bg-green-600 hover:bg-green-700 text-white'
                )}
                onClick={() => handleSendWhatsApp(group)}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
