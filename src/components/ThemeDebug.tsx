import { useThemeStore } from '../store/themeStore';
import { useEffect, useState } from 'react';

export default function ThemeDebug() {
  const { theme, setTheme } = useThemeStore();
  const [dataTheme, setDataTheme] = useState('');
  const [htmlClasses, setHtmlClasses] = useState('');
  const [systemTheme, setSystemTheme] = useState('');

  useEffect(() => {
    const updateClasses = () => {
      setDataTheme(document.documentElement.getAttribute('data-theme') || 'none');
      setHtmlClasses(document.documentElement.className);
      setSystemTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    };

    updateClasses();
    const interval = setInterval(updateClasses, 200);
    return () => clearInterval(interval);
  }, [theme]);

  // Force apply dark mode for testing
  const forceApplyTheme = (theme: string) => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    console.log('Force applied DaisyUI theme:', theme, 'data-theme:', root.getAttribute('data-theme'));
  };

  // Only show in development
  if (process.env.NODE_ENV === 'production') return null;

  return (
    <div className="fixed top-4 right-4 bg-base-100 border-2 border-base-300 rounded-lg p-3 text-xs font-mono shadow-lg z-50 min-w-[280px]">
      <div><strong>Theme Store:</strong> {theme}</div>
      <div><strong>DaisyUI data-theme:</strong> {dataTheme}</div>
      <div><strong>HTML Classes:</strong> {htmlClasses || 'none'}</div>
      <div><strong>System Preference:</strong> {systemTheme}</div>
      <div className="mt-2 grid grid-cols-2 gap-1">
        <button 
          onClick={() => forceApplyTheme('dark')}
          className="px-2 py-1 bg-neutral text-neutral-content text-xs rounded hover:bg-neutral-focus"
        >
          Force Dark
        </button>
        <button 
          onClick={() => forceApplyTheme('light')}
          className="px-2 py-1 bg-base-200 text-base-content text-xs rounded hover:bg-base-300"
        >
          Force Light
        </button>
        <button 
          onClick={() => setTheme('dark')}
          className="px-2 py-1 bg-primary text-primary-content text-xs rounded hover:bg-primary-focus"
        >
          Set Dark
        </button>
        <button 
          onClick={() => setTheme('light')}
          className="px-2 py-1 bg-secondary text-secondary-content text-xs rounded hover:bg-secondary-focus"
        >
          Set Light
        </button>
      </div>
    </div>
  );
}