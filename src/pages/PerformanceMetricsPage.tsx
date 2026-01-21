import React, { useMemo } from 'react';
import { RefreshCw, Clock, TrendingUp, TrendingDown, Minus, Zap, Download } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { format, subDays, startOfDay, differenceInMilliseconds } from 'date-fns';
import { PageHeader } from '../components/layout';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useAllExecutions, useWorkflows } from '../hooks/useN8n';
import { useSettings } from '../hooks/useSettings';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { useToast } from '../components/Toast';
import type { Execution, Workflow } from '../types';

interface WorkflowMetrics {
  workflowId: string;
  workflowName: string;
  executionCount: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  successRate: number;
}

interface DailyMetrics {
  date: string;
  successRate: number;
  avgDuration: number;
  total: number;
}

const calculateDuration = (execution: Execution): number | null => {
  if (!execution.stoppedAt) return null;
  return differenceInMilliseconds(new Date(execution.stoppedAt), new Date(execution.startedAt));
};

const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
};

export const PerformanceMetricsPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { settings } = useSettings();
  const toast = useToast();

  const refreshOptions = {
    autoRefresh: settings.autoRefresh,
    refreshInterval: settings.refreshInterval,
  };

  const shouldFetchData = !isSupabaseConfigured() || isAuthenticated;

  const { data: executions, isLoading, refetch } = useAllExecutions(
    {},
    shouldFetchData ? refreshOptions : { autoRefresh: false }
  );

  const { data: workflows } = useWorkflows(
    shouldFetchData ? { autoRefresh: false } : { autoRefresh: false }
  );

  const workflowMap = useMemo(() => {
    if (!workflows) return new Map<string, Workflow>();
    return new Map(workflows.map(w => [w.id, w]));
  }, [workflows]);

  const workflowMetrics = useMemo((): WorkflowMetrics[] => {
    if (!executions) return [];

    const metricsMap = new Map<string, {
      durations: number[];
      successCount: number;
      totalCount: number;
    }>();

    executions.forEach(e => {
      const duration = calculateDuration(e);
      if (!metricsMap.has(e.workflowId)) {
        metricsMap.set(e.workflowId, { durations: [], successCount: 0, totalCount: 0 });
      }
      const metrics = metricsMap.get(e.workflowId)!;
      if (duration !== null) metrics.durations.push(duration);
      if (e.status === 'success') metrics.successCount++;
      metrics.totalCount++;
    });

    return Array.from(metricsMap.entries())
      .map(([workflowId, data]) => {
        const workflow = workflowMap.get(workflowId);
        const sortedDurations = [...data.durations].sort((a, b) => a - b);

        return {
          workflowId,
          workflowName: workflow?.name || 'Unknown Workflow',
          executionCount: data.totalCount,
          avgDuration: data.durations.length > 0
            ? data.durations.reduce((a, b) => a + b, 0) / data.durations.length
            : 0,
          minDuration: sortedDurations[0] || 0,
          maxDuration: sortedDurations[sortedDurations.length - 1] || 0,
          successRate: data.totalCount > 0 ? (data.successCount / data.totalCount) * 100 : 0,
        };
      })
      .sort((a, b) => b.avgDuration - a.avgDuration);
  }, [executions, workflowMap]);

  const dailyMetrics = useMemo((): DailyMetrics[] => {
    if (!executions) return [];

    const last14Days = Array.from({ length: 14 }, (_, i) => {
      const date = startOfDay(subDays(new Date(), 13 - i));
      return format(date, 'yyyy-MM-dd');
    });

    const dailyMap = new Map<string, { durations: number[]; success: number; total: number }>();
    last14Days.forEach(date => dailyMap.set(date, { durations: [], success: 0, total: 0 }));

    executions.forEach(e => {
      const date = format(new Date(e.startedAt), 'yyyy-MM-dd');
      if (dailyMap.has(date)) {
        const data = dailyMap.get(date)!;
        const duration = calculateDuration(e);
        if (duration !== null) data.durations.push(duration);
        if (e.status === 'success') data.success++;
        data.total++;
      }
    });

    return last14Days.map(date => {
      const data = dailyMap.get(date)!;
      return {
        date: format(new Date(date), 'MMM d'),
        successRate: data.total > 0 ? (data.success / data.total) * 100 : 0,
        avgDuration: data.durations.length > 0
          ? data.durations.reduce((a, b) => a + b, 0) / data.durations.length / 1000
          : 0,
        total: data.total,
      };
    });
  }, [executions]);

  const overallStats = useMemo(() => {
    if (!executions || executions.length === 0) {
      return { avgDuration: 0, totalExecutions: 0, successRate: 0, trend: 0 };
    }

    const durations = executions
      .map(e => calculateDuration(e))
      .filter((d): d is number => d !== null);

    const avgDuration = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

    const successCount = executions.filter(e => e.status === 'success').length;
    const successRate = (successCount / executions.length) * 100;

    // Calculate trend (compare last 7 days to previous 7 days)
    const now = new Date();
    const last7Days = executions.filter(e => {
      const date = new Date(e.startedAt);
      return date >= subDays(now, 7);
    });
    const prev7Days = executions.filter(e => {
      const date = new Date(e.startedAt);
      return date >= subDays(now, 14) && date < subDays(now, 7);
    });

    const last7AvgDurations = last7Days.map(e => calculateDuration(e)).filter((d): d is number => d !== null);
    const prev7AvgDurations = prev7Days.map(e => calculateDuration(e)).filter((d): d is number => d !== null);

    const last7Avg = last7AvgDurations.length > 0 ? last7AvgDurations.reduce((a, b) => a + b, 0) / last7AvgDurations.length : 0;
    const prev7Avg = prev7AvgDurations.length > 0 ? prev7AvgDurations.reduce((a, b) => a + b, 0) / prev7AvgDurations.length : 0;

    const trend = prev7Avg > 0 ? ((last7Avg - prev7Avg) / prev7Avg) * 100 : 0;

    return { avgDuration, totalExecutions: executions.length, successRate, trend };
  }, [executions]);

  const handleRefresh = () => {
    refetch();
    toast.info('Refreshing performance data...');
  };

  const exportToCSV = () => {
    if (workflowMetrics.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = ['Workflow Name', 'Workflow ID', 'Executions', 'Avg Duration (ms)', 'Min Duration (ms)', 'Max Duration (ms)', 'Success Rate (%)'];
    const rows = workflowMetrics.map(m => [
      m.workflowName,
      m.workflowId,
      m.executionCount,
      Math.round(m.avgDuration),
      Math.round(m.minDuration),
      Math.round(m.maxDuration),
      m.successRate.toFixed(2),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `performance-metrics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success('Exported performance metrics');
  };

  const TrendIndicator = ({ value, inverted = false }: { value: number; inverted?: boolean }) => {
    const isPositive = inverted ? value < 0 : value > 0;
    const isNeutral = Math.abs(value) < 1;

    if (isNeutral) return <Minus size={14} className="text-neutral-400" />;
    if (isPositive) return <TrendingUp size={14} className="text-green-500" />;
    return <TrendingDown size={14} className="text-red-500" />;
  };

  return (
    <>
      <PageHeader
        title="Performance Metrics"
        description="Monitor execution times and success rates"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={exportToCSV}
              disabled={workflowMetrics.length === 0}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50"
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
                <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 mb-1">
                  <Clock size={16} />
                  <span className="text-xs font-medium uppercase">Avg Duration</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-semibold text-neutral-900 dark:text-white">
                    {formatDuration(overallStats.avgDuration)}
                  </span>
                  <TrendIndicator value={overallStats.trend} inverted />
                </div>
              </div>

              <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
                <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 mb-1">
                  <Zap size={16} />
                  <span className="text-xs font-medium uppercase">Total Executions</span>
                </div>
                <span className="text-2xl font-semibold text-neutral-900 dark:text-white">
                  {overallStats.totalExecutions.toLocaleString()}
                </span>
              </div>

              <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
                <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 mb-1">
                  <TrendingUp size={16} />
                  <span className="text-xs font-medium uppercase">Success Rate</span>
                </div>
                <span className="text-2xl font-semibold text-neutral-900 dark:text-white">
                  {overallStats.successRate.toFixed(1)}%
                </span>
              </div>

              <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
                <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 mb-1">
                  <Clock size={16} />
                  <span className="text-xs font-medium uppercase">Active Workflows</span>
                </div>
                <span className="text-2xl font-semibold text-neutral-900 dark:text-white">
                  {workflowMetrics.length}
                </span>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Success Rate Chart */}
              <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
                <h3 className="text-sm font-medium text-neutral-900 dark:text-white mb-4">
                  Success Rate (Last 14 Days)
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyMetrics}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--tooltip-bg, #1f2937)',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                        }}
                        labelStyle={{ color: '#fff' }}
                        formatter={(value) => [`${(value as number).toFixed(1)}%`, 'Success Rate']}
                      />
                      <Line
                        type="monotone"
                        dataKey="successRate"
                        stroke="#22c55e"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Avg Duration Chart */}
              <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
                <h3 className="text-sm font-medium text-neutral-900 dark:text-white mb-4">
                  Avg Duration (Last 14 Days)
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyMetrics}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                      <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--tooltip-bg, #1f2937)',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                        }}
                        labelStyle={{ color: '#fff' }}
                        formatter={(value) => [`${(value as number).toFixed(2)}s`, 'Avg Duration']}
                      />
                      <Bar dataKey="avgDuration" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Slowest Workflows Table */}
            <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
                <h3 className="text-sm font-medium text-neutral-900 dark:text-white">
                  Workflow Performance (Sorted by Avg Duration)
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                    <tr>
                      <th className="text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase px-4 py-3">Workflow</th>
                      <th className="text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase px-4 py-3">Executions</th>
                      <th className="text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase px-4 py-3">Avg</th>
                      <th className="text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase px-4 py-3">Min</th>
                      <th className="text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase px-4 py-3">Max</th>
                      <th className="text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase px-4 py-3">Success</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {workflowMetrics.slice(0, 10).map((metric) => (
                      <tr key={metric.workflowId} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-neutral-900 dark:text-white">
                            {metric.workflowName}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-neutral-600 dark:text-neutral-400">
                          {metric.executionCount}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-neutral-900 dark:text-white">
                          {formatDuration(metric.avgDuration)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-neutral-600 dark:text-neutral-400">
                          {formatDuration(metric.minDuration)}
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-neutral-600 dark:text-neutral-400">
                          {formatDuration(metric.maxDuration)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-sm font-medium ${
                            metric.successRate >= 95 ? 'text-green-600 dark:text-green-400' :
                            metric.successRate >= 80 ? 'text-yellow-600 dark:text-yellow-400' :
                            'text-red-600 dark:text-red-400'
                          }`}>
                            {metric.successRate.toFixed(1)}%
                          </span>
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
