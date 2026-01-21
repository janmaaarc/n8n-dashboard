import React from 'react';
import { RefreshCw, Key, Calendar, Clock, Shield } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { PageHeader } from '../components/layout';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useCredentials } from '../hooks/useN8n';
import { useSettings } from '../hooks/useSettings';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { useToast } from '../components/Toast';

const credentialTypeColors: Record<string, string> = {
  'api': 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  'oauth': 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400',
  'httpBasicAuth': 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400',
  'httpHeaderAuth': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400',
  default: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400',
};

const getCredentialTypeColor = (type: string): string => {
  const lowerType = type.toLowerCase();
  for (const [key, value] of Object.entries(credentialTypeColors)) {
    if (lowerType.includes(key)) return value;
  }
  return credentialTypeColors.default;
};

const formatCredentialType = (type: string): string => {
  // Remove common prefixes/suffixes and format nicely
  return type
    .replace(/Api$/, ' API')
    .replace(/OAuth2$/, ' OAuth2')
    .replace(/^n8n-/, '')
    .replace(/Credentials?$/, '')
    .split(/(?=[A-Z])/)
    .join(' ')
    .trim();
};

export const ApiKeysPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { settings } = useSettings();
  const toast = useToast();

  const refreshOptions = {
    autoRefresh: settings.autoRefresh,
    refreshInterval: settings.refreshInterval,
  };

  const shouldFetchData = !isSupabaseConfigured() || isAuthenticated;

  const { data: credentials, isLoading, refetch } = useCredentials(
    shouldFetchData ? refreshOptions : { autoRefresh: false }
  );

  const handleRefresh = () => {
    refetch();
    toast.info('Refreshing credentials...');
  };

  // Group credentials by type
  const groupedCredentials = React.useMemo(() => {
    if (!credentials) return {};

    return credentials.reduce((acc, cred) => {
      const type = cred.type || 'other';
      if (!acc[type]) acc[type] = [];
      acc[type].push(cred);
      return acc;
    }, {} as Record<string, typeof credentials>);
  }, [credentials]);

  const typeCount = Object.keys(groupedCredentials).length;

  return (
    <>
      <PageHeader
        title="API Keys & Credentials"
        description="View credential metadata (secrets are never exposed)"
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
        ) : !credentials || credentials.length === 0 ? (
          <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-8 text-center">
            <Key size={48} className="mx-auto text-neutral-300 dark:text-neutral-700 mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">No credentials found</h3>
            <p className="text-neutral-500 dark:text-neutral-400">
              No credentials configured in your n8n instance.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
                <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 mb-1">
                  <Key size={16} />
                  <span className="text-xs font-medium uppercase">Total Credentials</span>
                </div>
                <span className="text-2xl font-semibold text-neutral-900 dark:text-white">
                  {credentials.length}
                </span>
              </div>

              <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
                <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 mb-1">
                  <Shield size={16} />
                  <span className="text-xs font-medium uppercase">Credential Types</span>
                </div>
                <span className="text-2xl font-semibold text-neutral-900 dark:text-white">
                  {typeCount}
                </span>
              </div>

              <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 md:col-span-1 col-span-2">
                <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 mb-1">
                  <Clock size={16} />
                  <span className="text-xs font-medium uppercase">Last Updated</span>
                </div>
                <span className="text-lg font-semibold text-neutral-900 dark:text-white">
                  {credentials[0]?.updatedAt
                    ? formatDistanceToNow(new Date(credentials[0].updatedAt), { addSuffix: true })
                    : 'N/A'
                  }
                </span>
              </div>
            </div>

            {/* Security Notice */}
            <div className="bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Shield size={20} className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Security Notice</h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                    For security reasons, the n8n API only returns credential metadata. Actual secrets,
                    API keys, and passwords are never exposed through the API.
                  </p>
                </div>
              </div>
            </div>

            {/* Credentials Table */}
            <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
                <h3 className="text-sm font-medium text-neutral-900 dark:text-white">All Credentials</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                    <tr>
                      <th className="text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase px-4 py-3">Name</th>
                      <th className="text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase px-4 py-3">Type</th>
                      <th className="text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase px-4 py-3">Created</th>
                      <th className="text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase px-4 py-3">Updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {credentials.map((credential) => (
                      <tr key={credential.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Key size={14} className="text-neutral-400" />
                            <span className="text-sm font-medium text-neutral-900 dark:text-white">
                              {credential.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${getCredentialTypeColor(credential.type)}`}>
                            {formatCredentialType(credential.type)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-sm text-neutral-600 dark:text-neutral-400">
                            <Calendar size={12} />
                            <span>{format(new Date(credential.createdAt), 'MMM d, yyyy')}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-neutral-600 dark:text-neutral-400">
                            {formatDistanceToNow(new Date(credential.updatedAt), { addSuffix: true })}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Grouped by Type */}
            <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
                <h3 className="text-sm font-medium text-neutral-900 dark:text-white">By Type</h3>
              </div>
              <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Object.entries(groupedCredentials).map(([type, creds]) => (
                  <div
                    key={type}
                    className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${getCredentialTypeColor(type)}`}>
                        {formatCredentialType(type)}
                      </span>
                      <span className="text-sm font-semibold text-neutral-900 dark:text-white">
                        {creds.length}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {creds.slice(0, 3).map(cred => (
                        <p key={cred.id} className="text-xs text-neutral-600 dark:text-neutral-400 truncate">
                          {cred.name}
                        </p>
                      ))}
                      {creds.length > 3 && (
                        <p className="text-xs text-neutral-400 dark:text-neutral-500">
                          +{creds.length - 3} more
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </ErrorBoundary>
    </>
  );
};
