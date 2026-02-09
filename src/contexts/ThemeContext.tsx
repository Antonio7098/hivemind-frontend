import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type LayoutType = 'sidebar' | 'topnav' | 'floating';
export type StyleType = 'industrial' | 'ivory' | 'cyber';

interface ThemeContextValue {
  layout: LayoutType;
  style: StyleType;
  setLayout: (layout: LayoutType) => void;
  setStyle: (style: StyleType) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [layout, setLayout] = useState<LayoutType>(
    () => (localStorage.getItem('hm-layout') as LayoutType) || 'sidebar'
  );
  const [style, setStyle] = useState<StyleType>(
    () => (localStorage.getItem('hm-style') as StyleType) || 'industrial'
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', style);
    localStorage.setItem('hm-style', style);
  }, [style]);

  useEffect(() => {
    document.documentElement.setAttribute('data-layout', layout);
    localStorage.setItem('hm-layout', layout);
  }, [layout]);

  return (
    <ThemeContext.Provider value={{ layout, style, setLayout, setStyle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
