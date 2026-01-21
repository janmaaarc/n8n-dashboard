import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar, MobileMenuButton } from './Sidebar';
import { useSidebar } from '../../contexts/SidebarContext';
import { useIsMobile } from '../../hooks/useMediaQuery';

interface MainLayoutProps {
  darkMode: boolean;
  toggleTheme: () => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ darkMode, toggleTheme }) => {
  const { isCollapsed } = useSidebar();
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <Sidebar darkMode={darkMode} toggleTheme={toggleTheme} />

      {/* Main Content */}
      <main
        className={`
          min-h-screen transition-all duration-200
          ${isMobile ? 'ml-0' : isCollapsed ? 'md:ml-16' : 'md:ml-60'}
        `}
      >
        {/* Mobile Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm border-b border-neutral-200 dark:border-neutral-800 md:hidden">
          <MobileMenuButton />
          <span className="text-sm font-semibold text-neutral-900 dark:text-white">n8n Dashboard</span>
          <div className="w-10" /> {/* Spacer for centering */}
        </header>

        {/* Page Content */}
        <div className="p-4 md:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
