import { create } from 'zustand';

type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const getStoredTheme = (): Theme => {
  try {
    const storedTheme = localStorage.getItem('theme') as Theme;
    return storedTheme || 'system';
  } catch {
    return 'system';
  }
};

const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  
  let actualTheme = theme;
  if (theme === 'system') {
    actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  
  // DaisyUI uses data-theme attribute
  root.setAttribute('data-theme', actualTheme);
  
  console.log('DaisyUI theme applied:', actualTheme, 'data-theme:', root.getAttribute('data-theme'));
};

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: getStoredTheme(),
  setTheme: (theme) => {
    console.log('Setting DaisyUI theme to:', theme);
    
    // Apply theme to DOM FIRST
    applyTheme(theme);
    
    // Then update localStorage and store
    localStorage.setItem('theme', theme);
    set({ theme });
  },
}));

// Initialize theme on app load
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  const initializeTheme = () => {
    const storedTheme = getStoredTheme();
    console.log('Initializing DaisyUI theme:', storedTheme);
    applyTheme(storedTheme);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTheme);
  } else {
    initializeTheme();
  }

  // Listen for system theme changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleSystemThemeChange = () => {
    const currentTheme = getStoredTheme();
    if (currentTheme === 'system') {
      applyTheme('system');
    }
  };
  
  mediaQuery.addEventListener('change', handleSystemThemeChange);
}