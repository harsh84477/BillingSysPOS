import React from 'react';
import { 
  SettingsCard, SettingRow, Toggle 
} from '../../../SettingsUI';

interface ItemTableSectionProps {
  settings: any;
  isAdmin: boolean;
  onUpdate: (patch: any) => void;
  renderSaveBtn: () => React.ReactNode;
}

export default function ItemTableSection({ settings, isAdmin, onUpdate, renderSaveBtn }: ItemTableSectionProps) {
  return (
    <SettingsCard title="Item Table" subtitle="Columns visibility and formatting" icon="📊" accent="#8b5cf6" footer={renderSaveBtn()}>
      <SettingRow 
        label="Show Index (Sr. No.)" 
        desc="Display item number" 
        right={<Toggle on={settings?.print_show_index ?? true} onChange={(v) => onUpdate({ print_show_index: v })} disabled={!isAdmin} />} 
      />
      <SettingRow 
        label="Show Product Code" 
        desc="Display SKU/HSN code" 
        right={<Toggle on={settings?.print_show_code ?? true} onChange={(v) => onUpdate({ print_show_code: v })} disabled={!isAdmin} />} 
      />
      <SettingRow 
        label="GST Column" 
        desc="Show per-item tax" 
        noBorder 
        right={<Toggle on={settings?.print_show_tax ?? true} onChange={(v) => onUpdate({ print_show_tax: v })} disabled={!isAdmin} />} 
      />
    </SettingsCard>
  );
}
