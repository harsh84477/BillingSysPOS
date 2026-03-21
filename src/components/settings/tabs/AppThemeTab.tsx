import React from 'react';
import { useTheme, ThemeName } from '@/contexts/ThemeContext';
import { 
  SettingsCard, ColStack, T 
} from '../SettingsUI';

const themeOptions: { name: string; value: ThemeName; description: string; color: string; bg: string; isDark?: boolean }[] = [
  { name: 'Mint Pro', value: 'mint-pro', description: 'Fresh green tones', color: '#10b981', bg: '#ecfdf5' },
  { name: 'Sunset Orange', value: 'sunset-orange', description: 'Warm orange energetic vibes', color: '#f97316', bg: '#fff7ed' },
  { name: 'Royal Purple', value: 'royal-purple', description: 'Elegant premium feel', color: '#8b5cf6', bg: '#f5f3ff' },
  { name: 'Ocean Blue', value: 'ocean-blue', description: 'Calm professional use', color: '#3b82f6', bg: '#eff6ff' },
  { name: 'Rose Gold', value: 'rose-gold', description: 'Warm pink luxurious feel', color: '#e11d48', bg: '#fff1f2' },
  { name: 'Slate Modern', value: 'slate-modern', description: 'Minimal clean design', color: '#475569', bg: '#f1f5f9' },
  { name: 'Forest Deep', value: 'forest-deep', description: 'Rich natural vibes', color: '#16a34a', bg: '#f0fdf4' },
  { name: 'Dark Pro', value: 'dark-pro', description: 'Sleek dark mode', color: '#3b82f6', bg: '#0f172a', isDark: true },
  { name: 'Cyber Neon', value: 'cyber-neon', description: 'Neon green tech vibes', color: '#00e69d', bg: '#0a0f1a', isDark: true },
  { name: 'Midnight Blue', value: 'midnight-blue', description: 'Deep night use', color: '#60a5fa', bg: '#0c1222', isDark: true },
];

export default function AppThemeTab() {
  const { theme, setTheme } = useTheme();

  return (
    <ColStack>
      <SettingsCard title="App Themes" subtitle="Customize the overall look and feel of your POS" icon="🎨" accent="#3b82f6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {themeOptions.map(opt => {
            const active = theme === opt.value;
            return (
              <button key={opt.value} onClick={() => setTheme(opt.value)}
                style={{
                  padding: '20px 18px', borderRadius: '14px', textAlign: 'left', cursor: 'pointer',
                  position: 'relative', fontFamily: T.font,
                  border: `2.5px solid ${active ? opt.color : '#e2e8f0'}`,
                  background: active ? opt.bg : '#ffffff',
                  boxShadow: active ? `0 0 0 4px ${opt.color}15` : '0 1px 3px rgba(0,0,0,0.04)',
                  transition: 'all 0.25s',
                }}
              >
                {active && <div style={{ position: 'absolute', top: '12px', right: '12px', width: '22px', height: '22px', borderRadius: '50%', background: opt.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px', fontWeight: 700 }}>✓</div>}
                <div style={{ width: '100%', height: '6px', borderRadius: '3px', marginBottom: '14px', background: `linear-gradient(90deg, ${opt.color}, ${opt.color}60)` }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: opt.color, display: 'inline-block' }} />
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{opt.name}</span>
                </div>
                <p style={{ fontSize: '11.5px', color: '#94a3b8', margin: 0, lineHeight: 1.4 }}>{opt.description}</p>
              </button>
            );
          })}
        </div>
      </SettingsCard>
    </ColStack>
  );
}
