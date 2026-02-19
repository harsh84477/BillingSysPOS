import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type ThemeName = 'mint-pro' | 'sunset-orange' | 'royal-purple' | 'ocean-blue' | 'dark-pro';

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
  ring: string;
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
    foreground: '158 10% 10%',
    card: '0 0% 100%',
    cardForeground: '158 10% 10%',
    muted: '158 20% 96%',
    mutedForeground: '158 10% 40%',
    border: '158 20% 90%',
    ring: '158 64% 52%',
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
    ring: '24 95% 53%',
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
    ring: '271 81% 56%',
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
    ring: '199 89% 48%',
  },
  'dark-pro': {
    primary: '210 100% 50%',
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
    ring: '210 100% 50%',
  },
};

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>('mint-pro');

  const applyTheme = (themeName: ThemeName) => {
    const validTheme = themes[themeName] ? themeName : 'mint-pro';
    const colors = themes[validTheme];
    const root = document.documentElement;

    Object.entries(colors).forEach(([key, value]) => {
      // Convert camelCase to kebab-case for CSS variables
      // e.g. primaryForeground -> --primary-foreground
      const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      root.style.setProperty(`--${cssKey}`, value);
    });

    // Handle dark theme class
    if (validTheme === 'dark-pro') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  const setTheme = async (themeName: ThemeName) => {
    setThemeState(themeName);
    applyTheme(themeName);

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
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data } = await supabase
            .from('profiles')
            .select('theme')
            .eq('user_id', user.id)
            .maybeSingle();

          if (data) {
            const themeData = data as any;
            if (themeData.theme) {
              setThemeState(themeData.theme as ThemeName);
              applyTheme(themeData.theme as ThemeName);
              return; // Found user theme, done.
            }
          }
        }

        // Fallback or default if no user/theme
        applyTheme('mint-pro');

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
