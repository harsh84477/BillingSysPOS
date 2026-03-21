import React from 'react';
import { 
  SettingsCard, SettingRow, Toggle 
} from '../../../SettingsUI';

interface TotalsTaxesSectionProps {
  settings: any;
  isAdmin: boolean;
  onUpdate: (patch: any) => void;
  renderSaveBtn: () => React.ReactNode;
}

export default function TotalsTaxesSection({ settings, isAdmin, onUpdate, renderSaveBtn }: TotalsTaxesSectionProps) {
  return (
    <SettingsCard title="Totals & Taxes" subtitle="How amounts are displayed" icon="💰" accent="#ec4899" footer={renderSaveBtn()}>
      <SettingRow 
        label="Show Savings Row" 
        desc="Amount saved by customer" 
        right={<Toggle on={settings?.print_show_savings ?? true} onChange={(v) => onUpdate({ print_show_savings: v })} disabled={!isAdmin} />} 
      />
      <SettingRow 
        label="Amount in Words" 
        desc="Text representation of total" 
        right={<Toggle on={settings?.print_show_amount_in_words ?? true} onChange={(v) => onUpdate({ print_show_amount_in_words: v })} disabled={!isAdmin} />} 
      />
      <SettingRow 
        label="Due Summary" 
        desc="Previous unpaid balance" 
        noBorder 
        right={<Toggle on={settings?.print_show_due_summary ?? true} onChange={(v) => onUpdate({ print_show_due_summary: v })} disabled={!isAdmin} />} 
      />
    </SettingsCard>
  );
}
