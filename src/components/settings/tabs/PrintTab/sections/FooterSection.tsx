import React from 'react';
import { 
  SettingsCard, SettingRow, TextInput, TextArea, Toggle 
} from '../../../SettingsUI';

interface FooterSectionProps {
  settings: any;
  isAdmin: boolean;
  onUpdate: (patch: any) => void;
  renderSaveBtn: () => React.ReactNode;
}

export default function FooterSection({ settings, isAdmin, onUpdate, renderSaveBtn }: FooterSectionProps) {
  return (
    <SettingsCard title="Signature & Footer" subtitle="Bottom section messages" icon="✍️" accent="#64748b" footer={renderSaveBtn()}>
      <SettingRow 
        label="Authorized Label" 
        desc="Label for signature field" 
        right={
          <TextInput 
            value={settings?.print_authorized_label || 'Authorized Signatory'} 
            onChange={(e) => onUpdate({ print_authorized_label: e.target.value })} 
            disabled={!isAdmin} 
          />
        } 
      />
      <SettingRow 
        label="Bottom Message" 
        desc="Thank you note or return policy" 
        right={
          <TextArea 
            value={settings?.print_bottom_message || ''} 
            onChange={(e) => onUpdate({ print_bottom_message: e.target.value })} 
            disabled={!isAdmin} 
            rows={3} 
          />
        } 
      />
      <SettingRow 
        label="WhatsApp Help" 
        desc="Display support number" 
        noBorder 
        right={<Toggle on={settings?.print_show_whatsapp_help ?? true} onChange={(v) => onUpdate({ print_show_whatsapp_help: v })} disabled={!isAdmin} />} 
      />
    </SettingsCard>
  );
}
