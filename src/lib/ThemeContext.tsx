'use client';

import { createContext, useContext } from 'react';

export interface EngineTheme {
  primary: string;
  accent: string;
  background: string;
}

const ThemeContext = createContext<EngineTheme>({
  primary: '#035642',
  accent: '#10b981',
  background: '#022b21',
});

export function EngineThemeProvider({ theme, children }: { theme: EngineTheme; children: React.ReactNode }) {
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useEngineTheme() {
  return useContext(ThemeContext);
}
