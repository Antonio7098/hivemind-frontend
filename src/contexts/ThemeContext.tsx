import { useState, useEffect, type ReactNode } from 'react';
import type { LayoutType, StyleType } from './themeTypes';
import { ThemeContext } from './themeContext';

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
