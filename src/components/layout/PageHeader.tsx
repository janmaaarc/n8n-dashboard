import React from 'react';
import { ThemeToggle } from '../ThemeToggle';
import { useTheme } from '../../contexts/ThemeContext';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  showThemeToggle?: boolean;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, actions, showThemeToggle = false }) => {
  const { darkMode, toggleTheme } = useTheme();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-white">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {showThemeToggle && (
          <ThemeToggle darkMode={darkMode} toggleTheme={toggleTheme} />
        )}
        {actions}
      </div>
    </div>
  );
};
