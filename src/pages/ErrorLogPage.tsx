import React, { useState, useMemo } from 'react';
import { RefreshCw, AlertCircle, ExternalLink, RotateCcw, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { PageHeader } from '../components/layout';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useExecutions, useWorkflows, useTriggerWorkflow } from '../hooks/useN8n';
import { useSettings } from '../hooks/useSettings';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { useToast } from '../components/Toast';
import type { Execution } from '../types';

type TimeFilter = '1h' | '24h' | '7d' | '30d' | 'all';

export const ErrorLogPage: React.FC = () => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('24h');
  const { isAuthenticated } = useAuth();
  const { settings } = useSettings();
  const toast = useToast();
  const triggerWorkflow = useTriggerWorkflow();

  const refreshOptions = {
    autoRefresh: settings.autoRefresh,
    refreshInterval: settings.refreshInterval,
  };

  const shouldFetchData = !isSupabaseConfigured() || isAuthenticated;

  // Fetch all executions and filter client-side for errors
  // The n8n API status filter may not work reliably in all versions
  const { data: allExecutions, isLoading, refetch } = useExecutions(
    { limit: 500 },
    shouldFetchData ? refreshOptions : { autoRefresh: false }
  );

  // Filter for error executions client-side
  const executions = useMemo(() => {
    if (!allExecutions) return [];
    return allExecutions.filter(e => e.status === 'error');
  }, [allExecutions]);

  const { data: workflows } = useWorkflows(
    shouldFetchData ? { autoRefresh: false } : { autoRefresh: false }
  );

  const workflowMap = useMemo(() => {
    if (!workflows) return new Map<string, string>();
    return new Map(workflows.map(w => [w.id, w.name]));
  }, [workflows]);

  const filteredErrors = useMemo(() => {
    if (!executions) return [];

    const now = new Date();
    const cutoffMap: Record<TimeFilter, number | null> = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      'all': null,
    };

    const cutoff = cutoffMap[timeFilter];
    if (cutoff === null) return executions;

    const cutoffDate = new Date(now.getTime() - cutoff);
    return executions.filter(e => new Date(e.startedAt) >= cutoffDate);
  }, [executions, timeFilter]);

  const handleRefresh = () => {
    refetch();
    toast.info('Refreshing error log...');
  };

  const handleRetry = async (execution: Execution) => {
    try {
      await triggerWorkflow.mutateAsync(execution.workflowId);
      toast.success('Workflow triggered', workflowMap.get(execution.workflowId) || 'Workflow');
    } catch {
      toast.error('Failed to trigger workflow');
    }
  };

  const getErrorMessage = (execution: Execution): string => {
    return execution.data?.resultData?.error?.message || 'Unknown error';
  };

  const getErrorStack = (execution: Execution): string | undefined => {
    return execution.data?.resultData?.error?.stack;
  };

  return (
    <>
      <PageHeader
        title="Error Log"
        description="View and troubleshoot failed executions"
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-1">
              {(['1h', '24h', '7d', '30d', 'all'] as TimeFilter[]).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setTimeFilter(filter)}
                  className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                    timeFilter === filter
                      ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  {filter === 'all' ? 'All' : filter}
                </button>
              ))}
            </div>
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        }
      />

      <ErrorBoundary>
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw size={24} className="animate-spin text-neutral-400" />
            </div>
          ) : filteredErrors.length === 0 ? (
            <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-8 text-center">
              <AlertCircle size={48} className="mx-auto text-neutral-300 dark:text-neutral-700 mb-4" />
              <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">No errors found</h3>
              <p className="text-neutral-500 dark:text-neutral-400">
                No failed executions in the selected time period.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
                <Filter size={14} />
                <span>{filteredErrors.length} error{filteredErrors.length !== 1 ? 's' : ''} found</span>
              </div>

              {filteredErrors.map((execution) => {
                const isExpanded = expandedId === execution.id;
                const errorStack = getErrorStack(execution);

                return (
                  <div
                    key={execution.id}
                    className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden"
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
                            <span className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                              {workflowMap.get(execution.workflowId) || execution.workflowName || 'Unknown Workflow'}
                            </span>
                            <span className="text-xs text-neutral-400">#{execution.id.slice(0, 8)}</span>
                          </div>
                          <p className="text-sm text-red-600 dark:text-red-400 mb-2">
                            {getErrorMessage(execution)}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
                            <span>{formatDistanceToNow(new Date(execution.startedAt), { addSuffix: true })}</span>
                            <span>Mode: {execution.mode}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleRetry(execution)}
                            disabled={triggerWorkflow.isPending}
                            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
                            title="Retry workflow"
                          >
                            <RotateCcw size={14} />
                            Retry
                          </button>
                          <Link
                            to={`/workflows?highlight=${execution.workflowId}`}
                            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
                            title="View workflow"
                          >
                            <ExternalLink size={14} />
                            View
                          </Link>
                          {errorStack && (
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : execution.id)}
                              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
                            >
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              Stack
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {isExpanded && errorStack && (
                      <div className="border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 p-4">
                        <pre className="text-xs text-neutral-600 dark:text-neutral-400 overflow-x-auto whitespace-pre-wrap font-mono">
                          {errorStack}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </ErrorBoundary>
    </>
  );
};
