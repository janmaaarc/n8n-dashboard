import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { MainLayout } from './components/layout';
import { SettingsModal } from './components/SettingsModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { CommandPalette } from './components/CommandPalette';
import { LandingPage } from './components/LandingPage';
import { useCommandPalette } from './hooks/useCommandPalette';
import { useSettings } from './hooks/useSettings';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useAuth } from './contexts/AuthContext';
import { isSupabaseConfigured } from './lib/supabase';

// Lazy load pages for code splitting
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const WorkflowsPage = lazy(() => import('./pages/WorkflowsPage').then(m => ({ default: m.WorkflowsPage })));
const ExecutionsPage = lazy(() => import('./pages/ExecutionsPage').then(m => ({ default: m.ExecutionsPage })));
const CredentialsPage = lazy(() => import('./pages/CredentialsPage').then(m => ({ default: m.CredentialsPage })));
const VariablesPage = lazy(() => import('./pages/VariablesPage').then(m => ({ default: m.VariablesPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));

// Monitoring Pages
const ErrorLogPage = lazy(() => import('./pages/ErrorLogPage').then(m => ({ default: m.ErrorLogPage })));
const PerformanceMetricsPage = lazy(() => import('./pages/PerformanceMetricsPage').then(m => ({ default: m.PerformanceMetricsPage })));
const UsageReportsPage = lazy(() => import('./pages/UsageReportsPage').then(m => ({ default: m.UsageReportsPage })));
const QueueMonitorPage = lazy(() => import('./pages/QueueMonitorPage').then(m => ({ default: m.QueueMonitorPage })));

// Operations Pages
const SchedulesPage = lazy(() => import('./pages/SchedulesPage').then(m => ({ default: m.SchedulesPage })));
const WebhooksPage = lazy(() => import('./pages/WebhooksPage').then(m => ({ default: m.WebhooksPage })));
const AlertsPage = lazy(() => import('./pages/AlertsPage').then(m => ({ default: m.AlertsPage })));

// Admin Pages
const ApiKeysPage = lazy(() => import('./pages/ApiKeysPage').then(m => ({ default: m.ApiKeysPage })));
const BackupsPage = lazy(() => import('./pages/BackupsPage').then(m => ({ default: m.BackupsPage })));

// Loading fallback for lazy-loaded routes
const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <Loader2 size={24} className="animate-spin text-neutral-400" />
  </div>
);

const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' ||
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  const [showSettings, setShowSettings] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  const { isAuthenticated, loading: authLoading } = useAuth();
  const { settings, updateSettings, resetSettings } = useSettings();
  const navigate = useNavigate();
  const commandPalette = useCommandPalette({
    onRefresh: () => window.location.reload(),
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const toggleTheme = () => setDarkMode((prev) => !prev);

  const handleCloseModals = () => {
    if (commandPalette.isOpen) {
      commandPalette.close();
    } else if (showSettings) {
      setShowSettings(false);
    } else if (showShortcuts) {
      setShowShortcuts(false);
    }
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onRefresh: () => window.location.reload(),
    onSearch: () => {}, // Handle in individual pages
    onSettings: () => navigate('/settings'),
    onHelp: () => setShowShortcuts(true),
    onEscape: handleCloseModals,
    onToggleTheme: toggleTheme,
    onCommandPalette: commandPalette.toggle,
  });

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-neutral-500" />
      </div>
    );
  }

  // Show landing page if Supabase is configured and user is not authenticated
  if (isSupabaseConfigured() && !isAuthenticated) {
    return <LandingPage darkMode={darkMode} toggleTheme={toggleTheme} />;
  }

  return (
    <>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<MainLayout darkMode={darkMode} toggleTheme={toggleTheme} />}>
            {/* Main */}
            <Route path="/" element={<DashboardPage onShowSettings={() => setShowSettings(true)} />} />
            <Route path="/workflows" element={<WorkflowsPage />} />
            <Route path="/executions" element={<ExecutionsPage />} />
            <Route path="/credentials" element={<CredentialsPage />} />
            <Route path="/variables" element={<VariablesPage />} />

            {/* Monitoring */}
            <Route path="/errors" element={<ErrorLogPage />} />
            <Route path="/performance" element={<PerformanceMetricsPage />} />
            <Route path="/reports" element={<UsageReportsPage />} />
            <Route path="/queue" element={<QueueMonitorPage />} />

            {/* Operations */}
            <Route path="/schedules" element={<SchedulesPage />} />
            <Route path="/webhooks" element={<WebhooksPage />} />
            <Route path="/alerts" element={<AlertsPage />} />

            {/* Admin */}
            <Route path="/api-keys" element={<ApiKeysPage />} />
            <Route path="/backups" element={<BackupsPage />} />

            {/* Settings */}
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </Suspense>

      {/* Settings Modal (for quick access) */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSave={updateSettings}
        onReset={resetSettings}
      />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />

      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPalette.isOpen}
        onClose={commandPalette.close}
        query={commandPalette.query}
        onQueryChange={commandPalette.setQuery}
        commands={commandPalette.commands}
        onSelectCommand={commandPalette.executeCommand}
      />
    </>
  );
};

export default App;
