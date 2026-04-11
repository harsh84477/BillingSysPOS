/**
 * components/settings/tabs/LoyaltyTab.tsx — Customer Loyalty Program Settings
 *
 * Lets admins configure the loyalty points program:
 *  - Enable / disable the program globally
 *  - Earn rate: how many points per ₹100 spent
 *  - Burn rate: ₹ value per point when redeeming
 *  - Minimum points to redeem
 *  - Max % of bill value that can be paid with points
 */
import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  SettingsCard, ColStack, TwoColGrid, FieldLabel, TextInput, SettingRow,
  Toggle, SaveBtn, InfoBox, op,
} from '../SettingsUI';
import { toast } from 'sonner';

export default function LoyaltyTab() {
  const { businessId, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const { data: program, isLoading } = useQuery({
    queryKey: ['loyalty-program', businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('loyalty_programs' as any)
        .select('*')
        .eq('business_id', businessId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  const [form, setForm] = useState({
    is_enabled: false,
    earn_rate: '1',
    burn_rate: '1',
    min_redeem_pts: '50',
    max_redeem_pct: '20',
  });

  useEffect(() => {
    if (program) {
      setForm({
        is_enabled: program.is_enabled,
        earn_rate: String(program.earn_rate),
        burn_rate: String(program.burn_rate),
        min_redeem_pts: String(program.min_redeem_pts),
        max_redeem_pct: String(program.max_redeem_pct),
      });
    }
  }, [program]);

  const saveMutation = useMutation({
    mutationFn: async (values: typeof form) => {
      const payload = {
        business_id: businessId,
        is_enabled: values.is_enabled,
        earn_rate: Number(values.earn_rate),
        burn_rate: Number(values.burn_rate),
        min_redeem_pts: Number(values.min_redeem_pts),
        max_redeem_pct: Number(values.max_redeem_pct),
        updated_at: new Date().toISOString(),
      };
      if (program) {
        const { error } = await (supabase as any).from('loyalty_programs').update(payload).eq('business_id', businessId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('loyalty_programs').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Loyalty settings saved');
      queryClient.invalidateQueries({ queryKey: ['loyalty-program', businessId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(form);
  };

  const earnRateNum = Number(form.earn_rate) || 1;
  const burnRateNum = Number(form.burn_rate) || 1;

  return (
    <ColStack>
      <TwoColGrid>
        <SettingsCard title="Loyalty Program" subtitle="Reward customers for every purchase" icon="⭐" accent="#f59e0b">
          <form onSubmit={handleSubmit}>
            <SettingRow
              label="Enable Loyalty Program"
              desc="Customers earn points on completed bills"
              right={
                <Toggle
                  on={form.is_enabled}
                  onChange={(v) => setForm(f => ({ ...f, is_enabled: v }))}
                  disabled={!isAdmin}
                />
              }
            />

            <div style={{ marginTop: 20, opacity: form.is_enabled ? 1 : 0.5, pointerEvents: form.is_enabled ? 'auto' : 'none' }}>
              <div style={{ marginBottom: 14 }}>
                <FieldLabel htmlFor="earn_rate">Points per ₹100 spent</FieldLabel>
                <TextInput
                  id="earn_rate"
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={form.earn_rate}
                  onChange={(e: any) => setForm(f => ({ ...f, earn_rate: e.target.value }))}
                  hint={`Customer earns ${earnRateNum} point${earnRateNum !== 1 ? 's' : ''} for every ₹100 spent`}
                  disabled={!isAdmin}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <FieldLabel htmlFor="burn_rate">₹ discount per point redeemed</FieldLabel>
                <TextInput
                  id="burn_rate"
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={form.burn_rate}
                  onChange={(e: any) => setForm(f => ({ ...f, burn_rate: e.target.value }))}
                  hint={`1 point = ₹${burnRateNum} discount at checkout`}
                  disabled={!isAdmin}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <FieldLabel htmlFor="min_redeem_pts">Minimum points to redeem</FieldLabel>
                <TextInput
                  id="min_redeem_pts"
                  type="number"
                  min="1"
                  value={form.min_redeem_pts}
                  onChange={(e: any) => setForm(f => ({ ...f, min_redeem_pts: e.target.value }))}
                  hint="Customer must have at least this many points before redeeming"
                  disabled={!isAdmin}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <FieldLabel htmlFor="max_redeem_pct">Max % of bill payable with points</FieldLabel>
                <TextInput
                  id="max_redeem_pct"
                  type="number"
                  min="1"
                  max="100"
                  value={form.max_redeem_pct}
                  onChange={(e: any) => setForm(f => ({ ...f, max_redeem_pct: e.target.value }))}
                  hint={`Customer can use points to pay up to ${form.max_redeem_pct}% of any bill`}
                  disabled={!isAdmin}
                />
              </div>
            </div>

            {isAdmin && <SaveBtn label={saveMutation.isPending ? 'Saving…' : 'Save Loyalty Settings'} />}
          </form>
        </SettingsCard>

        <SettingsCard title="How It Works" subtitle="Understanding earn & redeem" icon="💡" accent="#6366f1">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <InfoBox
              icon="🛍️"
              title={`A ₹500 bill earns ${Math.floor((500 / 100) * (Number(form.earn_rate) || 1))} points`}
              value={`Earn: ${form.earn_rate} pt / ₹100`}
              bg={op('#f59e0b', 8)}
              border={'1px solid ' + op('#f59e0b', 25)}
              valueColor="#d97706"
            />
            <InfoBox
              icon="🎁"
              title={`${form.min_redeem_pts} points = ₹${(Number(form.min_redeem_pts) * Number(form.burn_rate)).toFixed(2)} discount`}
              value={`Redeem: ₹${form.burn_rate} / pt`}
              bg={op('#10b981', 8)}
              border={'1px solid ' + op('#10b981', 25)}
              valueColor="#059669"
            />
            <InfoBox
              icon="🔒"
              title="Prevents full bill payment with just points"
              value={`Max: ${form.max_redeem_pct}% of bill`}
              bg={op('#6366f1', 8)}
              border={'1px solid ' + op('#6366f1', 25)}
              valueColor="#4f46e5"
            />

            <div style={{
              marginTop: 8,
              padding: '10px 14px',
              borderRadius: 10,
              background: op('#f59e0b', 8),
              border: '1px solid ' + op('#f59e0b', 25),
              fontSize: 12,
              color: 'hsl(var(--foreground))',
              lineHeight: 1.6,
            }}>
              Points are automatically awarded when a bill is <strong>finalized</strong>. They can be redeemed at the billing screen when a customer is selected.
            </div>
          </div>
        </SettingsCard>
      </TwoColGrid>
    </ColStack>
  );
}
