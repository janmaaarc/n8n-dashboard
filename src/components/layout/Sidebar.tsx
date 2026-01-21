import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Workflow,
  Activity,
  Key,
  Settings,
  LogOut,
  X,
  Menu,
  AlertCircle,
  BarChart3,
  FileText,
  ListTodo,
  Calendar,
  Webhook,
  Bell,
  Archive,
} from 'lucide-react';
import { useSidebar } from '../../contexts/SidebarContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { isSupabaseConfigured } from '../../lib/supabase';
import { ThemeToggle } from '../ThemeToggle';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
      { icon: Workflow, label: 'Workflows', path: '/workflows' },
      { icon: Activity, label: 'Executions', path: '/executions' },
    ],
  },
  {
    title: 'Monitoring',
    items: [
      { icon: AlertCircle, label: 'Error Log', path: '/errors' },
      { icon: BarChart3, label: 'Performance', path: '/performance' },
      { icon: FileText, label: 'Usage Reports', path: '/reports' },
      { icon: ListTodo, label: 'Queue', path: '/queue' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { icon: Calendar, label: 'Schedules', path: '/schedules' },
      { icon: Webhook, label: 'Webhooks', path: '/webhooks' },
      { icon: Bell, label: 'Alerts', path: '/alerts' },
    ],
  },
  {
    title: 'Admin',
    items: [
      { icon: Key, label: 'API Keys', path: '/api-keys' },
      { icon: Archive, label: 'Backups', path: '/backups' },
    ],
  },
];

const bottomNavItems: NavItem[] = [
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export const Sidebar: React.FC = () => {
  const { isMobileOpen, closeMobile } = useSidebar();
  const { user, signOut, isAuthenticated } = useAuth();
  const { darkMode, toggleTheme } = useTheme();
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
        `}
      >
        <Icon size={20} className="flex-shrink-0" />
        <span>{item.label}</span>
      </NavLink>
    );
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 py-4">
        <div className="w-8 h-8 rounded-lg bg-neutral-900 dark:bg-white flex items-center justify-center flex-shrink-0">
          <Workflow size={18} className="text-white dark:text-neutral-900" />
        </div>
        <span className="text-sm font-semibold text-neutral-900 dark:text-white">n8n Ops</span>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-2 py-4 overflow-y-auto">
        {navSections.map((section, sectionIndex) => (
          <div key={sectionIndex} className={sectionIndex > 0 ? 'mt-4' : ''}>
            {section.title && (
              <div className="px-3 py-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                  {section.title}
                </span>
              </div>
            )}
            <div className="space-y-1">
              {section.items.map(item => (
                <NavItemComponent key={item.path} item={item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="px-2 py-4 border-t border-neutral-200 dark:border-neutral-800 space-y-1">
        {bottomNavItems.map(item => (
          <NavItemComponent key={item.path} item={item} />
        ))}

        {/* Theme Toggle */}
        <div className="flex items-center gap-3 px-3 py-2">
          <ThemeToggle darkMode={darkMode} toggleTheme={toggleTheme} />
          <span className="text-sm text-neutral-600 dark:text-neutral-400">
            {darkMode ? 'Dark' : 'Light'}
          </span>
        </div>

        {/* User / Sign Out */}
        {isSupabaseConfigured() && isAuthenticated && (
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium w-full transition-colors text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 hover:text-neutral-900 dark:hover:text-white"
          >
            <LogOut size={20} className="flex-shrink-0" />
            <span className="truncate">{user?.email || 'Sign out'}</span>
          </button>
        )}
      </div>

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
          md:w-60
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
