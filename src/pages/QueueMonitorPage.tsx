import React, { useMemo } from 'react';
import { RefreshCw, Play, Clock, Loader2, CheckCircle, XCircle, Pause } from 'lucide-react';
import { formatDistanceToNow, differenceInSeconds } from 'date-fns';
import { PageHeader } from '../components/layout';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useExecutions, useWorkflows } from '../hooks/useN8n';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { useToast } from '../components/Toast';
import type { Execution, Workflow } from '../types';

interface QueuedExecution extends Execution {
  workflowName: string;
  duration: number;
}

export const QueueMonitorPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const toast = useToast();

  const refreshOptions = {
    autoRefresh: true,
    refreshInterval: 5, // Fast refresh for queue monitoring
  };

  const shouldFetchData = !isSupabaseConfigured() || isAuthenticated;

  const { data: executions, isLoading, refetch } = useExecutions(
    { limit: 100 },
    shouldFetchData ? refreshOptions : { autoRefresh: false }
  );

  const { data: workflows } = useWorkflows(
    shouldFetchData ? { autoRefresh: false } : { autoRefresh: false }
  );

  const workflowMap = useMemo(() => {
    if (!workflows) return new Map<string, Workflow>();
    return new Map(workflows.map(w => [w.id, w]));
  }, [workflows]);

  const queuedExecutions = useMemo((): { running: QueuedExecution[]; waiting: QueuedExecution[] } => {
    if (!executions) return { running: [], waiting: [] };

    const now = new Date();
    const running: QueuedExecution[] = [];
    const waiting: QueuedExecution[] = [];

    executions.forEach(e => {
      if (e.status === 'running' || e.status === 'waiting') {
        const queuedExecution: QueuedExecution = {
          ...e,
          workflowName: workflowMap.get(e.workflowId)?.name || e.workflowName || 'Unknown',
          duration: differenceInSeconds(now, new Date(e.startedAt)),
        };

        if (e.status === 'running') {
          running.push(queuedExecution);
        } else {
          waiting.push(queuedExecution);
        }
      }
    });

    return {
      running: running.sort((a, b) => b.duration - a.duration),
      waiting: waiting.sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()),
    };
  }, [executions, workflowMap]);

  const recentCompleted = useMemo(() => {
    if (!executions) return [];

    return executions
      .filter(e => e.status === 'success' || e.status === 'error')
      .slice(0, 5)
      .map(e => ({
        ...e,
        workflowName: workflowMap.get(e.workflowId)?.name || e.workflowName || 'Unknown',
      }));
  }, [executions, workflowMap]);

  const handleRefresh = () => {
    refetch();
    toast.info('Refreshing queue...');
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'running':
        return <Loader2 size={16} className="animate-spin text-blue-500" />;
      case 'waiting':
        return <Pause size={16} className="text-yellow-500" />;
      case 'success':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'error':
        return <XCircle size={16} className="text-red-500" />;
      default:
        return <Clock size={16} className="text-neutral-400" />;
    }
  };

  const totalActive = queuedExecutions.running.length + queuedExecutions.waiting.length;

  return (
    <>
      <PageHeader
        title="Queue Monitor"
        description="Monitor running and queued executions in real-time"
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Auto-refresh: 5s
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
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw size={24} className="animate-spin text-neutral-400" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
                <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 mb-1">
                  <Play size={16} />
                  <span className="text-xs font-medium uppercase">Running</span>
                </div>
                <span className="text-2xl font-semibold text-blue-600 dark:text-blue-400">
                  {queuedExecutions.running.length}
                </span>
              </div>

              <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
                <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 mb-1">
                  <Clock size={16} />
                  <span className="text-xs font-medium uppercase">Waiting</span>
                </div>
                <span className="text-2xl font-semibold text-yellow-600 dark:text-yellow-400">
                  {queuedExecutions.waiting.length}
                </span>
              </div>

              <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
                <div className="text-xs font-medium uppercase text-neutral-500 dark:text-neutral-400 mb-1">Total Active</div>
                <span className="text-2xl font-semibold text-neutral-900 dark:text-white">
                  {totalActive}
                </span>
              </div>

              <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
                <div className="text-xs font-medium uppercase text-neutral-500 dark:text-neutral-400 mb-1">Status</div>
                <span className={`text-2xl font-semibold ${totalActive > 0 ? 'text-green-600 dark:text-green-400' : 'text-neutral-400'}`}>
                  {totalActive > 0 ? 'Active' : 'Idle'}
                </span>
              </div>
            </div>

            {/* Running Executions */}
            <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-blue-500" />
                  <h3 className="text-sm font-medium text-neutral-900 dark:text-white">
                    Running Executions
                  </h3>
                </div>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded">
                  {queuedExecutions.running.length}
                </span>
              </div>

              {queuedExecutions.running.length === 0 ? (
                <div className="p-8 text-center text-neutral-500 dark:text-neutral-400">
                  <Play size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No executions currently running</p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {queuedExecutions.running.map((execution) => (
                    <div key={execution.id} className="px-4 py-3 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                      <div className="flex items-center gap-3">
                        <StatusIcon status={execution.status} />
                        <div>
                          <p className="text-sm font-medium text-neutral-900 dark:text-white">
                            {execution.workflowName}
                          </p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            ID: {execution.id.slice(0, 8)} • Mode: {execution.mode}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                          {formatDuration(execution.duration)}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          Started {formatDistanceToNow(new Date(execution.startedAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Waiting Executions */}
            <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-yellow-500" />
                  <h3 className="text-sm font-medium text-neutral-900 dark:text-white">
                    Waiting in Queue
                  </h3>
                </div>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded">
                  {queuedExecutions.waiting.length}
                </span>
              </div>

              {queuedExecutions.waiting.length === 0 ? (
                <div className="p-8 text-center text-neutral-500 dark:text-neutral-400">
                  <Clock size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No executions waiting in queue</p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {queuedExecutions.waiting.map((execution, index) => (
                    <div key={execution.id} className="px-4 py-3 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-xs font-medium text-neutral-500">
                          {index + 1}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-neutral-900 dark:text-white">
                            {execution.workflowName}
                          </p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            ID: {execution.id.slice(0, 8)} • Mode: {execution.mode}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                          Waiting {formatDuration(execution.duration)}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          Queued {formatDistanceToNow(new Date(execution.startedAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Completed */}
            <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
                <h3 className="text-sm font-medium text-neutral-900 dark:text-white">
                  Recently Completed
                </h3>
              </div>

              {recentCompleted.length === 0 ? (
                <div className="p-8 text-center text-neutral-500 dark:text-neutral-400">
                  <p className="text-sm">No recent completions</p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {recentCompleted.map((execution) => (
                    <div key={execution.id} className="px-4 py-3 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                      <div className="flex items-center gap-3">
                        <StatusIcon status={execution.status} />
                        <div>
                          <p className="text-sm font-medium text-neutral-900 dark:text-white">
                            {execution.workflowName}
                          </p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            ID: {execution.id.slice(0, 8)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-medium px-2 py-1 rounded ${
                          execution.status === 'success'
                            ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'
                        }`}>
                          {execution.status}
                        </span>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                          {formatDistanceToNow(new Date(execution.stoppedAt || execution.startedAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </ErrorBoundary>
    </>
  );
};
