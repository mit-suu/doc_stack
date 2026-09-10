'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { AccentColorPreset, ACCENT_COLOR_PRESETS, ThemeMode } from '../types/theme';

interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
  accentId: string;
  accentPreset: AccentColorPreset;
  setAccentId: (id: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>('light');
  const [accentId, setAccentIdState] = useState<string>('rose'); // default to pastel rose as requested
  const [mounted, setMounted] = useState(false);

  const getPreset = (id: string): AccentColorPreset => {
    return ACCENT_COLOR_PRESETS.find((p) => p.id === id) || ACCENT_COLOR_PRESETS[0];
  };

  const applyColors = (t: ThemeMode, accId: string) => {
    const root = document.documentElement;
    if (t === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }

    const preset = getPreset(accId);
    const palette = t === 'dark' ? preset.dark : preset.light;

    root.style.setProperty('--theme-primary', palette.primary);
    root.style.setProperty('--theme-primary-container', palette.primaryContainer);
    root.style.setProperty('--theme-on-primary', palette.onPrimary);
    root.style.setProperty('--theme-accent-glow', palette.glow);
  };

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('docstack-theme') as ThemeMode | null;
    const savedAccent = localStorage.getItem('docstack-accent');

    const initialTheme: ThemeMode = savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : 'light';
    const initialAccent = savedAccent && ACCENT_COLOR_PRESETS.some((p) => p.id === savedAccent) ? savedAccent : 'rose';

    setThemeState(initialTheme);
    setAccentIdState(initialAccent);
    applyColors(initialTheme, initialAccent);
  }, []);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem('docstack-theme', newTheme);
    applyColors(newTheme, accentId);
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  };

  const setAccentId = (newAccentId: string) => {
    setAccentIdState(newAccentId);
    localStorage.setItem('docstack-accent', newAccentId);
    applyColors(theme, newAccentId);
  };

  const currentPreset = getPreset(accentId);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        setTheme,
        accentId,
        accentPreset: currentPreset,
        setAccentId,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
