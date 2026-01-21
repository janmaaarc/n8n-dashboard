import React, { useState, useMemo } from 'react';
import { RefreshCw, Download, Calendar, BarChart3 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { format, subDays, startOfDay, eachDayOfInterval, startOfWeek, startOfMonth, eachWeekOfInterval, eachMonthOfInterval, subMonths } from 'date-fns';
import { PageHeader } from '../components/layout';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useExecutions, useWorkflows } from '../hooks/useN8n';
import { useSettings } from '../hooks/useSettings';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { useToast } from '../components/Toast';
import type { Workflow } from '../types';

type GroupBy = 'day' | 'week' | 'month';

interface UsageData {
  label: string;
  total: number;
  success: number;
  error: number;
}

interface WorkflowUsage {
  workflowId: string;
  workflowName: string;
  count: number;
  percentage: number;
  [key: string]: string | number;
}

const COLORS = ['#22c55e', '#ef4444', '#f59e0b', '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export const UsageReportsPage: React.FC = () => {
  const [groupBy, setGroupBy] = useState<GroupBy>('day');
  const { isAuthenticated } = useAuth();
  const { settings } = useSettings();
  const toast = useToast();

  const refreshOptions = {
    autoRefresh: settings.autoRefresh,
    refreshInterval: settings.refreshInterval,
  };

  const shouldFetchData = !isSupabaseConfigured() || isAuthenticated;

  const { data: executions, isLoading, refetch } = useExecutions(
    { limit: 1000 },
    shouldFetchData ? refreshOptions : { autoRefresh: false }
  );

  const { data: workflows } = useWorkflows(
    shouldFetchData ? { autoRefresh: false } : { autoRefresh: false }
  );

  const workflowMap = useMemo(() => {
    if (!workflows) return new Map<string, Workflow>();
    return new Map(workflows.map(w => [w.id, w]));
  }, [workflows]);

  const usageData = useMemo((): UsageData[] => {
    if (!executions) return [];

    const now = new Date();
    let intervals: Date[];
    let formatFn: (date: Date) => string;

    if (groupBy === 'day') {
      intervals = eachDayOfInterval({ start: subDays(now, 29), end: now });
      formatFn = (d: Date) => format(d, 'MMM d');
    } else if (groupBy === 'week') {
      intervals = eachWeekOfInterval({ start: subDays(now, 12 * 7), end: now });
      formatFn = (d: Date) => format(d, 'MMM d');
    } else {
      intervals = eachMonthOfInterval({ start: subMonths(now, 11), end: now });
      formatFn = (d: Date) => format(d, 'MMM yyyy');
    }

    const dataMap = new Map<string, { total: number; success: number; error: number }>();

    intervals.forEach(interval => {
      const key = formatFn(interval);
      dataMap.set(key, { total: 0, success: 0, error: 0 });
    });

    executions.forEach(e => {
      const date = new Date(e.startedAt);
      let key: string;

      if (groupBy === 'day') {
        key = format(startOfDay(date), 'MMM d');
      } else if (groupBy === 'week') {
        key = format(startOfWeek(date), 'MMM d');
      } else {
        key = format(startOfMonth(date), 'MMM yyyy');
      }

      if (dataMap.has(key)) {
        const data = dataMap.get(key)!;
        data.total++;
        if (e.status === 'success') data.success++;
        if (e.status === 'error') data.error++;
      }
    });

    return intervals.map(interval => {
      const label = formatFn(interval);
      const data = dataMap.get(label) || { total: 0, success: 0, error: 0 };
      return { label, ...data };
    });
  }, [executions, groupBy]);

  const workflowUsage = useMemo((): WorkflowUsage[] => {
    if (!executions || executions.length === 0) return [];

    const countMap = new Map<string, number>();
    executions.forEach(e => {
      countMap.set(e.workflowId, (countMap.get(e.workflowId) || 0) + 1);
    });

    const total = executions.length;
    return Array.from(countMap.entries())
      .map(([workflowId, count]) => ({
        workflowId,
        workflowName: workflowMap.get(workflowId)?.name || 'Unknown',
        count,
        percentage: (count / total) * 100,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [executions, workflowMap]);

  const totalStats = useMemo(() => {
    if (!executions) return { total: 0, success: 0, error: 0, running: 0 };
    return {
      total: executions.length,
      success: executions.filter(e => e.status === 'success').length,
      error: executions.filter(e => e.status === 'error').length,
      running: executions.filter(e => e.status === 'running').length,
    };
  }, [executions]);

  const handleRefresh = () => {
    refetch();
    toast.info('Refreshing usage data...');
  };

  const exportToCSV = () => {
    if (!executions || executions.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = ['Date', 'Workflow ID', 'Workflow Name', 'Status', 'Duration (ms)', 'Mode'];
    const rows = executions.map(e => {
      const duration = e.stoppedAt
        ? new Date(e.stoppedAt).getTime() - new Date(e.startedAt).getTime()
        : '';
      return [
        format(new Date(e.startedAt), 'yyyy-MM-dd HH:mm:ss'),
        e.workflowId,
        workflowMap.get(e.workflowId)?.name || 'Unknown',
        e.status,
        duration,
        e.mode,
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `execution-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('Report exported', 'CSV file downloaded');
  };

  return (
    <>
      <PageHeader
        title="Usage Reports"
        description="Analyze execution patterns and export reports"
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-1">
              {(['day', 'week', 'month'] as GroupBy[]).map((option) => (
                <button
                  key={option}
                  onClick={() => setGroupBy(option)}
                  className={`px-3 py-1 text-xs font-medium rounded transition-colors capitalize ${
                    groupBy === option
                      ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
            >
              <Download size={16} />
              Export CSV
            </button>
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
                  <BarChart3 size={16} />
                  <span className="text-xs font-medium uppercase">Total</span>
                </div>
                <span className="text-2xl font-semibold text-neutral-900 dark:text-white">
                  {totalStats.total.toLocaleString()}
                </span>
              </div>

              <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
                <div className="text-xs font-medium uppercase text-neutral-500 dark:text-neutral-400 mb-1">Success</div>
                <span className="text-2xl font-semibold text-green-600 dark:text-green-400">
                  {totalStats.success.toLocaleString()}
                </span>
              </div>

              <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
                <div className="text-xs font-medium uppercase text-neutral-500 dark:text-neutral-400 mb-1">Errors</div>
                <span className="text-2xl font-semibold text-red-600 dark:text-red-400">
                  {totalStats.error.toLocaleString()}
                </span>
              </div>

              <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
                <div className="text-xs font-medium uppercase text-neutral-500 dark:text-neutral-400 mb-1">Running</div>
                <span className="text-2xl font-semibold text-yellow-600 dark:text-yellow-400">
                  {totalStats.running.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Execution Chart */}
              <div className="lg:col-span-2 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar size={16} className="text-neutral-500" />
                  <h3 className="text-sm font-medium text-neutral-900 dark:text-white">
                    Executions by {groupBy === 'day' ? 'Day' : groupBy === 'week' ? 'Week' : 'Month'}
                  </h3>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={usageData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11 }}
                        stroke="#9CA3AF"
                        interval={groupBy === 'day' ? 4 : 0}
                      />
                      <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--tooltip-bg, #1f2937)',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                        }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Bar dataKey="success" stackId="a" fill="#22c55e" name="Success" />
                      <Bar dataKey="error" stackId="a" fill="#ef4444" name="Error" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Workflow Distribution Pie */}
              <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
                <h3 className="text-sm font-medium text-neutral-900 dark:text-white mb-4">
                  Workflow Distribution
                </h3>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={workflowUsage}
                        dataKey="count"
                        nameKey="workflowName"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }: { name?: string; percent?: number }) => {
                          const displayName = name || 'Unknown';
                          const displayPercent = percent || 0;
                          return `${displayName.slice(0, 10)}${displayName.length > 10 ? '...' : ''} (${(displayPercent * 100).toFixed(0)}%)`;
                        }}
                        labelLine={false}
                      >
                        {workflowUsage.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--tooltip-bg, #1f2937)',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                        }}
                        formatter={(value) => [value as number, '']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Most Active Workflows Table */}
            <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
                <h3 className="text-sm font-medium text-neutral-900 dark:text-white">
                  Most Active Workflows
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                    <tr>
                      <th className="text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase px-4 py-3">Rank</th>
                      <th className="text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase px-4 py-3">Workflow</th>
                      <th className="text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase px-4 py-3">Executions</th>
                      <th className="text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase px-4 py-3">Share</th>
                      <th className="text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase px-4 py-3 w-48">Distribution</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {workflowUsage.map((workflow, index) => (
                      <tr key={workflow.workflowId} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                            #{index + 1}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-neutral-900 dark:text-white">
                            {workflow.workflowName}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-neutral-600 dark:text-neutral-400">
                          {workflow.count.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-neutral-900 dark:text-white">
                          {workflow.percentage.toFixed(1)}%
                        </td>
                        <td className="px-4 py-3">
                          <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
                            <div
                              className="h-2 rounded-full"
                              style={{
                                width: `${workflow.percentage}%`,
                                backgroundColor: COLORS[index % COLORS.length],
                              }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </ErrorBoundary>
    </>
  );
};
