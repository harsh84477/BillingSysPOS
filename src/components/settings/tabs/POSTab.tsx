import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessSettings, useUpdateBusinessSettings } from '@/hooks/useBusinessSettings';
import { toast } from 'sonner';
import { 
  SettingsCard, ColStack, SettingRow, Toggle, SectionLabel, SelectInput, Counter, InfoBox, op 
} from '../SettingsUI';

export default function POSTab() {
  const { isAdmin } = useAuth();
  const { data: settings } = useBusinessSettings();
  const updateSettings = useUpdateBusinessSettings();

  const u = (v: any) => isAdmin && updateSettings.mutate(v);

  return (
    <ColStack>
      <SettingsCard title="Checkout Buttons" subtitle="Control which action buttons appear during billing checkout" icon="🛒" accent="#10b981">
        <SectionLabel text="Button Visibility" />
        <SettingRow label="Save Bill" desc="Save bill without printing"
          right={<Toggle on={settings?.checkout_save_enabled ?? true} onChange={(v) => {
            const others = [settings?.checkout_print_enabled ?? true, settings?.checkout_save_print_enabled ?? true, settings?.checkout_whatsapp_enabled ?? true, settings?.checkout_draft_enabled ?? true];
            if (!v && !others.some(Boolean)) { toast.error('At least one checkout button must remain enabled.'); return; }
            u({ checkout_save_enabled: v });
          }} disabled={!isAdmin} />} />
        <SettingRow label="Print Bill" desc="Save and send to printer"
          right={<Toggle on={settings?.checkout_print_enabled ?? true} onChange={(v) => {
            const others = [settings?.checkout_save_enabled ?? true, settings?.checkout_save_print_enabled ?? true, settings?.checkout_whatsapp_enabled ?? true, settings?.checkout_draft_enabled ?? true];
            if (!v && !others.some(Boolean)) { toast.error('At least one checkout button must remain enabled.'); return; }
            u({ checkout_print_enabled: v });
          }} disabled={!isAdmin} />} />
        <SettingRow label="Save & Print" desc="Combined save + print action"
          right={<Toggle on={settings?.checkout_save_print_enabled ?? true} onChange={(v) => {
            const others = [settings?.checkout_save_enabled ?? true, settings?.checkout_print_enabled ?? true, settings?.checkout_whatsapp_enabled ?? true, settings?.checkout_draft_enabled ?? true];
            if (!v && !others.some(Boolean)) { toast.error('At least one checkout button must remain enabled.'); return; }
            u({ checkout_save_print_enabled: v });
          }} disabled={!isAdmin} />} />
        <SettingRow label="Save & WhatsApp" desc="Save bill and send invoice via WhatsApp"
          right={<Toggle on={settings?.checkout_whatsapp_enabled ?? true} onChange={(v) => {
            const others = [settings?.checkout_save_enabled ?? true, settings?.checkout_print_enabled ?? true, settings?.checkout_save_print_enabled ?? true, settings?.checkout_draft_enabled ?? true];
            if (!v && !others.some(Boolean)) { toast.error('At least one checkout button must remain enabled.'); return; }
            u({ checkout_whatsapp_enabled: v });
          }} disabled={!isAdmin} />} />
        <SettingRow label="Save as Draft" desc="Save unfinished bill to resume later" noBorder
          right={<Toggle on={settings?.checkout_draft_enabled ?? true} onChange={(v) => {
            const others = [settings?.checkout_save_enabled ?? true, settings?.checkout_print_enabled ?? true, settings?.checkout_save_print_enabled ?? true, settings?.checkout_whatsapp_enabled ?? true];
            if (!v && !others.some(Boolean)) { toast.error('At least one checkout button must remain enabled.'); return; }
            u({ checkout_draft_enabled: v });
          }} disabled={!isAdmin} />} />
        <InfoBox bg={op('#10b981', 8)} border={`1px solid ${op('#10b981', 25)}`} icon="💡" title="Tip" titleColor="#10b981" value="At least one checkout button must stay enabled. Salesmen always see Draft button only." />
      </SettingsCard>

      <SettingsCard title="Product Selection" subtitle="Manage how products are added to the cart" icon="👆" accent="#3b82f6">
        <SectionLabel text="Click Behavior" />
        <SettingRow label="Ask Quantity First" desc="Open a pop-up to enter quantity instead of auto-adding 1 item when clicking a product" noBorder
          right={<Toggle on={settings?.ask_quantity_first ?? false} onChange={(v) => u({ ask_quantity_first: v })} disabled={!isAdmin} />} />
      </SettingsCard>

      <SettingsCard title="Payment Methods" subtitle="Configure accepted payment methods and defaults" icon="💳" accent="#8b5cf6">
        <SectionLabel text="Default Payment Method" />
        <SettingRow label="Default Method" desc="Automatically selected when starting a new bill"
          right={<SelectInput
            value={settings?.default_payment_method || 'cash'}
            onChange={(v) => u({ default_payment_method: v })}
            disabled={!isAdmin}
            options={[
              { value: 'cash', label: 'Cash' },
              { value: 'online', label: 'UPI / Online' },
              { value: 'split', label: 'Split Payment' },
              { value: 'due', label: 'Due (Unpaid)' },
            ]}
          />}
        />
        <SectionLabel text="Available Methods" />
        <SettingRow label="Cash" desc="Accept cash payments"
          right={<Toggle on={settings?.enable_payment_cash ?? true} onChange={(v) => u({ enable_payment_cash: v })} disabled={!isAdmin} />} />
        <SettingRow label="UPI / Online" desc="Accept digital payments"
          right={<Toggle on={settings?.enable_payment_online ?? true} onChange={(v) => u({ enable_payment_online: v })} disabled={!isAdmin} />} />
        <SettingRow label="Split Payment" desc="Accept payment split across multiple methods"
          right={<Toggle on={settings?.enable_payment_split ?? true} onChange={(v) => u({ enable_payment_split: v })} disabled={!isAdmin} />} />
        <SettingRow label="Due Bill" desc="Allow bills to be marked as unpaid/due" noBorder
          right={<Toggle on={settings?.enable_payment_due ?? true} onChange={(v) => u({ enable_payment_due: v })} disabled={!isAdmin} />} />
      </SettingsCard>

      <SettingsCard title="Grid & Sizes" subtitle="Configure product grid and sizes for POS screen" icon="📱" accent="#3b82f6">
        <SettingRow label="Desktop Columns" desc="Number of product columns (2–8)"
          right={<Counter value={settings?.product_columns ?? 5} min={2} max={8} onChange={(v) => u({ product_columns: v })} disabled={!isAdmin} />} />
        <SettingRow label="Grid Gap" desc="Spacing between cards (px)"
          right={<Counter value={settings?.grid_gap ?? 8} min={4} max={30} onChange={(v) => u({ grid_gap: v })} disabled={!isAdmin} />} />
        <SettingRow label="Mobile Columns" desc="Number of columns on mobile" noBorder
          right={<Counter value={settings?.mobile_product_columns ?? 3} min={2} max={4} onChange={(v) => u({ mobile_product_columns: v })} disabled={!isAdmin} />} />
      </SettingsCard>
    </ColStack>
  );
}
