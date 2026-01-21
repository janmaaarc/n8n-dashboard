import React from 'react';
import {
  Play,
  Pause,
  ExternalLink,
  Workflow,
  Star,
  PlayCircle,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Workflow as WorkflowType } from '../types';
import { getStoredSettings } from '../hooks/useSettings';

interface DashboardWorkflowListProps {
  workflows: WorkflowType[];
  isLoading?: boolean;
  onToggleActive?: (workflow: WorkflowType) => void;
  onTrigger?: (workflow: WorkflowType) => void;
  toggleLoadingId?: string;
  triggerLoadingId?: string;
  favorites: Set<string>;
  onToggleFavorite: (id: string) => void;
  maxItems?: number;
}

const getN8nUrl = (): string => {
  const settings = getStoredSettings();
  return settings.n8nUrl || import.meta.env.VITE_N8N_URL || '';
};

export const DashboardWorkflowList: React.FC<DashboardWorkflowListProps> = ({
  workflows,
  isLoading,
  onToggleActive,
  onTrigger,
  toggleLoadingId,
  triggerLoadingId,
  favorites,
  onToggleFavorite,
  maxItems = 6,
}) => {
  const navigate = useNavigate();

  // Sort: favorites first, then by name
  const sortedWorkflows = React.useMemo(() => {
    return [...workflows].sort((a, b) => {
      const aFav = favorites.has(a.id) ? 1 : 0;
      const bFav = favorites.has(b.id) ? 1 : 0;
      if (aFav !== bFav) return bFav - aFav;
      return a.name.localeCompare(b.name);
    }).slice(0, maxItems);
  }, [workflows, favorites, maxItems]);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 divide-y divide-neutral-200 dark:divide-neutral-800">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="px-4 py-3 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-neutral-200 dark:bg-neutral-700" />
              <div className="flex-1">
                <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-700 rounded" />
              </div>
              <div className="h-6 w-16 bg-neutral-200 dark:bg-neutral-700 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (workflows.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 py-10 text-center">
        <Workflow size={28} className="mx-auto mb-2 text-neutral-400" />
        <p className="text-sm text-neutral-500 dark:text-neutral-400">No workflows found</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 divide-y divide-neutral-200 dark:divide-neutral-800">
      {sortedWorkflows.map((workflow) => (
        <div
          key={workflow.id}
          className="px-4 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
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

            {/* Name */}
            <button
              onClick={() => navigate(`/workflows?highlight=${workflow.id}`)}
              className="min-w-0 flex-1 text-left"
            >
              <span className="text-sm font-medium text-neutral-900 dark:text-white truncate block hover:underline">
                {workflow.name}
              </span>
            </button>

            {/* Actions */}
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {/* Manual Trigger */}
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
          </div>
        </div>
      ))}

      {/* View All Link */}
      {workflows.length > maxItems && (
        <button
          onClick={() => navigate('/workflows')}
          className="w-full px-4 py-2.5 flex items-center justify-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
        >
          View all {workflows.length} workflows
          <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
};
