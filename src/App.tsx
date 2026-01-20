import React, { useState, useEffect, useRef } from 'react';
import { Workflow, Play, CheckCircle, AlertCircle, RefreshCw, Settings, HelpCircle, LogOut, Loader2 } from 'lucide-react';
import { ThemeToggle } from './components/ThemeToggle';
import { StatCard } from './components/StatCard';
import { Section } from './components/Section';
import { ExecutionFeed } from './components/ExecutionFeed';
import { WorkflowList } from './components/WorkflowList';
import { ExecutionDetailsPanel } from './components/ExecutionDetailsPanel';
import { SettingsModal } from './components/SettingsModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { ExecutionChart } from './components/ExecutionChart';
import { ToastContainer, useToast } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LandingPage } from './components/LandingPage';
import { useWorkflows, useExecutions, useToggleWorkflow, useTriggerWorkflow, useDashboardStats } from './hooks/useN8n';
import { useSettings } from './hooks/useSettings';
import { useFavorites } from './hooks/useFavorites';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useExecutionNotifications } from './hooks/useExecutionNotifications';
import { useAuth } from './contexts/AuthContext';
import { isSupabaseConfigured } from './lib/supabase';
import type { Execution, Workflow as WorkflowType } from './types';

const App: React.FC = () => {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' ||
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  const [selectedExecution, setSelectedExecution] = useState<Execution | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { user, isAuthenticated, signOut, loading: authLoading } = useAuth();
  const { settings, isConfigured, updateSettings, resetSettings } = useSettings();
  const { favorites, toggleFavorite } = useFavorites();
  const toast = useToast();

  const refreshOptions = {
    autoRefresh: settings.autoRefresh,
    refreshInterval: settings.refreshInterval,
  };

  // Only fetch data if authenticated (when Supabase is configured) or if Supabase is not configured (single-user mode)
  const shouldFetchData = !isSupabaseConfigured() || isAuthenticated;

  const { data: workflows, isLoading: workflowsLoading, refetch: refetchWorkflows } = useWorkflows(
    shouldFetchData ? refreshOptions : { autoRefresh: false }
  );
  const { data: executions, isLoading: executionsLoading, refetch: refetchExecutions } = useExecutions(
    { limit: 50 },
    shouldFetchData ? refreshOptions : { autoRefresh: false }
  );
  const toggleWorkflow = useToggleWorkflow();
  const triggerWorkflow = useTriggerWorkflow();

  const stats = useDashboardStats(workflows, executions);

  // Browser notifications for new executions
  useExecutionNotifications(executions);

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

  const handleRefresh = () => {
    refetchWorkflows();
    refetchExecutions();
    toast.info('Refreshing data...');
  };

  const handleToggleWorkflow = (workflow: WorkflowType) => {
    const action = workflow.active ? 'Deactivating' : 'Activating';
    toast.info(`${action} ${workflow.name}...`);
    toggleWorkflow.mutate(workflow, {
      onSuccess: () => {
        toast.success(
          workflow.active ? 'Workflow deactivated' : 'Workflow activated',
          workflow.name
        );
      },
      onError: () => {
        toast.error('Failed to toggle workflow', workflow.name);
      },
    });
  };

  const handleTriggerWorkflow = (workflow: WorkflowType) => {
    toast.info(`Triggering ${workflow.name}...`);
    triggerWorkflow.mutate(workflow.id, {
      onSuccess: () => {
        toast.success('Workflow triggered', workflow.name);
      },
      onError: () => {
        toast.error('Failed to trigger workflow', workflow.name);
      },
    });
  };

  const handleExecutionClick = (execution: Execution) => {
    setSelectedExecution(execution);
  };

  const handleCloseModals = () => {
    if (selectedExecution) {
      setSelectedExecution(null);
    } else if (showSettings) {
      setShowSettings(false);
    } else if (showShortcuts) {
      setShowShortcuts(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.info('Signed out successfully');
  };

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onRefresh: handleRefresh,
    onSearch: () => searchInputRef.current?.focus(),
    onSettings: () => setShowSettings(true),
    onHelp: () => setShowShortcuts(true),
    onEscape: handleCloseModals,
    onToggleTheme: toggleTheme,
  });

  // Create workflow name map for enriching executions
  const workflowNameMap = React.useMemo(() => {
    const map = new Map<string, string>();
    workflows?.forEach(w => map.set(w.id, w.name));
    return map;
  }, [workflows]);

  // Enrich executions with workflow names
  const enrichedExecutions = React.useMemo(() => {
    return executions?.map(exec => ({
      ...exec,
      workflowName: exec.workflowName || workflowNameMap.get(exec.workflowId) || `Workflow ${exec.workflowId}`,
    })) || [];
  }, [executions, workflowNameMap]);

  const recentExecutions = enrichedExecutions.slice(0, 10);
  const errorExecutions = enrichedExecutions.filter(e => e.status === 'error').slice(0, 5);

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
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 font-sans text-neutral-900 dark:text-neutral-100">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2">
              <Workflow size={20} className="text-indigo-500" />
              <h1 className="text-sm font-semibold">n8n Dashboard</h1>
              {!isConfigured && (
                <span className="hidden sm:inline ml-2 px-2 py-0.5 text-xs rounded bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                  Not configured
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleRefresh}
                className="p-2 rounded-md text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-800 transition-colors"
                aria-label="Refresh data (R)"
                title="Refresh (R)"
              >
                <RefreshCw size={18} />
              </button>
              <button
                onClick={() => setShowShortcuts(true)}
                className="hidden sm:block p-2 rounded-md text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-800 transition-colors"
                aria-label="Keyboard shortcuts (?)"
                title="Shortcuts (?)"
              >
                <HelpCircle size={18} />
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-md text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-800 transition-colors"
                aria-label="Settings (,)"
                title="Settings (,)"
              >
                <Settings size={18} />
              </button>
              <ThemeToggle darkMode={darkMode} toggleTheme={toggleTheme} />
              {/* Sign Out button (only show when Supabase is configured and user is authenticated) */}
              {isSupabaseConfigured() && isAuthenticated && (
                <button
                  onClick={handleSignOut}
                  className="p-2 rounded-md text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-800 transition-colors"
                  aria-label="Sign out"
                  title={`Sign out (${user?.email})`}
                >
                  <LogOut size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
        {/* Not Configured State */}
        {!isConfigured && (
          <div className="mb-6 p-4 rounded-lg border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10">
            <div className="flex items-start gap-3">
              <Settings size={20} className="text-amber-600 dark:text-amber-500 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-amber-800 dark:text-amber-400">
                  Connect to your n8n instance
                </h3>
                <p className="text-sm text-amber-700 dark:text-amber-500/80 mt-1">
                  Configure your n8n URL and API key in{' '}
                  <button
                    onClick={() => setShowSettings(true)}
                    className="underline hover:no-underline"
                  >
                    Settings
                  </button>{' '}
                  to start monitoring your workflows.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          <StatCard
            label="Workflows"
            value={stats.totalWorkflows}
            icon={Workflow}
          />
          <StatCard
            label="Executions"
            value={stats.totalExecutions}
            icon={Play}
          />
          <StatCard
            label="Success Rate"
            value={stats.successRate}
            suffix="%"
            icon={CheckCircle}
            color="success"
          />
          <StatCard
            label="Errors"
            value={stats.recentErrors}
            icon={AlertCircle}
            color={stats.recentErrors > 0 ? 'error' : 'default'}
          />
        </div>

        {/* Execution Chart */}
        <div className="mb-8">
          <Section title="Execution History (7 days)">
            <ErrorBoundary>
              <ExecutionChart executions={enrichedExecutions} isLoading={executionsLoading} />
            </ErrorBoundary>
          </Section>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Workflows */}
          <div className="lg:col-span-2">
            <Section title="Workflows">
              <ErrorBoundary>
                <WorkflowList
                  workflows={workflows || []}
                  isLoading={workflowsLoading}
                  onToggleActive={handleToggleWorkflow}
                  onTrigger={handleTriggerWorkflow}
                  favorites={favorites}
                  onToggleFavorite={toggleFavorite}
                  searchInputRef={searchInputRef}
                />
              </ErrorBoundary>
            </Section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Section title="Recent Executions">
              <ErrorBoundary>
                <ExecutionFeed
                  executions={recentExecutions}
                  isLoading={executionsLoading}
                  onExecutionClick={handleExecutionClick}
                />
              </ErrorBoundary>
            </Section>

            {errorExecutions.length > 0 && (
              <Section title="Recent Errors">
                <ErrorBoundary>
                  <ExecutionFeed
                    executions={errorExecutions}
                    onExecutionClick={handleExecutionClick}
                    showFilter={false}
                  />
                </ErrorBoundary>
              </Section>
            )}
          </div>
        </div>
      </main>

      {/* Execution Details Panel */}
      <ExecutionDetailsPanel
        execution={selectedExecution}
        onClose={() => setSelectedExecution(null)}
      />

      {/* Settings Modal */}
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
    </div>
  );
};

export default App;
