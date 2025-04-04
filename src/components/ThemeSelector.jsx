import React, { useState, useEffect } from 'react';

const ThemeSelector = () => {
  const [currentTheme, setCurrentTheme] = useState('corporate');
  const [isOpen, setIsOpen] = useState(false);
  
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
    // Get the current theme from localStorage or use the default
    const savedTheme = localStorage.getItem('theme') || 'corporate';
    setCurrentTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const handleThemeChange = (themeName) => {
    setCurrentTheme(themeName);
    document.documentElement.setAttribute('data-theme', themeName);
    localStorage.setItem('theme', themeName);
    setIsOpen(false);
    
    // Dispatch a custom event that the App component can listen for
    const event = new CustomEvent('themeChanged', { detail: { theme: themeName } });
    window.dispatchEvent(event);
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  // Find the current theme label
  const currentThemeLabel = themes.find(t => t.name === currentTheme)?.label || 'Corporate';

  return (
    <div className="dropdown dropdown-end">
      <button 
        tabIndex={0} 
        className="btn btn-ghost gap-2"
        onClick={toggleDropdown}
        aria-label="Change theme"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
        <span className="hidden md:inline">{currentThemeLabel}</span>
      </button>
      {isOpen && (
        <ul className="dropdown-content z-[1] menu p-2 shadow bg-base-200 rounded-box w-52 max-h-96 overflow-y-auto">
          {themes.map((theme) => (
            <li key={theme.name}>
              <button 
                className={`${currentTheme === theme.name ? 'active' : ''}`}
                onClick={() => handleThemeChange(theme.name)}
              >
                {theme.label}
                {currentTheme === theme.name && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
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