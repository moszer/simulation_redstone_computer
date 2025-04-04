import React, { useState, useEffect } from 'react';

const ThemeSelector = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem('theme') || 'corporate';
  });
  
  const themes = [
    { name: 'corporate', label: 'Corporate' },
    { name: 'dark', label: 'Dark' },
    { name: 'light', label: 'Light' },
    { name: 'cyberpunk', label: 'Cyberpunk' },
    { name: 'synthwave', label: 'Synthwave' },
    { name: 'retro', label: 'Retro' },
    { name: 'valentine', label: 'Valentine' },
    { name: 'halloween', label: 'Halloween' },
    { name: 'garden', label: 'Garden' },
    { name: 'forest', label: 'Forest' },
    { name: 'aqua', label: 'Aqua' },
    { name: 'lofi', label: 'Lofi' },
    { name: 'pastel', label: 'Pastel' },
    { name: 'fantasy', label: 'Fantasy' },
    { name: 'wireframe', label: 'Wireframe' },
    { name: 'black', label: 'Black' },
    { name: 'luxury', label: 'Luxury' },
    { name: 'dracula', label: 'Dracula' },
    { name: 'cmyk', label: 'CMYK' },
    { name: 'autumn', label: 'Autumn' },
    { name: 'business', label: 'Business' },
    { name: 'acid', label: 'Acid' },
    { name: 'lemonade', label: 'Lemonade' },
    { name: 'night', label: 'Night' },
    { name: 'coffee', label: 'Coffee' },
    { name: 'winter', label: 'Winter' }
  ];

  useEffect(() => {
    // Apply the theme to the document
    document.documentElement.setAttribute('data-theme', currentTheme);
    
    // Store the theme in localStorage
    localStorage.setItem('theme', currentTheme);
    
    // Dispatch a custom event to notify other components
    window.dispatchEvent(new CustomEvent('themeChanged', { 
      detail: { theme: currentTheme } 
    }));
  }, [currentTheme]);

  const handleThemeChange = (themeName) => {
    setCurrentTheme(themeName);
    setIsOpen(false);
  };

  const currentThemeLabel = themes.find(t => t.name === currentTheme)?.label || 'Corporate';

  return (
    <div className="dropdown dropdown-end">
      <button 
        tabIndex={0} 
        className="btn btn-ghost btn-circle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Change theme"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      </button>
      {isOpen && (
        <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52 max-h-96 overflow-y-auto">
          {themes.map((theme) => (
            <li key={theme.name}>
              <button 
                className={`flex justify-between items-center ${currentTheme === theme.name ? 'active' : ''}`}
                onClick={() => handleThemeChange(theme.name)}
              >
                <span>{theme.label}</span>
                {currentTheme === theme.name && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ThemeSelector; 