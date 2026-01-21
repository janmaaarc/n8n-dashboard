import React from 'react';
import { RefreshCw } from 'lucide-react';
import { PageHeader } from '../components/layout';
import { ExecutionTable } from '../components/ExecutionTable';
import { ExecutionDetailsPanel } from '../components/ExecutionDetailsPanel';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useWorkflows, useExecutions } from '../hooks/useN8n';
import { useSettings } from '../hooks/useSettings';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { useToast } from '../components/Toast';
import type { Execution } from '../types';

export const ExecutionsPage: React.FC = () => {
  const [selectedExecution, setSelectedExecution] = React.useState<Execution | null>(null);
  const { isAuthenticated } = useAuth();
  const { settings } = useSettings();
  const toast = useToast();

  const refreshOptions = {
    autoRefresh: settings.autoRefresh,
    refreshInterval: settings.refreshInterval,
  };

  const shouldFetchData = !isSupabaseConfigured() || isAuthenticated;

  const { data: workflows } = useWorkflows(
    shouldFetchData ? refreshOptions : { autoRefresh: false }
  );
  const { data: executions, isLoading, refetch } = useExecutions(
    { limit: 200 },
    shouldFetchData ? refreshOptions : { autoRefresh: false }
  );

  const handleRefresh = () => {
    refetch();
    toast.info('Refreshing executions...');
  };

  const handleExecutionClick = (execution: Execution) => {
    setSelectedExecution(execution);
  };

  return (
    <>
      <PageHeader
        title="Executions"
        description="View execution history and details"
        actions={
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        }
      />

      <ErrorBoundary>
        <ExecutionTable
          executions={executions || []}
          workflows={workflows || []}
          isLoading={isLoading}
          onExecutionClick={handleExecutionClick}
        />
      </ErrorBoundary>

      <ExecutionDetailsPanel
        execution={selectedExecution}
        onClose={() => setSelectedExecution(null)}
      />
    </>
  );
};
