/**
 * pages/Settings.tsx — Settings Page Shell
 *
 * The main Settings page that renders all configuration tabs.
 * Uses URL search param ?tab=xxx to keep the active tab in sync with the browser URL.
 * Tab list:
 *  - business   → Business name, address, logo, bank, UPI
 *  - billing    → Tax rules, bill numbering, discount config
 *  - categories → Product category manager
 *  - staff      → Team members and role assignment (admin only)
 *  - print      → Invoice / receipt design & printer settings (PrintSettingsTab)
 *  - pos        → POS screen layout and behaviour
 *  - appearance → App theme selection (light/dark)
 *
 * The "print" tab renders PrintSettingsTab in full-screen mode (no inner scroll wrapper)
 * because it has its own 60/40 split layout with a live invoice preview panel.
 */
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { TabBar } from '@/components/settings/SettingsUI';

/* ─── Tab Components ─── */
import BusinessTab from '@/components/settings/tabs/BusinessTab';
import BillingTab from '@/components/settings/tabs/BillingTab';
import CategoriesTab from '@/components/settings/tabs/CategoriesTab';
import StaffTab from '@/components/settings/tabs/StaffTab';
import PrintSettingsTab from '@/components/settings/PrintSettingsTab';
import POSTab from '@/components/settings/tabs/POSTab';
import AppThemeTab from '@/components/settings/tabs/AppThemeTab';
import LoyaltyTab from '@/components/settings/tabs/LoyaltyTab';

const TABS = [
  { id: 'business', label: 'Business', icon: '🏢' },
  { id: 'billing', label: 'Billing', icon: '💳' },
  { id: 'categories', label: 'Categories', icon: '📁' },
  { id: 'staff', label: 'Staff', icon: '👥' },
  { id: 'print', label: 'Print Config', icon: '🖨️' },
  { id: 'pos', label: 'POS', icon: '🖥️' },
  { id: 'appearance', label: 'App Theme', icon: '🎨' },
  { id: 'loyalty', label: 'Loyalty', icon: '⭐' },
];

export default function Settings() {
  const { isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'business');

  useEffect(() => { 
    const tab = searchParams.get('tab'); 
    if (tab && tab !== activeTab) setActiveTab(tab); 
  }, [searchParams]);

  const handleTabChange = (value: string) => { 
    setActiveTab(value); 
    setSearchParams({ tab: value }); 
  };

  const visibleTabs = isAdmin ? TABS : TABS.filter(t => t.id !== 'staff');

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ fontFamily: 'var(--spos-sans)' }}>
      {/* Header (Fixed) */}
      <div className="px-6 py-4 sticky top-0 z-10 backdrop-blur-md"
        style={{ background: 'hsl(var(--background) / 0.92)', borderBottom: '1px solid hsl(var(--border))' }}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="spos-page-heading text-xl font-bold">Settings</h1>
            <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>Manage your business configuration</p>
          </div>
        </div>
        <div className="mt-4">
          <TabBar tabs={visibleTabs} active={activeTab} onSelect={handleTabChange} />
        </div>
      </div>

      {/* Content Area (Scrollable or Tab-Managed) */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'print' ? (
          <PrintSettingsTab />
        ) : (
          <div className="h-full overflow-y-auto custom-scrollbar p-6 lg:p-8">
            <div className="max-w-[900px] mx-auto pb-20">
              {activeTab === 'business' && <BusinessTab />}
              {activeTab === 'billing' && <BillingTab />}
              {activeTab === 'categories' && <CategoriesTab />}
              {activeTab === 'staff' && isAdmin && <StaffTab />}
              {activeTab === 'pos' && <POSTab />}
              {activeTab === 'appearance' && <AppThemeTab />}
              {activeTab === 'loyalty' && <LoyaltyTab />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
