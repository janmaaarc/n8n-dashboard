import React, { useState, useMemo, useEffect } from 'react';
import { Clock, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import type { Execution } from '../types';
import { formatDistanceToNow } from '../utils/date';
import { exportExecutionsToCSV, exportExecutionsToJSON } from '../utils/export';

type StatusFilter = 'all' | 'success' | 'error' | 'running';

interface ExecutionFeedProps {
  executions: Execution[];
  isLoading?: boolean;
  onExecutionClick?: (execution: Execution) => void;
  itemsPerPage?: number;
  showFilter?: boolean;
}

const statusConfig = {
  success: {
    dotClass: 'bg-green-500',
    label: 'Success',
  },
  error: {
    dotClass: 'bg-red-500',
    label: 'Failed',
  },
  running: {
    dotClass: 'bg-blue-500 animate-pulse',
    label: 'Running',
  },
  waiting: {
    dotClass: 'bg-amber-500',
    label: 'Waiting',
  },
};

const formatDuration = (startedAt: string, stoppedAt: string | null): string => {
  if (!stoppedAt) return '...';
  const start = new Date(startedAt).getTime();
  const end = new Date(stoppedAt).getTime();
  const duration = end - start;

  if (duration < 1000) return `${duration}ms`;
  if (duration < 60000) return `${(duration / 1000).toFixed(1)}s`;
  return `${Math.floor(duration / 60000)}m ${Math.round((duration % 60000) / 1000)}s`;
};

export const ExecutionFeed: React.FC<ExecutionFeedProps> = ({
  executions,
  isLoading,
  onExecutionClick,
  itemsPerPage = 10,
  showFilter = true,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  const filteredExecutions = useMemo(() => {
    if (statusFilter === 'all') return executions;
    return executions.filter((e) => e.status === statusFilter);
  }, [executions, statusFilter]);

  const totalPages = Math.ceil(filteredExecutions.length / itemsPerPage);
  const paginatedExecutions = filteredExecutions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (isLoading) {
    return (
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 divide-y divide-neutral-200 dark:divide-neutral-800">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="px-4 py-2.5 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded bg-neutral-200 dark:bg-neutral-700" />
              <div className="flex-1">
                <div className="h-3.5 w-28 bg-neutral-200 dark:bg-neutral-700 rounded" />
              </div>
              <div className="h-3 w-12 bg-neutral-200 dark:bg-neutral-700 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (executions.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-8 text-center">
        <Clock size={24} className="mx-auto mb-2 text-neutral-400" />
        <p className="text-sm text-neutral-500 dark:text-neutral-400">No executions yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Filter and Export */}
      {showFilter && (
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-neutral-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="flex-1 px-2 py-1 text-xs rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white"
          >
            <option value="all">All statuses</option>
            <option value="success">Success</option>
            <option value="error">Failed</option>
            <option value="running">Running</option>
          </select>
          <button
            onClick={() => exportExecutionsToCSV(filteredExecutions)}
            className="px-2 py-1 text-xs rounded text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            title="Export to CSV"
          >
            CSV
          </button>
          <button
            onClick={() => exportExecutionsToJSON(filteredExecutions)}
            className="px-2 py-1 text-xs rounded text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            title="Export to JSON"
          >
            JSON
          </button>
        </div>
      )}

      {/* Empty state for filtered results */}
      {filteredExecutions.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-8 text-center">
          <Filter size={24} className="mx-auto mb-2 text-neutral-400" />
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            No {statusFilter} executions
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 divide-y divide-neutral-200 dark:divide-neutral-800">
          {paginatedExecutions.map((exec) => {
            const status = statusConfig[exec.status] || statusConfig.waiting;

            return (
              <button
                key={exec.id}
                onClick={() => onExecutionClick?.(exec)}
                className="w-full text-left px-4 py-2.5 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${status.dotClass}`} />
                    <span className="text-sm text-neutral-900 dark:text-white truncate">
                      {exec.workflowName || `Workflow ${exec.workflowId}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 text-xs text-neutral-500 dark:text-neutral-400">
                    <span className="font-mono">{formatDuration(exec.startedAt, exec.stoppedAt)}</span>
                    <span>{formatDistanceToNow(exec.startedAt)}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {currentPage} / {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-600 dark:text-neutral-400"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-600 dark:text-neutral-400"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
