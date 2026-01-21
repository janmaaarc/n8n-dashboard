import React from 'react';
import { RefreshCw, Key, ExternalLink, Loader2 } from 'lucide-react';
import { PageHeader } from '../components/layout';
import { useCredentials } from '../hooks/useN8n';
import { useSettings } from '../hooks/useSettings';
import { useToast } from '../components/Toast';
import { formatDistanceToNow } from '../utils/date';

export const CredentialsPage: React.FC = () => {
  const { settings } = useSettings();
  const toast = useToast();

  const { data: credentials, isLoading, refetch, error } = useCredentials();

  const handleRefresh = () => {
    refetch();
    toast.info('Refreshing credentials...');
  };

  const openInN8n = (credentialId: string) => {
    const baseUrl = settings.n8nUrl || '';
    if (baseUrl) {
      window.open(`${baseUrl}/credentials/${credentialId}`, '_blank');
    }
  };

  return (
    <>
      <PageHeader
        title="Credentials"
        description="View credentials stored in your n8n instance"
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
          Failed to load credentials. This endpoint may not be available in your n8n version.
        </div>
      ) : credentials && credentials.length > 0 ? (
        <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800">
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Updated</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {credentials.map((credential) => (
                <tr key={credential.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                        <Key size={16} className="text-neutral-500 dark:text-neutral-400" />
                      </div>
                      <span className="text-sm font-medium text-neutral-900 dark:text-white">{credential.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">{credential.type}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-neutral-500 dark:text-neutral-400">
                      {credential.updatedAt ? formatDistanceToNow(credential.updatedAt) : '-'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openInN8n(credential.id)}
                      className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-800 transition-colors"
                      title="Open in n8n"
                    >
                      <ExternalLink size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 text-neutral-500 dark:text-neutral-400">
          <Key size={40} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">No credentials found</p>
        </div>
      )}

      <p className="mt-4 text-xs text-neutral-500 dark:text-neutral-400">
        For security reasons, credential values are not displayed. Manage credentials directly in n8n.
      </p>
    </>
  );
};
