import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Workflow,
  Activity,
  Key,
  Variable,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  X,
  Menu,
} from 'lucide-react';
import { useSidebar } from '../../contexts/SidebarContext';
import { useAuth } from '../../contexts/AuthContext';
import { isSupabaseConfigured } from '../../lib/supabase';
import { ThemeToggle } from '../ThemeToggle';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

const mainNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Workflow, label: 'Workflows', path: '/workflows' },
  { icon: Activity, label: 'Executions', path: '/executions' },
  { icon: Key, label: 'Credentials', path: '/credentials' },
  { icon: Variable, label: 'Variables', path: '/variables' },
];

const bottomNavItems: NavItem[] = [
  { icon: Settings, label: 'Settings', path: '/settings' },
];

interface SidebarProps {
  darkMode: boolean;
  toggleTheme: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ darkMode, toggleTheme }) => {
  const { isCollapsed, isMobileOpen, toggleCollapse, closeMobile } = useSidebar();
  const { user, signOut, isAuthenticated } = useAuth();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    closeMobile();
  };

  const NavItemComponent: React.FC<{ item: NavItem }> = ({ item }) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.path;

    return (
      <NavLink
        to={item.path}
        onClick={closeMobile}
        className={`
          flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
          ${isActive
            ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white'
            : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 hover:text-neutral-900 dark:hover:text-white'
          }
          ${isCollapsed && !isMobileOpen ? 'justify-center' : ''}
        `}
        title={isCollapsed && !isMobileOpen ? item.label : undefined}
      >
        <Icon size={20} className="flex-shrink-0" />
        {(!isCollapsed || isMobileOpen) && <span>{item.label}</span>}
      </NavLink>
    );
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className={`flex items-center gap-2 px-3 py-4 ${isCollapsed && !isMobileOpen ? 'justify-center' : ''}`}>
        <div className="w-8 h-8 rounded-lg bg-neutral-900 dark:bg-white flex items-center justify-center flex-shrink-0">
          <Workflow size={18} className="text-white dark:text-neutral-900" />
        </div>
        {(!isCollapsed || isMobileOpen) && (
          <span className="text-sm font-semibold text-neutral-900 dark:text-white">n8n Pulse</span>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {mainNavItems.map(item => (
          <NavItemComponent key={item.path} item={item} />
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="px-2 py-4 border-t border-neutral-200 dark:border-neutral-800 space-y-1">
        {bottomNavItems.map(item => (
          <NavItemComponent key={item.path} item={item} />
        ))}

        {/* Theme Toggle */}
        <div className={`flex items-center gap-3 px-3 py-2 ${isCollapsed && !isMobileOpen ? 'justify-center' : ''}`}>
          <ThemeToggle darkMode={darkMode} toggleTheme={toggleTheme} />
          {(!isCollapsed || isMobileOpen) && (
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              {darkMode ? 'Dark' : 'Light'}
            </span>
          )}
        </div>

        {/* User / Sign Out */}
        {isSupabaseConfigured() && isAuthenticated && (
          <button
            onClick={handleSignOut}
            className={`
              flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium w-full transition-colors
              text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 hover:text-neutral-900 dark:hover:text-white
              ${isCollapsed && !isMobileOpen ? 'justify-center' : ''}
            `}
            title={isCollapsed && !isMobileOpen ? `Sign out (${user?.email})` : undefined}
          >
            <LogOut size={20} className="flex-shrink-0" />
            {(!isCollapsed || isMobileOpen) && (
              <span className="truncate">{user?.email || 'Sign out'}</span>
            )}
          </button>
        )}
      </div>

      {/* Collapse Toggle (Desktop) */}
      <button
        onClick={toggleCollapse}
        className="hidden md:flex absolute -right-3 top-6 w-6 h-6 items-center justify-center rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </>
  );

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 z-50 flex flex-col transition-all duration-200
          ${isMobileOpen ? 'w-64 translate-x-0' : '-translate-x-full md:translate-x-0'}
          ${isCollapsed && !isMobileOpen ? 'md:w-16' : 'md:w-60'}
        `}
      >
        {/* Mobile Close Button */}
        {isMobileOpen && (
          <button
            onClick={closeMobile}
            className="absolute top-4 right-4 p-1 rounded-md text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 md:hidden"
          >
            <X size={20} />
          </button>
        )}

        {sidebarContent}
      </aside>
    </>
  );
};

// Mobile menu button component
export const MobileMenuButton: React.FC = () => {
  const { openMobile } = useSidebar();

  return (
    <button
      onClick={openMobile}
      className="p-2 rounded-md text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-800 md:hidden"
      aria-label="Open menu"
    >
      <Menu size={20} />
    </button>
  );
};
