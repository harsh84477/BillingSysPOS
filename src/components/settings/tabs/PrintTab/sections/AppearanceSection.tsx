import React, { useState } from 'react';
import { 
  SettingsCard, TabBar, LayoutPicker 
} from '../../../SettingsUI';

interface AppearanceSectionProps {
  printerTab: 'regular' | 'thermal';
  setPrinterTab: (v: 'regular' | 'thermal') => void;
  settings: any;
  isAdmin: boolean;
  onUpdate: (patch: any) => void;
  renderSaveBtn: () => React.ReactNode;
}

const REGULAR_LAYOUTS = [
  { id: 'gst_theme_6', name: 'GST Theme 6', icon: '📋' },
  { id: 'urban_bill_style', name: 'Urban Bill', icon: '🏙️' },
  { id: 'double_divine', name: 'Double Divine', icon: '✨' },
  { id: 'french_elite', name: 'French Elite', icon: '🏛️' },
  { id: 'theme_1', name: 'Theme 1', icon: '📄' },
];
const THERMAL_LAYOUTS = [
  { id: 'theme_1', name: 'Theme 1', icon: '🧾' },
  { id: 'theme_2', name: 'Theme 2', icon: '📜' },
  { id: 'theme_3', name: 'Theme 3', icon: '📑' },
  { id: 'theme_4', name: 'Theme 4', icon: '📃' },
  { id: 'theme_5', name: 'Theme 5', icon: '🧾' },
];

export default function AppearanceSection({
  printerTab, setPrinterTab, settings, isAdmin, onUpdate, renderSaveBtn
}: AppearanceSectionProps) {
  const [regularSubTab, setRegularSubTab] = useState<'layout' | 'colors'>('layout');

  return (
    <SettingsCard title="Appearance" subtitle="Customize layout and colors for regular printing" icon="🎨" accent="hsl(var(--primary))" footer={renderSaveBtn()}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button onClick={() => setPrinterTab('regular')} style={{
          flex: 1, padding: '10px', borderRadius: '8px', border: `2px solid ${printerTab === 'regular' ? 'hsl(var(--primary))' : 'var(--spos-border)'}`,
          background: printerTab === 'regular' ? 'hsl(var(--primary))' : 'var(--spos-card)',
          color: printerTab === 'regular' ? '#fff' : 'var(--spos-text-sec)', fontWeight: 700, fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s'
        }}>🖨️ Regular Printer</button>
        <button onClick={() => setPrinterTab('thermal')} style={{
          flex: 1, padding: '10px', borderRadius: '8px', border: `2px solid ${printerTab === 'thermal' ? 'hsl(var(--primary))' : 'var(--spos-border)'}`,
          background: printerTab === 'thermal' ? 'hsl(var(--primary))' : 'var(--spos-card)',
          color: printerTab === 'thermal' ? '#fff' : 'var(--spos-text-sec)', fontWeight: 700, fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s'
        }}>🧾 Thermal Printer</button>
      </div>

      {printerTab === 'regular' ? (
        <>
          <div style={{ marginBottom: '16px' }}>
            <TabBar 
              tabs={[
                { id: 'layout', label: 'CHANGE LAYOUT', icon: '📄' },
                { id: 'colors', label: 'CHANGE COLORS', icon: '🎨' }
              ]}
              active={regularSubTab}
              onSelect={(id) => setRegularSubTab(id as any)}
            />
          </div>
          {regularSubTab === 'layout' && (
            <LayoutPicker layouts={REGULAR_LAYOUTS} selected={settings?.print_regular_layout || 'gst_theme_6'} onSelect={(id) => onUpdate({ print_regular_layout: id })} disabled={!isAdmin} />
          )}
          {regularSubTab === 'colors' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '12px 0' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--spos-text-sec)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Theme Accent Colors</div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {['#22c55e', '#2563eb', '#ea580c', '#b91c1c', '#7c3aed', '#db2777', '#000000', '#475569'].map(color => {
                  const isActive = (settings?.print_accent_color === color || settings?.print_primary_color === color);
                  return (
                    <button key={color} onClick={() => onUpdate({ print_accent_color: color, print_primary_color: color })}
                      style={{
                         width: '36px', height: '36px', borderRadius: '50%', background: color, border: isActive ? '3px solid #fff' : '2px solid transparent',
                         boxShadow: isActive ? `0 0 0 2px ${color}` : 'none', cursor: 'pointer', transition: 'all 0.2s'
                      }}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </>
      ) : (
         <LayoutPicker layouts={THERMAL_LAYOUTS} selected={settings?.print_thermal_layout || 'theme_1'} onSelect={(id) => onUpdate({ print_thermal_layout: id })} disabled={!isAdmin} />
      )}
    </SettingsCard>
  );
}
