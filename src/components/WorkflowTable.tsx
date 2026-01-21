import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  ExternalLink,
  Workflow,
  Search,
  Star,
  ChevronLeft,
  ChevronRight,
  PlayCircle,
  Check,
  Tag,
  X,
  Webhook,
  Clock,
  MousePointer,
  Mail,
  Zap,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
} from 'lucide-react';
import type { Workflow as WorkflowType, Execution, WorkflowNode } from '../types';
import { getStoredSettings } from '../hooks/useSettings';
import { exportWorkflowsToCSV, exportWorkflowsToJSON } from '../utils/export';
import { formatDistanceToNow } from 'date-fns';

const getTriggerInfo = (nodes: WorkflowNode[]): { type: string; icon: React.ReactNode; label: string } => {
  const triggerNode = nodes.find((n) =>
    n.type.toLowerCase().includes('trigger') ||
    n.type === 'n8n-nodes-base.webhook' ||
    n.type === 'n8n-nodes-base.cron' ||
    n.type === 'n8n-nodes-base.start'
  );

  if (!triggerNode) {
    return { type: 'unknown', icon: <Zap size={12} />, label: 'Unknown' };
  }

  const type = triggerNode.type.toLowerCase();

  if (type.includes('webhook')) {
    return { type: 'webhook', icon: <Webhook size={12} />, label: 'Webhook' };
  }
  if (type.includes('schedule') || type.includes('cron')) {
    return { type: 'schedule', icon: <Clock size={12} />, label: 'Schedule' };
  }
  if (type.includes('manual') || type === 'n8n-nodes-base.start') {
    return { type: 'manual', icon: <MousePointer size={12} />, label: 'Manual' };
  }
  if (type.includes('email') || type.includes('imap') || type.includes('gmail')) {
    return { type: 'email', icon: <Mail size={12} />, label: 'Email' };
  }

  const parts = triggerNode.type.split('.');
  const nodeName = parts[parts.length - 1];
  const appName = nodeName.replace(/Trigger$/i, '').replace(/([A-Z])/g, ' $1').trim();

  return { type: 'app', icon: <Zap size={12} />, label: appName || 'Trigger' };
};

interface WorkflowStats {
  totalExecutions: number;
  successRate: number;
  lastExecution: Execution | null;
}

const calculateWorkflowStats = (workflowId: string, executions: Execution[]): WorkflowStats => {
  const workflowExecutions = executions.filter((e) => e.workflowId === workflowId);
  const totalExecutions = workflowExecutions.length;
  const successfulExecutions = workflowExecutions.filter((e) => e.status === 'success').length;
  const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;

  const sortedExecutions = [...workflowExecutions].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );
  const lastExecution = sortedExecutions[0] || null;

  return { totalExecutions, successRate, lastExecution };
};

interface WorkflowTableProps {
  workflows: WorkflowType[];
  executions: Execution[];
  isLoading?: boolean;
  onToggleActive?: (workflow: WorkflowType) => void;
  onTrigger?: (workflow: WorkflowType) => void;
  toggleLoadingId?: string;
  triggerLoadingId?: string;
  favorites: Set<string>;
  onToggleFavorite: (id: string) => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
  highlightId?: string | null;
}

const getN8nUrl = (): string => {
  const settings = getStoredSettings();
  return settings.n8nUrl || import.meta.env.VITE_N8N_URL || '';
};

type SortColumn = 'name' | 'status' | 'lastExecution' | 'executions' | 'successRate' | 'trigger' | 'favorite';
type SortDirection = 'asc' | 'desc';
type FilterOption = 'all' | 'active' | 'inactive';

const ITEMS_PER_PAGE = 10;

export const WorkflowTable: React.FC<WorkflowTableProps> = ({
  workflows,
  executions,
  isLoading,
  onToggleActive,
  onTrigger,
  toggleLoadingId,
  triggerLoadingId,
  favorites,
  onToggleFavorite,
  searchInputRef,
  highlightId,
}) => {
  const [search, setSearch] = useState('');
  const [sortColumn, setSortColumn] = useState<SortColumn>('favorite');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const localInputRef = useRef<HTMLInputElement>(null);
  const inputRef = searchInputRef || localInputRef;

  const workflowStatsMap = useMemo(() => {
    const map = new Map<string, WorkflowStats>();
    workflows.forEach((w) => {
      map.set(w.id, calculateWorkflowStats(w.id, executions));
    });
    return map;
  }, [workflows, executions]);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    workflows.forEach((w) => {
      w.tags?.forEach((t) => tagSet.add(t.name));
    });
    return Array.from(tagSet).sort();
  }, [workflows]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterBy, sortColumn, sortDirection, selectedTag]);

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

  const filteredAndSortedWorkflows = useMemo(() => {
    let result = [...workflows];

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (w) =>
          w.name.toLowerCase().includes(searchLower) ||
          w.id.toLowerCase().includes(searchLower) ||
          w.tags?.some((t) => t.name.toLowerCase().includes(searchLower))
      );
    }

    if (selectedTag) {
      result = result.filter((w) =>
        w.tags?.some((t) => t.name === selectedTag)
      );
    }

    if (filterBy === 'active') {
      result = result.filter((w) => w.active);
    } else if (filterBy === 'inactive') {
      result = result.filter((w) => !w.active);
    }

    result.sort((a, b) => {
      const statsA = workflowStatsMap.get(a.id) || { totalExecutions: 0, successRate: 0, lastExecution: null };
      const statsB = workflowStatsMap.get(b.id) || { totalExecutions: 0, successRate: 0, lastExecution: null };

      let comparison = 0;

      switch (sortColumn) {
        case 'favorite':
          comparison = (favorites.has(b.id) ? 1 : 0) - (favorites.has(a.id) ? 1 : 0);
          if (comparison === 0) comparison = a.name.localeCompare(b.name);
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'status':
          comparison = (b.active ? 1 : 0) - (a.active ? 1 : 0);
          break;
        case 'lastExecution':
          const timeA = statsA.lastExecution ? new Date(statsA.lastExecution.startedAt).getTime() : 0;
          const timeB = statsB.lastExecution ? new Date(statsB.lastExecution.startedAt).getTime() : 0;
          comparison = timeB - timeA;
          break;
        case 'executions':
          comparison = statsB.totalExecutions - statsA.totalExecutions;
          break;
        case 'successRate':
          comparison = statsB.successRate - statsA.successRate;
          break;
        case 'trigger':
          comparison = getTriggerInfo(a.nodes).label.localeCompare(getTriggerInfo(b.nodes).label);
          break;
      }

      return sortDirection === 'asc' ? -comparison : comparison;
    });

    return result;
  }, [workflows, search, filterBy, sortColumn, sortDirection, favorites, selectedTag, workflowStatsMap]);

  // Navigate to page with highlighted item and scroll to it
  useEffect(() => {
    if (highlightId && filteredAndSortedWorkflows.length > 0) {
      const index = filteredAndSortedWorkflows.findIndex(w => w.id === highlightId);
      if (index !== -1) {
        const page = Math.floor(index / ITEMS_PER_PAGE) + 1;
        setCurrentPage(page);
        // Scroll to the row after a short delay
        setTimeout(() => {
          const row = document.querySelector(`[data-workflow-id="${highlightId}"]`);
          row?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    }
  }, [highlightId, filteredAndSortedWorkflows]);

  const totalPages = Math.ceil(filteredAndSortedWorkflows.length / ITEMS_PER_PAGE);
  const paginatedWorkflows = filteredAndSortedWorkflows.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedWorkflows.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedWorkflows.map((w) => w.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkAction = (action: 'activate' | 'deactivate') => {
    const selectedWorkflows = workflows.filter((w) => selectedIds.has(w.id));
    selectedWorkflows.forEach((workflow) => {
      if (action === 'activate' && !workflow.active) {
        onToggleActive?.(workflow);
      } else if (action === 'deactivate' && workflow.active) {
        onToggleActive?.(workflow);
      }
    });
    setSelectedIds(new Set());
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 h-9 bg-neutral-200 dark:bg-neutral-800 rounded-md animate-pulse" />
          <div className="w-24 h-9 bg-neutral-200 dark:bg-neutral-800 rounded-md animate-pulse" />
        </div>
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <div className="h-10 bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800" />
          {[1, 2, 3].map((i) => (
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
            ref={inputRef}
            type="text"
            placeholder="Search workflows..."
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
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <div className="flex items-center gap-1">
          <button
            onClick={() => exportWorkflowsToCSV(filteredAndSortedWorkflows)}
            className="px-2 py-2 text-xs rounded-md text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            title="Export to CSV"
          >
            CSV
          </button>
          <button
            onClick={() => exportWorkflowsToJSON(filteredAndSortedWorkflows)}
            className="px-2 py-2 text-xs rounded-md text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            title="Export to JSON"
          >
            JSON
          </button>
        </div>
      </div>

      {/* Tag Filter */}
      {allTags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Tag size={14} className="text-neutral-400 flex-shrink-0" />
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full transition-colors ${
                selectedTag === tag
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700'
              }`}
            >
              {tag}
              {selectedTag === tag && <X size={10} />}
            </button>
          ))}
          {selectedTag && (
            <button
              onClick={() => setSelectedTag(null)}
              className="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 p-2 rounded-md bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
          <span className="text-sm text-neutral-700 dark:text-neutral-300">
            {selectedIds.size} selected
          </span>
          <button
            onClick={() => handleBulkAction('activate')}
            className="px-2 py-1 text-xs rounded bg-neutral-200 text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-600"
          >
            Activate
          </button>
          <button
            onClick={() => handleBulkAction('deactivate')}
            className="px-2 py-1 text-xs rounded bg-neutral-200 text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-600"
          >
            Deactivate
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-xs text-neutral-600 dark:text-neutral-400 hover:underline"
          >
            Clear
          </button>
        </div>
      )}

      {/* Workflow Table */}
      {filteredAndSortedWorkflows.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-12 text-center">
          <Workflow size={32} className="mx-auto mb-3 text-neutral-400" />
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {search ? 'No workflows match your search' : 'No workflows found'}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden">
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800">
                  <th className="px-3 py-2 text-left w-8">
                    <button
                      onClick={toggleSelectAll}
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        selectedIds.size === paginatedWorkflows.length && paginatedWorkflows.length > 0
                          ? 'bg-neutral-900 border-neutral-900 text-white dark:bg-white dark:border-white dark:text-neutral-900'
                          : 'border-neutral-300 dark:border-neutral-600 hover:border-neutral-900 dark:hover:border-white'
                      }`}
                    >
                      {selectedIds.size === paginatedWorkflows.length && paginatedWorkflows.length > 0 && (
                        <Check size={12} />
                      )}
                    </button>
                  </th>
                  <th className="px-3 py-2 text-left w-8"></th>
                  <th className="px-3 py-2 text-left">
                    <button
                      onClick={() => handleSort('name')}
                      className="flex items-center gap-1 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                    >
                      Workflow
                      {getSortIcon('name')}
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
                      onClick={() => handleSort('lastExecution')}
                      className="flex items-center gap-1 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                    >
                      Last Execution
                      {getSortIcon('lastExecution')}
                    </button>
                  </th>
                  <th className="px-3 py-2 text-right">
                    <button
                      onClick={() => handleSort('executions')}
                      className="flex items-center gap-1 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white ml-auto"
                    >
                      Executions
                      {getSortIcon('executions')}
                    </button>
                  </th>
                  <th className="px-3 py-2 text-right">
                    <button
                      onClick={() => handleSort('successRate')}
                      className="flex items-center gap-1 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white ml-auto"
                    >
                      Success Rate
                      {getSortIcon('successRate')}
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
                {paginatedWorkflows.map((workflow) => {
                  const stats = workflowStatsMap.get(workflow.id) || { totalExecutions: 0, successRate: 0, lastExecution: null };
                  const triggerInfo = getTriggerInfo(workflow.nodes);

                  const isHighlighted = highlightId === workflow.id;

                  return (
                    <tr
                      key={workflow.id}
                      data-workflow-id={workflow.id}
                      className={`transition-colors ${
                        isHighlighted
                          ? 'bg-amber-50 dark:bg-amber-500/10 ring-1 ring-amber-200 dark:ring-amber-500/30'
                          : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-3 py-3">
                        <button
                          onClick={() => toggleSelect(workflow.id)}
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                            selectedIds.has(workflow.id)
                              ? 'bg-neutral-900 border-neutral-900 text-white dark:bg-white dark:border-white dark:text-neutral-900'
                              : 'border-neutral-300 dark:border-neutral-600 hover:border-neutral-900 dark:hover:border-white'
                          }`}
                        >
                          {selectedIds.has(workflow.id) && <Check size={12} />}
                        </button>
                      </td>

                      {/* Favorite */}
                      <td className="px-3 py-3">
                        <button
                          onClick={() => onToggleFavorite(workflow.id)}
                          className={`${
                            favorites.has(workflow.id)
                              ? 'text-amber-500'
                              : 'text-neutral-300 dark:text-neutral-600 hover:text-amber-400'
                          }`}
                        >
                          <Star size={14} fill={favorites.has(workflow.id) ? 'currentColor' : 'none'} />
                        </button>
                      </td>

                      {/* Workflow Name */}
                      <td className="px-3 py-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                            {workflow.name}
                          </p>
                          {workflow.tags && workflow.tags.length > 0 && (
                            <p className="text-xs text-neutral-400 dark:text-neutral-500 truncate">
                              {workflow.tags.map((t) => t.name).join(', ')}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex text-xs px-1.5 py-0.5 rounded ${
                            workflow.active
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                              : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
                          }`}
                        >
                          {workflow.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Last Execution */}
                      <td className="px-3 py-3">
                        {stats.lastExecution ? (
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                stats.lastExecution.status === 'success'
                                  ? 'bg-green-500'
                                  : stats.lastExecution.status === 'error'
                                  ? 'bg-red-500'
                                  : 'bg-amber-500'
                              }`}
                            />
                            <span className="text-xs text-neutral-600 dark:text-neutral-400">
                              {formatDistanceToNow(new Date(stats.lastExecution.startedAt), { addSuffix: true })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-neutral-400 dark:text-neutral-500">Never</span>
                        )}
                      </td>

                      {/* Executions Count */}
                      <td className="px-3 py-3 text-right">
                        <span className="text-sm tabular-nums text-neutral-700 dark:text-neutral-300">
                          {stats.totalExecutions}
                        </span>
                      </td>

                      {/* Success Rate */}
                      <td className="px-3 py-3 text-right">
                        <span className="text-sm tabular-nums text-neutral-700 dark:text-neutral-300">
                          {stats.totalExecutions > 0 ? `${stats.successRate.toFixed(0)}%` : '-'}
                        </span>
                      </td>

                      {/* Trigger */}
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-400">
                          {triggerInfo.icon}
                          {triggerInfo.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-0.5">
                          {workflow.active && onTrigger && (
                            <button
                              onClick={() => onTrigger(workflow)}
                              disabled={triggerLoadingId === workflow.id}
                              className="p-1.5 rounded text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Run workflow"
                            >
                              {triggerLoadingId === workflow.id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <PlayCircle size={14} />
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => onToggleActive?.(workflow)}
                            disabled={toggleLoadingId === workflow.id}
                            className={`p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                              workflow.active
                                ? 'text-amber-600 dark:text-amber-500'
                                : 'text-emerald-600 dark:text-emerald-500'
                            }`}
                            title={workflow.active ? 'Deactivate' : 'Activate'}
                          >
                            {toggleLoadingId === workflow.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : workflow.active ? (
                              <Pause size={14} />
                            ) : (
                              <Play size={14} />
                            )}
                          </button>
                          <a
                            href={`${getN8nUrl()}/workflow/${workflow.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:text-neutral-500 dark:hover:text-neutral-300 dark:hover:bg-neutral-700 transition-colors"
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
            Page {currentPage} of {totalPages} ({filteredAndSortedWorkflows.length} workflows)
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
