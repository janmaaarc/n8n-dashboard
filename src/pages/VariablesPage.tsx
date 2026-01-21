import React from 'react';
import { RefreshCw, Variable, Loader2, Eye, EyeOff } from 'lucide-react';
import { PageHeader } from '../components/layout';
import { useVariables } from '../hooks/useN8n';
import { useToast } from '../components/Toast';

export const VariablesPage: React.FC = () => {
  const toast = useToast();
  const [showValues, setShowValues] = React.useState<Set<string>>(new Set());

  const { data: variables, isLoading, refetch, error } = useVariables();

  const handleRefresh = () => {
    refetch();
    toast.info('Refreshing variables...');
  };

  const toggleShowValue = (id: string) => {
    setShowValues(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <>
      <PageHeader
        title="Variables"
        description="Environment variables for your workflows"
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
        <div className="p-4 rounded-lg border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 text-sm text-amber-700 dark:text-amber-400">
          Variables API not available. This feature requires n8n version 1.0 or higher.
        </div>
      ) : variables && variables.length > 0 ? (
        <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800">
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Key</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Value</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {variables.map((variable) => (
                <tr key={variable.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                  <td className="px-4 py-3">
                    <code className="text-sm font-mono text-neutral-900 dark:text-white bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                      {variable.key}
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono text-neutral-600 dark:text-neutral-400">
                        {showValues.has(variable.id) ? variable.value : '••••••••'}
                      </code>
                      <button
                        onClick={() => toggleShowValue(variable.id)}
                        className="p-1 rounded text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                        title={showValues.has(variable.id) ? 'Hide value' : 'Show value'}
                      >
                        {showValues.has(variable.id) ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                      {variable.type || 'string'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 text-neutral-500 dark:text-neutral-400">
          <Variable size={40} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">No variables found</p>
          <p className="text-xs mt-1">Create variables in n8n to share values across workflows</p>
        </div>
      )}
    </>
  );
};
