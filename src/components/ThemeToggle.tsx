import { Sun, Moon, Monitor } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
import { useState } from 'react';

export default function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();
  const [isOpen, setIsOpen] = useState(false);

  const themes = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'system', icon: Monitor, label: 'System' },
  ] as const;

  const currentTheme = themes.find(t => t.value === theme) || themes[2];

  const handleThemeChange = (newTheme: typeof theme) => {
    console.log('DaisyUI theme toggle clicked:', newTheme);
    setTheme(newTheme);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-base-content/70 hover:text-base-content transition-all duration-200 rounded-lg hover:bg-base-200 border border-transparent hover:border-base-300"
        title={`Current theme: ${currentTheme.label}`}
      >
        <currentTheme.icon size={18} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute right-0 bottom-full mb-2 z-20 bg-base-100 border border-base-300 rounded-lg shadow-xl py-1 min-w-[130px]">
            {themes.map((themeOption) => (
              <button
                key={themeOption.value}
                onClick={() => handleThemeChange(themeOption.value)}
                className={`w-full flex items-center px-3 py-2.5 text-sm hover:bg-base-200 transition-colors ${
                  theme === themeOption.value 
                    ? 'text-primary bg-primary/10 font-medium' 
                    : 'text-base-content'
                }`}
              >
                <themeOption.icon size={16} className="mr-3" />
                <span>{themeOption.label}</span>
                {theme === themeOption.value && (
                  <div className="ml-auto w-2 h-2 bg-primary rounded-full"></div>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}