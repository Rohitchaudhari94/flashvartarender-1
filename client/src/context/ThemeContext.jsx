import { createContext, useContext, useEffect, useState } from 'react';

export const THEMES = [
  { id: 'crimson', name: 'Crimson Flash', color: '#e8431c', desc: 'Fiery editorial news' },
  { id: 'sapphire', name: 'Royal Sapphire', color: '#2563eb', desc: 'Global journalism blue' },
  { id: 'emerald', name: 'Emerald Forest', color: '#059669', desc: 'Prestigious green' },
  { id: 'violet', name: 'Amethyst Violet', color: '#7c3aed', desc: 'Modern magazine violet' },
  { id: 'amber', name: 'Sunset Amber', color: '#d97706', desc: 'Warm heritage gold' },
];

const ThemeContext = createContext(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem('flashvarta_theme') || 'crimson';
  });

  const [mode, setModeState] = useState(() => {
    const saved = localStorage.getItem('flashvarta_mode');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('flashvarta_theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const setMode = (newMode) => {
    setModeState(newMode);
    localStorage.setItem('flashvarta_mode', newMode);
    document.documentElement.setAttribute('data-mode', newMode);
  };

  const toggleMode = () => {
    const nextMode = mode === 'dark' ? 'light' : 'dark';
    setMode(nextMode);
  };

  // Sync with DOM on initial mount & updates
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute('data-mode', mode);
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, mode, setMode, toggleMode, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}
