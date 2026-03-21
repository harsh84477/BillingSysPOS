import React from 'react';
import { 
  SettingsCard, SaveBtn, SectionLabel, SettingRow, TextInput, TextArea 
} from '../../../SettingsUI';

interface CompanyInfoSectionProps {
  settings: any;
  isAdmin: boolean;
  onUpdate: (patch: any) => void;
  renderSaveBtn: () => React.ReactNode;
}

export default function CompanyInfoSection({ settings, isAdmin, onUpdate, renderSaveBtn }: CompanyInfoSectionProps) {
  return (
    <SettingsCard title="Company Info" subtitle="Your details that appear on printed bills" icon="🏢" accent="#3b82f6" footer={renderSaveBtn()}>
      <SectionLabel text="Contact Details" />
      <SettingRow 
        label="Store Name" 
        desc="Main title of the invoice" 
        right={<TextInput value={settings?.business_name || ''} onChange={(e) => onUpdate({ business_name: e.target.value })} disabled={!isAdmin} placeholder="Business Name" />} 
      />
      <SettingRow 
        label="Address" 
        desc="Physical store location" 
        right={<TextArea value={settings?.address || ''} onChange={(e) => onUpdate({ address: e.target.value })} disabled={!isAdmin} placeholder="Street, City, Zip" rows={2} />} 
      />
      <SettingRow 
        label="Phone" 
        desc="Customer support number" 
        right={<TextInput value={settings?.phone || ''} onChange={(e) => onUpdate({ phone: e.target.value })} disabled={!isAdmin} placeholder="01234 56789" />} 
      />
      <div style={{ marginTop: '16px' }} />
      <SectionLabel text="Registration" />
      <SettingRow 
        label="GST Number" 
        desc="Tax registration ID" 
        noBorder 
        right={<TextInput value={settings?.gst_number || ''} onChange={(e) => onUpdate({ gst_number: e.target.value })} disabled={!isAdmin} placeholder="e.g. 22AAAAA0000A1Z5" />} 
      />
    </SettingsCard>
  );
}
