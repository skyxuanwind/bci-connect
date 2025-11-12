import React from 'react';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      aria-label={isDark ? '切換為亮白主題' : '切換為黑金主題'}
      title={isDark ? '切換為亮白主題' : '切換為黑金主題'}
      onClick={toggleTheme}
      className={`p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 ${
        isDark
          ? 'text-gold-300 hover:text-gold-100 focus:ring-gold-500'
          : 'text-gray-700 hover:text-gray-900 focus:ring-blue-600'
      } ${className}`}
    >
      {isDark ? <SunIcon className="h-6 w-6" /> : <MoonIcon className="h-6 w-6" />}
    </button>
  );
};

export default ThemeToggle;