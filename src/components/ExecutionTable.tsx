import React, { useState, useMemo, useEffect } from 'react';
import {
  Activity,
  Search,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  Clock,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Webhook,
  MousePointer,
  Zap,
} from 'lucide-react';
import { format, formatDistanceToNow, differenceInSeconds } from 'date-fns';
import type { Execution, Workflow } from '../types';
import { getStoredSettings } from '../hooks/useSettings';

interface ExecutionTableProps {
  executions: Execution[];
  workflows: Workflow[];
  isLoading?: boolean;
  onExecutionClick: (execution: Execution) => void;
}

const getN8nUrl = (): string => {
  const settings = getStoredSettings();
  return settings.n8nUrl || import.meta.env.VITE_N8N_URL || '';
};

const formatDuration = (startedAt: string, stoppedAt: string | null): string => {
  if (!stoppedAt) return 'Running...';
  const seconds = differenceInSeconds(new Date(stoppedAt), new Date(startedAt));
  if (seconds < 1) return '<1s';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
};

const getTriggerIcon = (mode: string): React.ReactNode => {
  switch (mode) {
    case 'webhook':
      return <Webhook size={12} />;
    case 'trigger':
      return <Zap size={12} />;
    case 'manual':
      return <MousePointer size={12} />;
    case 'retry':
      return <Clock size={12} />;
    default:
      return <Zap size={12} />;
  }
};

const getTriggerLabel = (mode: string): string => {
  switch (mode) {
    case 'webhook':
      return 'Webhook';
    case 'trigger':
      return 'Trigger';
    case 'manual':
      return 'Manual';
    case 'retry':
      return 'Retry';
    case 'cli':
      return 'CLI';
    case 'integrated':
      return 'Integrated';
    default:
      return mode.charAt(0).toUpperCase() + mode.slice(1);
  }
};

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'success':
      return {
        label: 'Success',
        dotClass: 'bg-green-500',
      };
    case 'error':
      return {
        label: 'Error',
        dotClass: 'bg-red-500',
      };
    case 'running':
      return {
        label: 'Running',
        dotClass: 'bg-blue-500',
      };
    case 'waiting':
      return {
        label: 'Waiting',
        dotClass: 'bg-amber-500',
      };
    default:
      return {
        label: status,
        dotClass: 'bg-neutral-500',
      };
  }
};

type SortColumn = 'workflow' | 'status' | 'startTime' | 'duration' | 'trigger';
type SortDirection = 'asc' | 'desc';
type FilterOption = 'all' | 'success' | 'error' | 'running';

const ITEMS_PER_PAGE = 15;

export const ExecutionTable: React.FC<ExecutionTableProps> = ({
  executions,
  workflows,
  isLoading,
  onExecutionClick,
}) => {
  const [search, setSearch] = useState('');
  const [sortColumn, setSortColumn] = useState<SortColumn>('startTime');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const workflowNameMap = useMemo(() => {
    const map = new Map<string, string>();
    workflows.forEach((w) => map.set(w.id, w.name));
    return map;
  }, [workflows]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterBy, sortColumn, sortDirection]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown size={14} className="text-neutral-400" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp size={14} className="text-neutral-900 dark:text-white" />
    ) : (
      <ArrowDown size={14} className="text-neutral-900 dark:text-white" />
    );
  };

  const filteredAndSortedExecutions = useMemo(() => {
    let result = [...executions];

    // Filter by search (workflow name)
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter((e) => {
        const workflowName = e.workflowName || workflowNameMap.get(e.workflowId) || '';
        return workflowName.toLowerCase().includes(searchLower) ||
          e.id.toLowerCase().includes(searchLower);
      });
    }

    // Filter by status
    if (filterBy !== 'all') {
      result = result.filter((e) => e.status === filterBy);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortColumn) {
        case 'workflow': {
          const nameA = a.workflowName || workflowNameMap.get(a.workflowId) || '';
          const nameB = b.workflowName || workflowNameMap.get(b.workflowId) || '';
          comparison = nameA.localeCompare(nameB);
          break;
        }
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'startTime':
          comparison = new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
          break;
        case 'duration': {
          const durationA = a.stoppedAt
            ? differenceInSeconds(new Date(a.stoppedAt), new Date(a.startedAt))
            : Infinity;
          const durationB = b.stoppedAt
            ? differenceInSeconds(new Date(b.stoppedAt), new Date(b.startedAt))
            : Infinity;
          comparison = durationB - durationA;
          break;
        }
        case 'trigger':
          comparison = a.mode.localeCompare(b.mode);
          break;
      }

      return sortDirection === 'asc' ? -comparison : comparison;
    });

    return result;
  }, [executions, search, filterBy, sortColumn, sortDirection, workflowNameMap]);

  const totalPages = Math.ceil(filteredAndSortedExecutions.length / ITEMS_PER_PAGE);
  const paginatedExecutions = filteredAndSortedExecutions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 h-9 bg-neutral-200 dark:bg-neutral-800 rounded-md animate-pulse" />
          <div className="w-24 h-9 bg-neutral-200 dark:bg-neutral-800 rounded-md animate-pulse" />
        </div>
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <div className="h-10 bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="px-4 py-3 animate-pulse border-b border-neutral-200 dark:border-neutral-800 last:border-b-0">
              <div className="h-4 w-full bg-neutral-200 dark:bg-neutral-700 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
          />
          <input
            type="text"
            placeholder="Search by workflow name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white focus:border-transparent"
          />
        </div>
        <select
          value={filterBy}
          onChange={(e) => setFilterBy(e.target.value as FilterOption)}
          className="px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white"
        >
          <option value="all">All Status</option>
          <option value="success">Success</option>
          <option value="error">Error</option>
          <option value="running">Running</option>
        </select>
      </div>

      {/* Execution Table */}
      {filteredAndSortedExecutions.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-12 text-center">
          <Activity size={32} className="mx-auto mb-3 text-neutral-400" />
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {search ? 'No executions match your search' : 'No executions found'}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800">
                  <th className="px-3 py-2 text-left">
                    <button
                      onClick={() => handleSort('workflow')}
                      className="flex items-center gap-1 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                    >
                      Workflow
                      {getSortIcon('workflow')}
                    </button>
                  </th>
                  <th className="px-3 py-2 text-left">
                    <button
                      onClick={() => handleSort('status')}
                      className="flex items-center gap-1 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                    >
                      Status
                      {getSortIcon('status')}
                    </button>
                  </th>
                  <th className="px-3 py-2 text-left">
                    <button
                      onClick={() => handleSort('startTime')}
                      className="flex items-center gap-1 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                    >
                      Start Time
                      {getSortIcon('startTime')}
                    </button>
                  </th>
                  <th className="px-3 py-2 text-right">
                    <button
                      onClick={() => handleSort('duration')}
                      className="flex items-center gap-1 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white ml-auto"
                    >
                      Duration
                      {getSortIcon('duration')}
                    </button>
                  </th>
                  <th className="px-3 py-2 text-left">
                    <button
                      onClick={() => handleSort('trigger')}
                      className="flex items-center gap-1 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                    >
                      Trigger
                      {getSortIcon('trigger')}
                    </button>
                  </th>
                  <th className="px-3 py-2 text-right">
                    <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {paginatedExecutions.map((execution) => {
                  const workflowName = execution.workflowName || workflowNameMap.get(execution.workflowId) || `Workflow ${execution.workflowId}`;
                  const statusConfig = getStatusConfig(execution.status);

                  return (
                    <tr
                      key={execution.id}
                      className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer"
                      onClick={() => onExecutionClick(execution)}
                    >
                      {/* Workflow */}
                      <td className="px-3 py-3">
                        <p className="text-sm font-medium text-neutral-900 dark:text-white truncate max-w-xs">
                          {workflowName}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                          <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotClass}`} />
                          {statusConfig.label}
                        </span>
                      </td>

                      {/* Start Time */}
                      <td className="px-3 py-3">
                        <div>
                          <p className="text-sm text-neutral-700 dark:text-neutral-300">
                            {format(new Date(execution.startedAt), 'MMM d, HH:mm:ss')}
                          </p>
                          <p className="text-xs text-neutral-400 dark:text-neutral-500">
                            {formatDistanceToNow(new Date(execution.startedAt), { addSuffix: true })}
                          </p>
                        </div>
                      </td>

                      {/* Duration */}
                      <td className="px-3 py-3 text-right">
                        <span className="text-sm tabular-nums text-neutral-600 dark:text-neutral-400">
                          {formatDuration(execution.startedAt, execution.stoppedAt)}
                        </span>
                      </td>

                      {/* Trigger */}
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-400">
                          {getTriggerIcon(execution.mode)}
                          {getTriggerLabel(execution.mode)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => onExecutionClick(execution)}
                            className="p-1.5 rounded text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                            title="View details"
                          >
                            <Eye size={14} />
                          </button>
                          <a
                            href={`${getN8nUrl()}/workflow/${execution.workflowId}/executions/${execution.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                            title="Open in n8n"
                          >
                            <ExternalLink size={14} />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            Page {currentPage} of {totalPages} ({filteredAndSortedExecutions.length} executions)
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-600 dark:text-neutral-400"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-600 dark:text-neutral-400"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
