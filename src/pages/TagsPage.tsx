import React from 'react';
import { RefreshCw, Tag, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout';
import { useTags, useWorkflows } from '../hooks/useN8n';
import { useToast } from '../components/Toast';

export const TagsPage: React.FC = () => {
  const toast = useToast();
  const navigate = useNavigate();

  const { data: tags, isLoading, refetch, error } = useTags();
  const { data: workflows } = useWorkflows();

  const handleRefresh = () => {
    refetch();
    toast.info('Refreshing tags...');
  };

  // Count workflows per tag
  const tagCounts = React.useMemo(() => {
    const counts = new Map<string, number>();
    workflows?.forEach(workflow => {
      workflow.tags?.forEach(tag => {
        counts.set(tag.id, (counts.get(tag.id) || 0) + 1);
      });
    });
    return counts;
  }, [workflows]);

  const handleTagClick = (tagName: string) => {
    // Navigate to workflows page with tag filter (could be enhanced)
    navigate(`/workflows?tag=${encodeURIComponent(tagName)}`);
  };

  return (
    <>
      <PageHeader
        title="Tags"
        description="Organize your workflows with tags"
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

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-neutral-400" />
        </div>
      ) : error ? (
        <div className="p-4 rounded-lg border border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/10 text-sm text-red-700 dark:text-red-400">
          Failed to load tags. This endpoint may not be available in your n8n version.
        </div>
      ) : tags && tags.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => handleTagClick(tag.name)}
              className="flex items-center gap-3 p-4 bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                <Tag size={20} className="text-indigo-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                  {tag.name}
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {tagCounts.get(tag.id) || 0} workflow{(tagCounts.get(tag.id) || 0) !== 1 ? 's' : ''}
                </p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-neutral-500 dark:text-neutral-400">
          <Tag size={40} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">No tags found</p>
          <p className="text-xs mt-1">Create tags in n8n to organize your workflows</p>
        </div>
      )}
    </>
  );
};
