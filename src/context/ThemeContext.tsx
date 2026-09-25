import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeColor, ThemeMode, THEME_OPTIONS } from '../types/theme';

interface ThemeContextType {
  color: ThemeColor;
  mode: ThemeMode;
  isDark: boolean;
  setColor: (color: ThemeColor) => void;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEYS = {
  COLOR: 'chit_theme_color_v1',
  MODE: 'chit_theme_mode_v1',
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [color, setColorState] = useState<ThemeColor>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.COLOR);
      if (saved && THEME_OPTIONS.some((o) => o.id === saved)) {
        return saved as ThemeColor;
      }
    } catch {}
    return 'blue';
  });

  const [mode, setModeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MODE);
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        return saved as ThemeMode;
      }
    } catch {}
    return 'light';
  });

  const [systemIsDark, setSystemIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemIsDark(e.matches);
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  const isDark = mode === 'system' ? systemIsDark : mode === 'dark';

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme-color', color);
    root.setAttribute('data-theme-mode', isDark ? 'dark' : 'light');

    if (isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }

    try {
      localStorage.setItem(STORAGE_KEYS.COLOR, color);
      localStorage.setItem(STORAGE_KEYS.MODE, mode);
    } catch {}
  }, [color, mode, isDark]);

  const setColor = (newColor: ThemeColor) => {
    setColorState(newColor);
  };

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
  };

  const toggleMode = () => {
    setModeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ color, mode, isDark, setColor, setMode, toggleMode }}>
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
