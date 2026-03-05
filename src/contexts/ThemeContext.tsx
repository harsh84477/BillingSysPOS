import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type ThemeName =
  | 'mint-pro'
  | 'sunset-orange'
  | 'royal-purple'
  | 'ocean-blue'
  | 'dark-pro'
  | 'rose-gold'
  | 'slate-modern'
  | 'cyber-neon'
  | 'forest-deep'
  | 'midnight-blue';

interface ThemeColors {
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  input: string;
  ring: string;
  popover: string;
  popoverForeground: string;
  destructive: string;
  destructiveForeground: string;
  sidebarBackground: string;
  sidebarForeground: string;
  sidebarPrimary: string;
  sidebarPrimaryForeground: string;
  sidebarAccent: string;
  sidebarAccentForeground: string;
  sidebarBorder: string;
  sidebarRing: string;
  isDark?: boolean;
}

export const themes: Record<ThemeName, ThemeColors> = {
  'mint-pro': {
    primary: '158 64% 52%',
    primaryForeground: '0 0% 100%',
    secondary: '158 30% 94%',
    secondaryForeground: '158 64% 25%',
    accent: '158 40% 90%',
    accentForeground: '158 64% 25%',
    background: '0 0% 100%',
    foreground: '222 84% 5%',
    card: '0 0% 100%',
    cardForeground: '222 84% 5%',
    muted: '158 20% 96%',
    mutedForeground: '215 16% 47%',
    border: '158 20% 90%',
    input: '158 20% 90%',
    ring: '158 64% 52%',
    popover: '0 0% 100%',
    popoverForeground: '222 84% 5%',
    destructive: '0 84% 60%',
    destructiveForeground: '0 0% 100%',
    sidebarBackground: '158 25% 97%',
    sidebarForeground: '158 10% 20%',
    sidebarPrimary: '158 64% 42%',
    sidebarPrimaryForeground: '0 0% 100%',
    sidebarAccent: '158 30% 92%',
    sidebarAccentForeground: '158 64% 25%',
    sidebarBorder: '158 15% 88%',
    sidebarRing: '158 64% 52%',
  },
  'sunset-orange': {
    primary: '24 95% 53%',
    primaryForeground: '0 0% 100%',
    secondary: '24 40% 94%',
    secondaryForeground: '24 80% 25%',
    accent: '24 50% 90%',
    accentForeground: '24 80% 25%',
    background: '30 20% 99%',
    foreground: '24 10% 10%',
    card: '0 0% 100%',
    cardForeground: '24 10% 10%',
    muted: '24 20% 96%',
    mutedForeground: '24 10% 40%',
    border: '24 20% 90%',
    input: '24 20% 90%',
    ring: '24 95% 53%',
    popover: '0 0% 100%',
    popoverForeground: '24 10% 10%',
    destructive: '0 84% 60%',
    destructiveForeground: '0 0% 100%',
    sidebarBackground: '28 30% 97%',
    sidebarForeground: '24 10% 18%',
    sidebarPrimary: '24 90% 48%',
    sidebarPrimaryForeground: '0 0% 100%',
    sidebarAccent: '24 40% 92%',
    sidebarAccentForeground: '24 80% 25%',
    sidebarBorder: '24 15% 88%',
    sidebarRing: '24 95% 53%',
  },
  'royal-purple': {
    primary: '271 81% 56%',
    primaryForeground: '0 0% 100%',
    secondary: '271 30% 94%',
    secondaryForeground: '271 81% 30%',
    accent: '271 40% 90%',
    accentForeground: '271 81% 30%',
    background: '270 20% 99%',
    foreground: '271 10% 10%',
    card: '0 0% 100%',
    cardForeground: '271 10% 10%',
    muted: '271 20% 96%',
    mutedForeground: '271 10% 40%',
    border: '271 20% 90%',
    input: '271 20% 90%',
    ring: '271 81% 56%',
    popover: '0 0% 100%',
    popoverForeground: '271 10% 10%',
    destructive: '0 84% 60%',
    destructiveForeground: '0 0% 100%',
    sidebarBackground: '271 25% 97%',
    sidebarForeground: '271 15% 18%',
    sidebarPrimary: '271 70% 48%',
    sidebarPrimaryForeground: '0 0% 100%',
    sidebarAccent: '271 30% 92%',
    sidebarAccentForeground: '271 81% 30%',
    sidebarBorder: '271 15% 88%',
    sidebarRing: '271 81% 56%',
  },
  'ocean-blue': {
    primary: '199 89% 48%',
    primaryForeground: '0 0% 100%',
    secondary: '199 30% 94%',
    secondaryForeground: '199 89% 25%',
    accent: '199 40% 90%',
    accentForeground: '199 89% 25%',
    background: '200 20% 99%',
    foreground: '199 10% 10%',
    card: '0 0% 100%',
    cardForeground: '199 10% 10%',
    muted: '199 20% 96%',
    mutedForeground: '199 10% 40%',
    border: '199 20% 90%',
    input: '199 20% 90%',
    ring: '199 89% 48%',
    popover: '0 0% 100%',
    popoverForeground: '199 10% 10%',
    destructive: '0 84% 60%',
    destructiveForeground: '0 0% 100%',
    sidebarBackground: '200 25% 97%',
    sidebarForeground: '199 10% 18%',
    sidebarPrimary: '199 80% 42%',
    sidebarPrimaryForeground: '0 0% 100%',
    sidebarAccent: '199 30% 92%',
    sidebarAccentForeground: '199 89% 25%',
    sidebarBorder: '199 15% 88%',
    sidebarRing: '199 89% 48%',
  },
  'rose-gold': {
    primary: '350 80% 60%',
    primaryForeground: '0 0% 100%',
    secondary: '350 35% 94%',
    secondaryForeground: '350 70% 30%',
    accent: '350 45% 90%',
    accentForeground: '350 70% 30%',
    background: '350 15% 99%',
    foreground: '350 10% 10%',
    card: '0 0% 100%',
    cardForeground: '350 10% 10%',
    muted: '350 20% 96%',
    mutedForeground: '350 10% 45%',
    border: '350 18% 90%',
    input: '350 18% 90%',
    ring: '350 80% 60%',
    popover: '0 0% 100%',
    popoverForeground: '350 10% 10%',
    destructive: '0 84% 60%',
    destructiveForeground: '0 0% 100%',
    sidebarBackground: '350 22% 97%',
    sidebarForeground: '350 12% 18%',
    sidebarPrimary: '350 72% 52%',
    sidebarPrimaryForeground: '0 0% 100%',
    sidebarAccent: '350 35% 92%',
    sidebarAccentForeground: '350 70% 30%',
    sidebarBorder: '350 12% 88%',
    sidebarRing: '350 80% 60%',
  },
  'slate-modern': {
    primary: '215 25% 27%',
    primaryForeground: '0 0% 100%',
    secondary: '215 18% 94%',
    secondaryForeground: '215 25% 20%',
    accent: '215 15% 91%',
    accentForeground: '215 25% 20%',
    background: '210 12% 98%',
    foreground: '215 25% 10%',
    card: '0 0% 100%',
    cardForeground: '215 25% 10%',
    muted: '215 14% 95%',
    mutedForeground: '215 12% 48%',
    border: '215 14% 89%',
    input: '215 14% 89%',
    ring: '215 25% 27%',
    popover: '0 0% 100%',
    popoverForeground: '215 25% 10%',
    destructive: '0 84% 60%',
    destructiveForeground: '0 0% 100%',
    sidebarBackground: '215 18% 96%',
    sidebarForeground: '215 20% 18%',
    sidebarPrimary: '215 25% 22%',
    sidebarPrimaryForeground: '0 0% 100%',
    sidebarAccent: '215 15% 91%',
    sidebarAccentForeground: '215 25% 20%',
    sidebarBorder: '215 10% 86%',
    sidebarRing: '215 25% 27%',
  },
  'forest-deep': {
    primary: '142 55% 38%',
    primaryForeground: '0 0% 100%',
    secondary: '142 30% 94%',
    secondaryForeground: '142 55% 20%',
    accent: '142 35% 90%',
    accentForeground: '142 55% 20%',
    background: '140 14% 98%',
    foreground: '142 15% 10%',
    card: '0 0% 100%',
    cardForeground: '142 15% 10%',
    muted: '142 18% 95%',
    mutedForeground: '142 10% 42%',
    border: '142 16% 89%',
    input: '142 16% 89%',
    ring: '142 55% 38%',
    popover: '0 0% 100%',
    popoverForeground: '142 15% 10%',
    destructive: '0 84% 60%',
    destructiveForeground: '0 0% 100%',
    sidebarBackground: '142 22% 96%',
    sidebarForeground: '142 14% 16%',
    sidebarPrimary: '142 50% 32%',
    sidebarPrimaryForeground: '0 0% 100%',
    sidebarAccent: '142 28% 91%',
    sidebarAccentForeground: '142 55% 20%',
    sidebarBorder: '142 12% 86%',
    sidebarRing: '142 55% 38%',
  },
  'dark-pro': {
    primary: '210 100% 56%',
    primaryForeground: '0 0% 100%',
    secondary: '215 28% 17%',
    secondaryForeground: '210 40% 98%',
    accent: '215 25% 20%',
    accentForeground: '210 40% 98%',
    background: '222 47% 6%',
    foreground: '210 40% 98%',
    card: '222 47% 8%',
    cardForeground: '210 40% 98%',
    muted: '215 28% 14%',
    mutedForeground: '215 20% 65%',
    border: '215 28% 17%',
    input: '215 28% 17%',
    ring: '210 100% 56%',
    popover: '222 47% 8%',
    popoverForeground: '210 40% 98%',
    destructive: '0 63% 31%',
    destructiveForeground: '210 40% 98%',
    sidebarBackground: '222 47% 7%',
    sidebarForeground: '210 30% 88%',
    sidebarPrimary: '210 100% 56%',
    sidebarPrimaryForeground: '0 0% 100%',
    sidebarAccent: '215 25% 14%',
    sidebarAccentForeground: '210 30% 88%',
    sidebarBorder: '215 28% 14%',
    sidebarRing: '210 100% 56%',
    isDark: true,
  },
  'cyber-neon': {
    primary: '165 100% 46%',
    primaryForeground: '222 47% 6%',
    secondary: '215 25% 15%',
    secondaryForeground: '165 60% 80%',
    accent: '215 20% 18%',
    accentForeground: '165 60% 80%',
    background: '225 40% 5%',
    foreground: '165 30% 92%',
    card: '225 35% 8%',
    cardForeground: '165 30% 92%',
    muted: '215 25% 12%',
    mutedForeground: '215 15% 58%',
    border: '215 22% 15%',
    input: '215 22% 15%',
    ring: '165 100% 46%',
    popover: '225 35% 8%',
    popoverForeground: '165 30% 92%',
    destructive: '0 63% 31%',
    destructiveForeground: '0 0% 100%',
    sidebarBackground: '225 40% 6%',
    sidebarForeground: '165 20% 82%',
    sidebarPrimary: '165 100% 46%',
    sidebarPrimaryForeground: '222 47% 6%',
    sidebarAccent: '215 20% 12%',
    sidebarAccentForeground: '165 20% 82%',
    sidebarBorder: '215 22% 12%',
    sidebarRing: '165 100% 46%',
    isDark: true,
  },
  'midnight-blue': {
    primary: '217 91% 60%',
    primaryForeground: '0 0% 100%',
    secondary: '222 35% 16%',
    secondaryForeground: '217 50% 90%',
    accent: '222 30% 19%',
    accentForeground: '217 50% 90%',
    background: '222 47% 5%',
    foreground: '217 40% 95%',
    card: '222 42% 7%',
    cardForeground: '217 40% 95%',
    muted: '222 30% 13%',
    mutedForeground: '217 18% 58%',
    border: '222 28% 16%',
    input: '222 28% 16%',
    ring: '217 91% 60%',
    popover: '222 42% 7%',
    popoverForeground: '217 40% 95%',
    destructive: '0 63% 31%',
    destructiveForeground: '0 0% 100%',
    sidebarBackground: '222 47% 6%',
    sidebarForeground: '217 30% 82%',
    sidebarPrimary: '217 91% 60%',
    sidebarPrimaryForeground: '0 0% 100%',
    sidebarAccent: '222 28% 13%',
    sidebarAccentForeground: '217 30% 82%',
    sidebarBorder: '222 28% 13%',
    sidebarRing: '217 91% 60%',
    isDark: true,
  },
};

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Mapping: camelCase key → CSS variable name
const cssVarMap: Record<string, string> = {
  primary: '--primary',
  primaryForeground: '--primary-foreground',
  secondary: '--secondary',
  secondaryForeground: '--secondary-foreground',
  accent: '--accent',
  accentForeground: '--accent-foreground',
  background: '--background',
  foreground: '--foreground',
  card: '--card',
  cardForeground: '--card-foreground',
  muted: '--muted',
  mutedForeground: '--muted-foreground',
  border: '--border',
  input: '--input',
  ring: '--ring',
  popover: '--popover',
  popoverForeground: '--popover-foreground',
  destructive: '--destructive',
  destructiveForeground: '--destructive-foreground',
  sidebarBackground: '--sidebar-background',
  sidebarForeground: '--sidebar-foreground',
  sidebarPrimary: '--sidebar-primary',
  sidebarPrimaryForeground: '--sidebar-primary-foreground',
  sidebarAccent: '--sidebar-accent',
  sidebarAccentForeground: '--sidebar-accent-foreground',
  sidebarBorder: '--sidebar-border',
  sidebarRing: '--sidebar-ring',
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>('mint-pro');

  const applyTheme = (themeName: ThemeName) => {
    const validTheme = themes[themeName] ? themeName : 'mint-pro';
    const colors = themes[validTheme];
    const root = document.documentElement;

    // Apply every CSS variable explicitly
    Object.entries(colors).forEach(([key, value]) => {
      if (key === 'isDark') return;
      const cssVar = cssVarMap[key];
      if (cssVar) {
        root.style.setProperty(cssVar, value as string);

        // Also map to spos custom properties to ensure full UI coverage instantly
        if (key === 'primary') root.style.setProperty('--spos-accent', `hsl(${value})`);
        if (key === 'background') root.style.setProperty('--spos-bg', `hsl(${value})`);
        if (key === 'foreground') root.style.setProperty('--spos-text', `hsl(${value})`);
        if (key === 'border') root.style.setProperty('--spos-border', `hsl(${value})`);
        if (key === 'card') root.style.setProperty('--spos-white', `hsl(${value})`);
        if (key === 'sidebarBackground') root.style.setProperty('--spos-navy', `hsl(${value})`);
        if (key === 'secondary') root.style.setProperty('--spos-bg2', `hsl(${value})`);

        // Sidebar specifically
        if (key === 'sidebarForeground') root.style.setProperty('--spos-sidebar-text', `hsl(${value})`);
        if (key === 'sidebarBorder') root.style.setProperty('--spos-sidebar-border', `hsl(${value})`);
        if (key === 'sidebarAccent') root.style.setProperty('--spos-sidebar-hover-bg', `hsl(${value})`);
        if (key === 'sidebarAccentForeground') root.style.setProperty('--spos-sidebar-hover-text', `hsl(${value})`);
        if (key === 'sidebarPrimary') root.style.setProperty('--spos-sidebar-active-bg', `hsl(${value})`);
        if (key === 'sidebarPrimaryForeground') root.style.setProperty('--spos-sidebar-active-text', `hsl(${value})`);
      }
    });

    // Handle dark/light class
    if (colors.isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  const setTheme = async (themeName: ThemeName) => {
    setThemeState(themeName);
    applyTheme(themeName);
    // Persist immediately for fast reload
    localStorage.setItem('spos-theme', themeName);

    // Save to profile if user is logged in
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ theme: themeName } as any)
          .eq('user_id', user.id);
      }
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  useEffect(() => {
    // Load theme from profile
    const loadTheme = async () => {
      try {
        const localTheme = localStorage.getItem('spos-theme') as ThemeName;
        if (localTheme && themes[localTheme]) {
          setThemeState(localTheme);
          applyTheme(localTheme);
        }

        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data } = await supabase
            .from('profiles')
            .select('theme')
            .eq('user_id', user.id)
            .maybeSingle();

          if (data) {
            const themeData = data as any;
            if (themeData.theme && themes[themeData.theme as ThemeName]) {
              setThemeState(themeData.theme as ThemeName);
              applyTheme(themeData.theme as ThemeName);
              localStorage.setItem('spos-theme', themeData.theme);
              return;
            }
          }
        }

        // Fallback if no profile and no localTheme
        if (!localTheme) {
          applyTheme('mint-pro');
        }

      } catch (error) {
        console.error('Error loading theme:', error);
        applyTheme('mint-pro');
      }
    };

    loadTheme();
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
