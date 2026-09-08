'use client';

import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Icon } from './Icon';

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '' }) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className={`w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all cursor-pointer ${className}`}
      title={isDark ? 'Chuyển sang chế độ Sáng (Light Mode)' : 'Chuyển sang chế độ Tối (Dark Mode)'}
      aria-label="Toggle theme"
    >
      <Icon
        name={isDark ? 'light_mode' : 'dark_mode'}
        className="text-[18px] transition-transform duration-300 hover:rotate-12"
      />
    </button>
  );
};
