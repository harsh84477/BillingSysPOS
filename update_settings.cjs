const fs = require('fs');
let code = fs.readFileSync('src/components/settings/PrintSettingsTab.tsx', 'utf8');

// 1. Add missing imports
code = code.replace(/import React, \{ useState \} from 'react';/, 'import React, { useState, useMemo } from \'react\';');
if (!code.includes('SaveBtn,')) {
  code = code.replace(/SelectInput, InfoBox/g, 'SelectInput, SaveBtn, InfoBox');
}

// 2. Rewrite hooks
const oldHooks = `  const { isAdmin } = useAuth();
  const { data: settings } = useBusinessSettings();
  const updateSettings = useUpdateBusinessSettings();
  const u = (v: any) => isAdmin && updateSettings.mutate(v);
  const [printerTab, setPrinterTab] = useState<'regular' | 'thermal'>('regular');
  const [regularSubTab, setRegularSubTab] = useState<'layout' | 'colors'>('layout');`;

const newHooks = `  const { isAdmin } = useAuth();
  const { data: globalSettings } = useBusinessSettings();
  const updateSettings = useUpdateBusinessSettings();
  
  const [localSettings, setLocalSettings] = useState<any>({});
  
  const settings = useMemo(() => ({
    ...(globalSettings || {}),
    ...localSettings
  }), [globalSettings, localSettings]);

  const u = (patch: any) => {
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
    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid #e2e8f0', marginTop: '8px' }}>
      <SaveBtn label="Save Changes" onClick={saveAll} disabled={!hasChanges || isSaving} />
    </div>
  );

  const [printerTab, setPrinterTab] = useState<'regular' | 'thermal'>('regular');
  const [regularSubTab, setRegularSubTab] = useState<'layout' | 'colors'>('layout');`;

code = code.replace(oldHooks, newHooks);

// 3. Add footer to SettingsCard using a regex (but excluding ones that might already have a footer)
code = code.replace(/<SettingsCard (title="[^"]+" subtitle="[^"]+" icon="[^"]+" accent="[^"]+")>/g, '<SettingsCard $1 footer={renderSaveBtn()}>');
// For any variation like `accent="#..." title="..."`
code = code.replace(/<SettingsCard([^>]*)>/g, (match, p1) => {
  if (match.includes('footer=')) return match;
  return `<SettingsCard${p1} footer={renderSaveBtn()}>`;
});

fs.writeFileSync('src/components/settings/PrintSettingsTab.tsx', code);
console.log('Done!');
