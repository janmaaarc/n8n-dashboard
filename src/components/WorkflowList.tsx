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
  Loader2,
} from 'lucide-react';
import type { Workflow as WorkflowType, WorkflowNode } from '../types';
import { getStoredSettings } from '../hooks/useSettings';
import { exportWorkflowsToCSV, exportWorkflowsToJSON } from '../utils/export';

// Get trigger info from workflow nodes
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

  // Extract app name from type (e.g., "n8n-nodes-base.slackTrigger" -> "Slack")
  const parts = triggerNode.type.split('.');
  const nodeName = parts[parts.length - 1];
  const appName = nodeName.replace(/Trigger$/i, '').replace(/([A-Z])/g, ' $1').trim();

  return { type: 'app', icon: <Zap size={12} />, label: appName || 'Trigger' };
};

interface WorkflowListProps {
  workflows: WorkflowType[];
  isLoading?: boolean;
  onToggleActive?: (workflow: WorkflowType) => void;
  onTrigger?: (workflow: WorkflowType) => void;
  toggleLoadingId?: string;
  triggerLoadingId?: string;
  favorites: Set<string>;
  onToggleFavorite: (id: string) => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
}

const getN8nUrl = (): string => {
  const settings = getStoredSettings();
  return settings.n8nUrl || import.meta.env.VITE_N8N_URL || '';
};

type SortOption = 'name' | 'status' | 'nodes' | 'favorite';
type FilterOption = 'all' | 'active' | 'inactive';

const ITEMS_PER_PAGE = 10;

export const WorkflowList: React.FC<WorkflowListProps> = ({
  workflows,
  isLoading,
  onToggleActive,
  onTrigger,
  toggleLoadingId,
  triggerLoadingId,
  favorites,
  onToggleFavorite,
  searchInputRef,
}) => {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('favorite');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const localInputRef = useRef<HTMLInputElement>(null);
  const inputRef = searchInputRef || localInputRef;

  // Extract unique tags from all workflows
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    workflows.forEach((w) => {
      w.tags?.forEach((t) => tagSet.add(t.name));
    });
    return Array.from(tagSet).sort();
  }, [workflows]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterBy, sortBy, selectedTag]);

  const filteredAndSortedWorkflows = useMemo(() => {
    let result = [...workflows];

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (w) =>
          w.name.toLowerCase().includes(searchLower) ||
          w.id.toLowerCase().includes(searchLower) ||
          w.tags?.some((t) => t.name.toLowerCase().includes(searchLower))
      );
    }

    // Filter by tag
    if (selectedTag) {
      result = result.filter((w) =>
        w.tags?.some((t) => t.name === selectedTag)
      );
    }

    // Filter by status
    if (filterBy === 'active') {
      result = result.filter((w) => w.active);
    } else if (filterBy === 'inactive') {
      result = result.filter((w) => !w.active);
    }

    // Sort
    result.sort((a, b) => {
      // Favorites always first when sorting by favorite
      if (sortBy === 'favorite') {
        const aFav = favorites.has(a.id) ? 1 : 0;
        const bFav = favorites.has(b.id) ? 1 : 0;
        if (aFav !== bFav) return bFav - aFav;
        return a.name.localeCompare(b.name);
      }

      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'status':
          return (b.active ? 1 : 0) - (a.active ? 1 : 0);
        case 'nodes':
          return b.nodes.length - a.nodes.length;
        default:
          return 0;
      }
    });

    return result;
  }, [workflows, search, filterBy, sortBy, favorites]);

  // Pagination
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
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 divide-y divide-neutral-200 dark:divide-neutral-800">
          {[1, 2, 3].map((i) => (
            <div key={i} className="px-4 py-3 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded bg-neutral-200 dark:bg-neutral-700" />
                <div className="w-2 h-2 rounded-full bg-neutral-200 dark:bg-neutral-700" />
                <div className="flex-1">
                  <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-700 rounded mb-1.5" />
                  <div className="h-3 w-20 bg-neutral-200 dark:bg-neutral-700 rounded" />
                </div>
              </div>
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
            className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value as FilterOption)}
            className="px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-2 text-sm rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="favorite">Favorites first</option>
            <option value="name">Name</option>
            <option value="status">Status</option>
            <option value="nodes">Node count</option>
          </select>
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
                  ? 'bg-indigo-500 text-white'
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
        <div className="flex items-center gap-2 p-2 rounded-md bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20">
          <span className="text-sm text-indigo-700 dark:text-indigo-400">
            {selectedIds.size} selected
          </span>
          <button
            onClick={() => handleBulkAction('activate')}
            className="px-2 py-1 text-xs rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:hover:bg-emerald-500/30"
          >
            Activate
          </button>
          <button
            onClick={() => handleBulkAction('deactivate')}
            className="px-2 py-1 text-xs rounded bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:hover:bg-amber-500/30"
          >
            Deactivate
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="ml-auto text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Clear
          </button>
        </div>
      )}

      {/* Workflow List */}
      {filteredAndSortedWorkflows.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-12 text-center">
          <Workflow size={32} className="mx-auto mb-3 text-neutral-400" />
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {search ? 'No workflows match your search' : 'No workflows found'}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 divide-y divide-neutral-200 dark:divide-neutral-800">
          {/* Header */}
          <div className="px-4 py-2 flex items-center justify-between bg-neutral-50 dark:bg-neutral-800/50">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSelectAll}
                aria-label={selectedIds.size === paginatedWorkflows.length ? 'Deselect all workflows' : 'Select all workflows'}
                aria-pressed={selectedIds.size === paginatedWorkflows.length && paginatedWorkflows.length > 0}
                className={`w-4 h-4 rounded border flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${
                  selectedIds.size === paginatedWorkflows.length && paginatedWorkflows.length > 0
                    ? 'bg-indigo-500 border-indigo-500 text-white'
                    : 'border-neutral-300 dark:border-neutral-600 hover:border-indigo-500'
                }`}
              >
                {selectedIds.size === paginatedWorkflows.length && paginatedWorkflows.length > 0 && (
                  <Check size={12} />
                )}
              </button>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                {filteredAndSortedWorkflows.length} workflow{filteredAndSortedWorkflows.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => exportWorkflowsToCSV(filteredAndSortedWorkflows)}
                className="px-2 py-1 text-xs rounded text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                title="Export to CSV"
              >
                CSV
              </button>
              <button
                onClick={() => exportWorkflowsToJSON(filteredAndSortedWorkflows)}
                className="px-2 py-1 text-xs rounded text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                title="Export to JSON"
              >
                JSON
              </button>
            </div>
          </div>

          {/* Rows */}
          {paginatedWorkflows.map((workflow) => (
            <div
              key={workflow.id}
              className="px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {/* Checkbox */}
                <button
                  onClick={() => toggleSelect(workflow.id)}
                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${
                    selectedIds.has(workflow.id)
                      ? 'bg-indigo-500 border-indigo-500 text-white'
                      : 'border-neutral-300 dark:border-neutral-600 hover:border-indigo-500'
                  }`}
                >
                  {selectedIds.has(workflow.id) && <Check size={12} />}
                </button>

                {/* Favorite */}
                <button
                  onClick={() => onToggleFavorite(workflow.id)}
                  className={`flex-shrink-0 ${
                    favorites.has(workflow.id)
                      ? 'text-amber-500'
                      : 'text-neutral-300 dark:text-neutral-600 hover:text-amber-400'
                  }`}
                >
                  <Star size={14} fill={favorites.has(workflow.id) ? 'currentColor' : 'none'} />
                </button>

                {/* Status dot */}
                <div
                  className={`flex-shrink-0 w-2 h-2 rounded-full ${
                    workflow.active ? 'bg-emerald-500' : 'bg-neutral-300 dark:bg-neutral-600'
                  }`}
                />

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                    {workflow.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                    <span>{workflow.nodes.length} nodes</span>
                    <span className="text-neutral-300 dark:text-neutral-600">•</span>
                    <span className="inline-flex items-center gap-1">
                      {getTriggerInfo(workflow.nodes).icon}
                      {getTriggerInfo(workflow.nodes).label}
                    </span>
                    {workflow.tags && workflow.tags.length > 0 && (
                      <>
                        <span className="text-neutral-300 dark:text-neutral-600">•</span>
                        <span className="text-neutral-400 dark:text-neutral-500 truncate">
                          {workflow.tags.map((t) => t.name).join(', ')}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      workflow.active
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                        : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                    }`}
                  >
                    {workflow.active ? 'Active' : 'Inactive'}
                  </span>

                  {/* Manual Trigger */}
                  {workflow.active && onTrigger && (
                    <button
                      onClick={() => onTrigger(workflow)}
                      disabled={triggerLoadingId === workflow.id}
                      className="p-1.5 rounded text-blue-600 hover:bg-blue-50 dark:text-blue-500 dark:hover:bg-blue-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                    className="p-1.5 rounded text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                    title="Open in n8n"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            Page {currentPage} of {totalPages}
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
