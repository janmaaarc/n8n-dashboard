import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { MainLayout } from './components/layout';
import { ToastContainer, useToast } from './components/Toast';
import { SettingsModal } from './components/SettingsModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { LandingPage } from './components/LandingPage';
import {
  DashboardPage,
  WorkflowsPage,
  ExecutionsPage,
  CredentialsPage,
  TagsPage,
  VariablesPage,
  SettingsPage,
} from './pages';
import { useSettings } from './hooks/useSettings';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useAuth } from './contexts/AuthContext';
import { isSupabaseConfigured } from './lib/supabase';

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

  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { settings, updateSettings, resetSettings } = useSettings();
  const toast = useToast();
  const navigate = useNavigate();

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
    if (showSettings) {
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
  });

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  // Show landing page if Supabase is configured and user is not authenticated
  if (isSupabaseConfigured() && !isAuthenticated) {
    return <LandingPage darkMode={darkMode} toggleTheme={toggleTheme} />;
  }

  return (
    <>
      <Routes>
        <Route element={<MainLayout darkMode={darkMode} toggleTheme={toggleTheme} />}>
          <Route path="/" element={<DashboardPage onShowSettings={() => setShowSettings(true)} />} />
          <Route path="/workflows" element={<WorkflowsPage />} />
          <Route path="/executions" element={<ExecutionsPage />} />
          <Route path="/credentials" element={<CredentialsPage />} />
          <Route path="/tags" element={<TagsPage />} />
          <Route path="/variables" element={<VariablesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>

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

      {/* Toast Notifications */}
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismissToast} />
    </>
  );
};

export default App;
