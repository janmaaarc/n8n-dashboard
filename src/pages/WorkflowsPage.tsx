import React, { useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { PageHeader } from '../components/layout';
import { WorkflowTable } from '../components/WorkflowTable';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useWorkflows, useExecutions, useToggleWorkflow, useTriggerWorkflow } from '../hooks/useN8n';
import { useSettings } from '../hooks/useSettings';
import { useFavorites } from '../hooks/useFavorites';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { useToast } from '../components/Toast';
import type { Workflow as WorkflowType } from '../types';

export const WorkflowsPage: React.FC = () => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { isAuthenticated } = useAuth();
  const { settings } = useSettings();
  const { favorites, toggleFavorite } = useFavorites();
  const toast = useToast();

  const refreshOptions = {
    autoRefresh: settings.autoRefresh,
    refreshInterval: settings.refreshInterval,
  };

  const shouldFetchData = !isSupabaseConfigured() || isAuthenticated;

  const { data: workflows, isLoading: workflowsLoading, refetch: refetchWorkflows } = useWorkflows(
    shouldFetchData ? refreshOptions : { autoRefresh: false }
  );
  const { data: executions, isLoading: executionsLoading, refetch: refetchExecutions } = useExecutions(
    { limit: 500 },
    shouldFetchData ? { ...refreshOptions, refreshInterval: refreshOptions.refreshInterval } : { autoRefresh: false }
  );
  const toggleWorkflow = useToggleWorkflow();
  const triggerWorkflow = useTriggerWorkflow();

  const isLoading = workflowsLoading || executionsLoading;

  const handleRefresh = () => {
    refetchWorkflows();
    refetchExecutions();
    toast.info('Refreshing workflows...');
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

  return (
    <>
      <PageHeader
        title="Workflows"
        description="Manage and monitor your n8n workflows"
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
        <WorkflowTable
          workflows={workflows || []}
          executions={executions || []}
          isLoading={isLoading}
          onToggleActive={handleToggleWorkflow}
          onTrigger={handleTriggerWorkflow}
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          searchInputRef={searchInputRef}
        />
      </ErrorBoundary>
    </>
  );
};
