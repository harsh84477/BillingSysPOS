import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBusinessSettings, useUpdateBusinessSettings } from '@/hooks/useBusinessSettings';
import { InvoiceTemplate } from '../bills/InvoiceTemplate';
import { ThermalTemplate } from '../bills/ThermalTemplate';
import { ColStack, SaveBtn } from './SettingsUI';

/* ─── Modular Sections ─── */
import AppearanceSection from './tabs/PrintTab/sections/AppearanceSection';
import CompanyInfoSection from './tabs/PrintTab/sections/CompanyInfoSection';
import PageSetupSection from './tabs/PrintTab/sections/PageSetupSection';
import CopiesSection from './tabs/PrintTab/sections/CopiesSection';
import ItemTableSection from './tabs/PrintTab/sections/ItemTableSection';
import TotalsTaxesSection from './tabs/PrintTab/sections/TotalsTaxesSection';
import FooterSection from './tabs/PrintTab/sections/FooterSection';

function RegularPrintPreview({ settings, businessId }: { settings: any; businessId?: string }) {
  const containerWidth = 380;
  const paperWidth = settings?.print_page_size === 'a5' ? 560 : 794;
  const paperHeight = settings?.print_page_size === 'a5' ? 794 : 1123;
  const scale = containerWidth / paperWidth;
  const scaledHeight = paperHeight * scale;

  return (
    <div style={{ 
      width: `${containerWidth}px`, 
      height: `${scaledHeight}px`,
      position: 'relative',
      boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
      borderRadius: '6px',
      overflow: 'hidden',
      background: '#fff',
      border: '1px solid #e2e8f0'
    }}>
      <div style={{
        width: `${paperWidth}px`,
        height: `${paperHeight}px`,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
      }}>
        <InvoiceTemplate 
          settings={settings} 
          isPreview={true} 
          bill={null} 
          items={[]} 
        />
      </div>
    </div>
  );
}

function ThermalPrintPreview({ settings, items, businessId }: { settings: any; items: any[]; businessId?: string }) {
  const width = settings?.thermal_page_width || 80;
  const scale = 380 / (width * 3.77);

  return (
    <div style={{
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        borderRadius: '4px',
        overflow: 'hidden',
        background: '#fff',
        width: '380px',
        border: '1px solid #e2e8f0'
    }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}>
        <ThermalTemplate settings={settings} bill={null} items={items} isPreview={true} />
      </div>
    </div>
  );
}

export default function PrintSettingsTab() {
  const { isAdmin, businessId } = useAuth();
  const { data: globalSettings } = useBusinessSettings();
  const updateSettings = useUpdateBusinessSettings();
  const [localSettings, setLocalSettings] = useState<any>({});
  const [printerTab, setPrinterTab] = useState<'regular' | 'thermal'>('regular');

  const settings = useMemo(() => ({
    ...(globalSettings || {}),
    ...localSettings
  }), [globalSettings, localSettings]);

  const onUpdate = (patch: any) => {
    if (!isAdmin) return;
    setLocalSettings((prev: any) => ({ ...prev, ...patch }));
  };

  const hasChanges = Object.keys(localSettings).length > 0;
  const isSaving = updateSettings.isPending;

  const saveAll = () => {
    if (!hasChanges || !isAdmin) return;
    updateSettings.mutate(localSettings, {
      onSuccess: () => {
        setLocalSettings({});
      }
    });
  };

  const renderSaveBtn = () => (
    <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '4px' }}>
      <SaveBtn label="Save Changes" onClick={saveAll} disabled={!hasChanges || isSaving} />
    </div>
  );

  return (
    <div className="flex h-full overflow-hidden" style={{ background: 'var(--spos-bg)', gap: '0' }}>
      
      {/* ═══ LEFT: SETTINGS (Independently Scrollable) ═══ */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-8 pt-0">
        <div className="max-w-[700px] pb-32">
          <ColStack>
            <AppearanceSection 
              printerTab={printerTab} 
              setPrinterTab={setPrinterTab} 
              settings={settings} 
              isAdmin={isAdmin} 
              onUpdate={onUpdate} 
              renderSaveBtn={renderSaveBtn} 
            />
            
            <CompanyInfoSection settings={settings} isAdmin={isAdmin} onUpdate={onUpdate} renderSaveBtn={renderSaveBtn} />
            <PageSetupSection settings={settings} isAdmin={isAdmin} printerTab={printerTab} onUpdate={onUpdate} renderSaveBtn={renderSaveBtn} />
            <CopiesSection settings={settings} isAdmin={isAdmin} onUpdate={onUpdate} renderSaveBtn={renderSaveBtn} />
            <ItemTableSection settings={settings} isAdmin={isAdmin} onUpdate={onUpdate} renderSaveBtn={renderSaveBtn} />
            <TotalsTaxesSection settings={settings} isAdmin={isAdmin} onUpdate={onUpdate} renderSaveBtn={renderSaveBtn} />
            <FooterSection settings={settings} isAdmin={isAdmin} onUpdate={onUpdate} renderSaveBtn={renderSaveBtn} />
          </ColStack>
        </div>
      </div>

      {/* ═══ RIGHT: LIVE PREVIEW (Independently Scrollable) ═══ */}
      <div className="hidden lg:flex flex-col flex-shrink-0 w-[460px] h-full bg-white border-l border-slate-200 overflow-y-auto custom-scrollbar p-6">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--spos-text-pri)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Live Preview</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
               {hasChanges && <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 700, animation: 'pulse 2s infinite' }}>● UNSAVED CHANGES</span>}
               <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>MODE: {printerTab.toUpperCase()}</span>
            </div>
          </div>
          
          <div style={{ transform: `scale(${printerTab === 'thermal' ? 1 : 0.65})`, transformOrigin: 'top center', marginBottom: '-25%' }}>
            {printerTab === 'regular' ? (
              <RegularPrintPreview settings={settings} businessId={businessId} />
            ) : (
              <ThermalPrintPreview settings={settings} items={[]} businessId={businessId} />
            )}
          </div>
          <div style={{ marginTop: 'auto', paddingTop: '40px', textAlign: 'center' }}>
            <p style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>This is a simulated preview. Actual print output may vary slightly based on printer drivers.</p>
          </div>
      </div>
    </div>
  );
}
