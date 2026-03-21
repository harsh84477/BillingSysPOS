import React from 'react';
import { 
  SettingsCard, SettingRow, SelectInput, Counter 
} from '../../../SettingsUI';

interface PageSetupSectionProps {
  settings: any;
  isAdmin: boolean;
  printerTab: 'regular' | 'thermal';
  onUpdate: (patch: any) => void;
  renderSaveBtn: () => React.ReactNode;
}

export default function PageSetupSection({ settings, isAdmin, printerTab, onUpdate, renderSaveBtn }: PageSetupSectionProps) {
  return (
    <SettingsCard title="Page Setup" subtitle="Control sizes and margins" icon="📏" accent="#10b981" footer={renderSaveBtn()}>
      <SettingRow 
        label="Page Orientation" 
        desc="Layout direction" 
        right={
          <SelectInput 
            value={settings?.print_orientation || 'portrait'} 
            onChange={(v) => onUpdate({ print_orientation: v })} 
            disabled={!isAdmin} 
            options={[{ value: 'portrait', label: 'Portrait' }, { value: 'landscape', label: 'Landscape' }]} 
          />
        } 
      />
      
      {printerTab === 'thermal' ? (
        <SettingRow 
          label="Thermal Width" 
          desc="Width in millimeters" 
          right={
            <Counter 
              value={settings?.thermal_page_width || 80} 
              min={50} max={120} 
              onChange={(v) => onUpdate({ thermal_page_width: v })} 
              disabled={!isAdmin} 
            />
          } 
        />
      ) : (
        <SettingRow 
          label="Paper Size" 
          desc="Standard page dimensions" 
          right={
            <SelectInput 
              value={settings?.print_page_size || 'a5'} 
              onChange={(v) => onUpdate({ print_page_size: v })} 
              disabled={!isAdmin} 
              options={[
                { value: 'a4', label: 'A4 Size' }, 
                { value: 'a5', label: 'A5 Size' }, 
                { value: 'manual', label: 'Manual/Custom' }
              ]} 
            />
          } 
        />
      )}
      
      <SettingRow 
        label="Content Margin" 
        desc="Space around edges (px)" 
        noBorder 
        right={
          <Counter 
            value={settings?.print_content_padding ?? 20} 
            min={0} max={60} 
            onChange={(v) => onUpdate({ print_content_padding: v })} 
            disabled={!isAdmin} 
          />
        } 
      />
    </SettingsCard>
  );
}
