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
  const containerWidth = 400;
  const paperWidth = settings?.print_page_size === 'a5' ? 560 : 794;
  const paperHeight = settings?.print_page_size === 'a5' ? 794 : 1123;
  const scale = containerWidth / paperWidth;
  const scaledHeight = paperHeight * scale;

  return (
    <div style={{ 
      width: `${containerWidth}px`, 
      height: `${scaledHeight}px`,
      position: 'relative',
      boxShadow: '0 20px 50px -12px rgba(0,0,0,0.15)',
      borderRadius: '4px',
      overflow: 'hidden',
      background: '#fff',
      border: '1px solid #e2e8f0'
    }}>
      {/* Paper texture overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ 
        backgroundImage: 'linear-gradient(45deg, rgba(0,0,0,0.01) 25%, transparent 25%, transparent 50%, rgba(0,0,0,0.01) 50%, rgba(0,0,0,0.01) 75%, transparent 75%, transparent)',
        backgroundSize: '4px 4px'
      }} />
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
  // Convert mm to pixels roughly (1mm ~ 3.77px)
  const pixelWidth = width * 3.77;
  const containerWidth = 360;
  const scale = containerWidth / pixelWidth;

  return (
    <div style={{
        boxShadow: '0 20px 40px -10px rgba(0,0,0,0.12)',
        borderRadius: '2px',
        overflow: 'hidden',
        background: '#fff',
        width: `${containerWidth}px`,
        border: '1px solid #e2e8f0',
        minHeight: '500px'
    }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}>
        <ThermalTemplate settings={settings} bill={null} items={items} isPreview={true} />
      </div>
      {/* Tear-off simulation */}
      <div className="h-4 w-full bg-slate-50 border-t border-dashed border-slate-200" style={{
        backgroundImage: 'radial-gradient(circle, #f1f5f9 2px, transparent 2.5px)',
        backgroundSize: '10px 10px',
        backgroundPosition: '0 -5px'
      }} />
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
    <div className="flex h-[calc(100vh-180px)] overflow-hidden rounded-xl border border-slate-200 bg-white" style={{ background: 'var(--spos-bg)', gap: '0' }}>
      
      {/* ═══ LEFT: SETTINGS (Independently Scrollable) ═══ */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10 pt-8 bg-slate-50/10">
        <div className="max-w-[760px] mx-auto pb-32">
          <ColStack gap="28px">
            <header className="mb-4">
              <h2 className="text-xl font-bold text-slate-900">Print Configuration</h2>
              <p className="text-sm text-slate-500 mt-1">Customize how your estimates and invoices appear when printed.</p>
            </header>

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
      <div className="hidden xl:flex flex-col flex-shrink-0 w-[480px] h-full bg-white border-l border-slate-200 overflow-y-auto custom-scrollbar">
          {/* Preview Header (Sticky) */}
          <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md px-6 py-5 border-bottom border-slate-100 flex items-center justify-between">
            <h3 className="text-[13px] font-extrabold text-slate-700 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Live Preview
            </h3>
            <div className="flex items-center gap-3">
               {hasChanges && (
                 <div className="px-2 py-0.5 rounded-full bg-amber-50 text-[10px] font-bold text-amber-600 border border-amber-100 flex items-center gap-1.5 animate-pulse">
                   <span className="w-1 h-1 bg-amber-400 rounded-full"></span> UNSAVED
                 </div>
               )}
               <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-bold uppercase tracking-tight">MODE: {printerTab}</span>
            </div>
          </div>
          
          <div className="p-8 flex flex-col items-center">
            <div style={{ transform: `scale(${printerTab === 'thermal' ? 1 : 0.6})`, transformOrigin: 'top center', marginBottom: printerTab === 'thermal' ? '0' : '-35%' }}>
              {printerTab === 'regular' ? (
                <RegularPrintPreview settings={settings} businessId={businessId} />
              ) : (
                <ThermalPrintPreview settings={settings} items={[]} businessId={businessId} />
              )}
            </div>
            
            <div className="mt-12 text-center max-w-[280px]">
              <div className="inline-flex items-center px-3 py-1 bg-indigo-50 rounded-full text-[11px] font-semibold text-indigo-600 mb-2">
                Real-time Sync
              </div>
              <p className="text-[11px] leading-relaxed text-slate-400">
                This preview updates instantly as you change settings. Note that paper quality and printer margins may cause slight variations.
              </p>
            </div>
          </div>
      </div>
    </div>
  );
}
