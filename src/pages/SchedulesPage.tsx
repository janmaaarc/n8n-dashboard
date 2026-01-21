import React from 'react';
import { RefreshCw, Calendar, Clock, ExternalLink, Power, PowerOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/layout';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useSchedules, type ScheduleInfo } from '../hooks/useSchedules';
import { useSettings } from '../hooks/useSettings';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { useToast } from '../components/Toast';

const formatSchedule = (schedule: ScheduleInfo): string => {
  if (schedule.cronExpression) {
    return schedule.cronExpression;
  }

  if (schedule.interval) {
    const { value, unit } = schedule.interval;
    return `Every ${value} ${unit}`;
  }

  if (schedule.rule) {
    const { mode, hour, minute, weekdays } = schedule.rule;
    const time = hour !== undefined && minute !== undefined
      ? `at ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
      : '';

    if (mode === 'days') {
      return `Daily ${time}`;
    }
    if (mode === 'weeks' && weekdays) {
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const days = weekdays.map(d => dayNames[d]).join(', ');
      return `Weekly on ${days} ${time}`;
    }
    if (mode === 'hours') {
      return `Every hour ${minute !== undefined ? `at :${String(minute).padStart(2, '0')}` : ''}`;
    }
    if (mode === 'minutes') {
      return 'Every minute';
    }
    return mode;
  }

  return 'Unknown schedule';
};

const getNodeTypeLabel = (nodeType: string): string => {
  if (nodeType.includes('scheduleTrigger') || nodeType.includes('schedule')) {
    return 'Schedule Trigger';
  }
  if (nodeType.includes('cron')) {
    return 'Cron';
  }
  if (nodeType.includes('interval')) {
    return 'Interval';
  }
  return nodeType.split('.').pop() || nodeType;
};

export const SchedulesPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { settings } = useSettings();
  const toast = useToast();

  const refreshOptions = {
    autoRefresh: settings.autoRefresh,
    refreshInterval: settings.refreshInterval,
  };

  const shouldFetchData = !isSupabaseConfigured() || isAuthenticated;

  const { schedules, isLoading, refetch } = useSchedules(
    shouldFetchData ? refreshOptions : { autoRefresh: false }
  );

  const handleRefresh = () => {
    refetch();
    toast.info('Refreshing schedules...');
  };

  const activeSchedules = schedules.filter(s => s.workflowActive);
  const inactiveSchedules = schedules.filter(s => !s.workflowActive);

  return (
    <>
      <PageHeader
        title="Schedules"
        description="View all scheduled workflow triggers"
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
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw size={24} className="animate-spin text-neutral-400" />
          </div>
        ) : schedules.length === 0 ? (
          <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-8 text-center">
            <Calendar size={48} className="mx-auto text-neutral-300 dark:text-neutral-700 mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">No schedules found</h3>
            <p className="text-neutral-500 dark:text-neutral-400">
              No workflows with schedule triggers detected. Create a workflow with a Schedule Trigger or Cron node to see it here.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
                <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 mb-1">
                  <Calendar size={16} />
                  <span className="text-xs font-medium uppercase">Total Schedules</span>
                </div>
                <span className="text-2xl font-semibold text-neutral-900 dark:text-white">
                  {schedules.length}
                </span>
              </div>

              <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
                <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 mb-1">
                  <Power size={16} />
                  <span className="text-xs font-medium uppercase">Active</span>
                </div>
                <span className="text-2xl font-semibold text-green-600 dark:text-green-400">
                  {activeSchedules.length}
                </span>
              </div>

              <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
                <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 mb-1">
                  <PowerOff size={16} />
                  <span className="text-xs font-medium uppercase">Inactive</span>
                </div>
                <span className="text-2xl font-semibold text-neutral-500 dark:text-neutral-400">
                  {inactiveSchedules.length}
                </span>
              </div>
            </div>

            {/* Active Schedules */}
            {activeSchedules.length > 0 && (
              <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <h3 className="text-sm font-medium text-neutral-900 dark:text-white">
                      Active Schedules
                    </h3>
                  </div>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded">
                    {activeSchedules.length}
                  </span>
                </div>
                <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {activeSchedules.map((schedule, index) => (
                    <div
                      key={`${schedule.workflowId}-${index}`}
                      className="px-4 py-3 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-500/10 flex items-center justify-center">
                          <Clock size={20} className="text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-neutral-900 dark:text-white">
                            {schedule.workflowName}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-neutral-500 dark:text-neutral-400">
                              {schedule.nodeName}
                            </span>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                              {getNodeTypeLabel(schedule.nodeType)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-mono text-neutral-900 dark:text-white">
                            {formatSchedule(schedule)}
                          </p>
                        </div>
                        <Link
                          to={`/workflows?highlight=${schedule.workflowId}`}
                          className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
                          title="View workflow"
                        >
                          <ExternalLink size={16} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Inactive Schedules */}
            {inactiveSchedules.length > 0 && (
              <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-neutral-400" />
                    <h3 className="text-sm font-medium text-neutral-900 dark:text-white">
                      Inactive Schedules
                    </h3>
                  </div>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded">
                    {inactiveSchedules.length}
                  </span>
                </div>
                <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {inactiveSchedules.map((schedule, index) => (
                    <div
                      key={`${schedule.workflowId}-${index}`}
                      className="px-4 py-3 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/50 opacity-60"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                          <Clock size={20} className="text-neutral-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-neutral-900 dark:text-white">
                            {schedule.workflowName}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-neutral-500 dark:text-neutral-400">
                              {schedule.nodeName}
                            </span>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                              {getNodeTypeLabel(schedule.nodeType)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-mono text-neutral-500 dark:text-neutral-400">
                            {formatSchedule(schedule)}
                          </p>
                          <p className="text-xs text-neutral-400 dark:text-neutral-500">Workflow inactive</p>
                        </div>
                        <Link
                          to={`/workflows?highlight=${schedule.workflowId}`}
                          className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
                          title="View workflow"
                        >
                          <ExternalLink size={16} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </ErrorBoundary>
    </>
  );
};
