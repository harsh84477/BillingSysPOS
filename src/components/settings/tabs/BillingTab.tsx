import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessSettings, useUpdateBusinessSettings } from '@/hooks/useBusinessSettings';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  SettingsCard, ColStack, TwoColGrid, FieldLabel, TextInput, SettingRow, 
  Toggle, SectionLabel, SaveBtn, InfoBox, op 
} from '../SettingsUI';

export default function BillingTab() {
  const { isAdmin, refreshBusinessInfo } = useAuth();
  const { data: settings } = useBusinessSettings();
  const updateSettings = useUpdateBusinessSettings();
  const queryClient = useQueryClient();

  const handleBillingSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    updateSettings.mutate({
      bill_prefix: fd.get('bill_prefix') as string,
      currency: fd.get('currency') as string,
      currency_symbol: fd.get('currency_symbol') as string
    });
  };

  const handleTaxSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    updateSettings.mutate({ tax_rate: Number(fd.get('tax_rate')) });
  };

  const u = (v: any) => isAdmin && updateSettings.mutate(v);

  return (
    <ColStack>
      <TwoColGrid>
        <SettingsCard title="Billing Rules" subtitle="Configure your business billing defaults" icon="📋" accent="#10b981">
          <form onSubmit={handleBillingSubmit}>
            <div style={{ marginBottom: '14px' }}>
              <FieldLabel htmlFor="bill_prefix">Business Bill Prefix</FieldLabel>
              <TextInput id="bill_prefix" name="bill_prefix" defaultValue={settings?.bill_prefix} hint="This prefix identifies your business on all bills." disabled={!isAdmin} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3.5">
              <div><FieldLabel htmlFor="currency">Currency Code</FieldLabel><TextInput id="currency" name="currency" defaultValue={settings?.currency} disabled={!isAdmin} /></div>
              <div><FieldLabel htmlFor="currency_symbol">Symbol</FieldLabel><TextInput id="currency_symbol" name="currency_symbol" defaultValue={settings?.currency_symbol} disabled={!isAdmin} /></div>
            </div>
            {isAdmin && <SaveBtn label="Save Changes" />}
          </form>
        </SettingsCard>
        
        <SettingsCard title="Personal Settings" subtitle="Settings specific to your account" icon="👤" accent="#8b5cf6">
          <div style={{ marginBottom: '14px' }}>
            <FieldLabel htmlFor="my_bill_prefix">Personal Collector Code</FieldLabel>
            <TextInput 
              id="my_bill_prefix" 
              placeholder="e.g. UK" 
              hint="Identifies you as the collector on bills."
              style={{ width: '80px', textTransform: 'uppercase', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700 }}
              onBlur={async (e) => {
                const val = (e.target as HTMLInputElement).value.toUpperCase();
                try {
                  const { error } = await supabase.rpc('update_my_bill_prefix', { _prefix: val });
                  if (error) throw error;
                  toast.success('Your personal code updated!');
                  await refreshBusinessInfo();
                  queryClient.invalidateQueries({ queryKey: ['allUserRoles'] });
                } catch (err: any) {
                  toast.error('Failed: ' + err.message);
                }
              }} 
            />
          </div>
          <InfoBox bg={op('#8b5cf6', 10)} border={`1px solid ${op('#8b5cf6', 30)}`} icon="📌" title="Bill Format Preview" titleColor="#8b5cf6" value={`${settings?.bill_prefix || 'INV'} — CODE — 2024-01 — 001`} valueColor="hsl(var(--foreground))" />
        </SettingsCard>
      </TwoColGrid>

      <SettingsCard title="GST Configuration" subtitle="Tax settings for your business" icon="🧾" accent="#f97316">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <form onSubmit={handleTaxSubmit}>
              <SettingRow label="GST Percentage (%)" desc="Default tax rate for new items"
                right={<TextInput id="tax_rate" name="tax_rate" type="number" defaultValue={String(settings?.tax_rate ?? 0)} disabled={!isAdmin} style={{ width: '80px', textAlign: 'right', fontWeight: 700 }} />} />
              {isAdmin && <SaveBtn label="Update GST Rate" color="#f97316" />}
            </form>
          </div>
          <div>
            <SettingRow label="Show GST in Billing" desc="Display GST toggle and calculation in billing screen" noBorder
              right={<Toggle on={settings?.show_gst_in_billing ?? true} onChange={(v) => u({ show_gst_in_billing: v })} disabled={!isAdmin} />} />
          </div>
        </div>
      </SettingsCard>

      <TwoColGrid>
        <SettingsCard title="Billing Display Options" subtitle="Control which fields are visible" icon="👁️" accent="#3b82f6">
          <SettingRow label="Show Discount in Billing" desc="Display discount input field" noBorder
            right={<Toggle on={settings?.show_discount_in_billing ?? true} onChange={(v) => u({ show_discount_in_billing: v })} disabled={!isAdmin} />} />
        </SettingsCard>
        <SettingsCard title="Other Visibility" subtitle="Extra display settings" icon="🛠️" accent="#64748b">
           <SettingRow label="Stock Badge" desc="Display quantity badge" right={<Toggle on={settings?.show_stock_badge ?? true} onChange={(v) => u({ show_stock_badge: v })} disabled={!isAdmin} />} />
           <SettingRow label="Product Code" desc="Show product SKU" noBorder right={<Toggle on={settings?.show_product_code ?? false} onChange={(v) => u({ show_product_code: v })} disabled={!isAdmin} />} />
        </SettingsCard>
      </TwoColGrid>
    </ColStack>
  );
}
