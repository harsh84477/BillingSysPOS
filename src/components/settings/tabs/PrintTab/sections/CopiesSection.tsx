import React from 'react';
import { 
  SettingsCard, SettingRow, Counter, TextInput 
} from '../../../SettingsUI';

interface CopiesSectionProps {
  settings: any;
  isAdmin: boolean;
  onUpdate: (patch: any) => void;
  renderSaveBtn: () => React.ReactNode;
}

export default function CopiesSection({ settings, isAdmin, onUpdate, renderSaveBtn }: CopiesSectionProps) {
  return (
    <SettingsCard title="Copies & Count" subtitle="Number of copies to generate" icon="📄" accent="#f59e0b" footer={renderSaveBtn()}>
      <SettingRow 
        label="Billing Copies" 
        desc="Total number of invoices to print" 
        right={
          <Counter 
            value={settings?.print_billing_copies || 1} 
            min={1} max={5} 
            onChange={(v) => onUpdate({ print_billing_copies: v })} 
            disabled={!isAdmin} 
          />
        } 
      />
      <SettingRow 
        label="Extra Copies Label" 
        desc="Label for additional printouts" 
        noBorder 
        right={
          <TextInput 
            value={settings?.print_extra_copy_label || 'OFFICE COPY'} 
            onChange={(e) => onUpdate({ print_extra_copy_label: e.target.value })} 
            disabled={!isAdmin} 
            placeholder="e.g. DUPLICATE" 
          />
        } 
      />
    </SettingsCard>
  );
}
