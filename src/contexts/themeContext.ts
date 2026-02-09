import { createContext } from 'react';
import type { LayoutType, StyleType } from './themeTypes';

export interface ThemeContextValue {
  layout: LayoutType;
  style: StyleType;
  setLayout: (layout: LayoutType) => void;
  setStyle: (style: StyleType) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);
