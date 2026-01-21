import React, { useState } from 'react';
import { RefreshCw, Webhook, Copy, Check, ExternalLink, Power, PowerOff, Globe, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/layout';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useWebhooks, type WebhookInfo } from '../hooks/useWebhooks';
import { useSettings } from '../hooks/useSettings';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { useToast } from '../components/Toast';

const MethodBadge: React.FC<{ method: string }> = ({ method }) => {
  const colors: Record<string, string> = {
    GET: 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400',
    POST: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
    PUT: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400',
    PATCH: 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
    DELETE: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  };

  const colorClass = colors[method] || 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400';

  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded ${colorClass}`}>
      {method}
    </span>
  );
};

const WebhookCard: React.FC<{ webhook: WebhookInfo; onCopy: (url: string) => void }> = ({ webhook, onCopy }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(webhook.webhookUrl);
    onCopy(webhook.webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden ${!webhook.workflowActive ? 'opacity-60' : ''}`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
              webhook.workflowActive
                ? 'bg-blue-100 dark:bg-blue-500/10'
                : 'bg-neutral-100 dark:bg-neutral-800'
            }`}>
              <Webhook size={20} className={webhook.workflowActive ? 'text-blue-600 dark:text-blue-400' : 'text-neutral-400'} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                  {webhook.workflowName}
                </h3>
                <MethodBadge method={webhook.httpMethod} />
                {webhook.authentication && webhook.authentication !== 'None' && webhook.authentication !== 'none' && (
                  <span className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                    <Lock size={10} />
                    {webhook.authentication}
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {webhook.nodeName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {webhook.workflowActive ? (
              <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                <Power size={12} />
                Active
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-neutral-400">
                <PowerOff size={12} />
                Inactive
              </span>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 min-w-0 bg-neutral-50 dark:bg-neutral-800 rounded-lg px-3 py-2 font-mono text-xs text-neutral-600 dark:text-neutral-400 truncate">
            {webhook.webhookUrl}
          </div>
          <button
            onClick={handleCopy}
            className={`p-2 rounded-lg transition-colors ${
              copied
                ? 'bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-400'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700'
            }`}
            title="Copy URL"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
          <Link
            to={`/workflows?highlight=${webhook.workflowId}`}
            className="p-2 bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 rounded-lg transition-colors"
            title="View workflow"
          >
            <ExternalLink size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export const WebhooksPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { settings } = useSettings();
  const toast = useToast();

  const refreshOptions = {
    autoRefresh: settings.autoRefresh,
    refreshInterval: settings.refreshInterval,
  };

  const shouldFetchData = !isSupabaseConfigured() || isAuthenticated;

  const { webhooks, isLoading, refetch } = useWebhooks(
    shouldFetchData ? refreshOptions : { autoRefresh: false }
  );

  const handleRefresh = () => {
    refetch();
    toast.info('Refreshing webhooks...');
  };

  const handleCopy = (url: string) => {
    toast.success('URL copied', url.length > 50 ? `${url.slice(0, 50)}...` : url);
  };

  const activeWebhooks = webhooks.filter(w => w.workflowActive);
  const inactiveWebhooks = webhooks.filter(w => !w.workflowActive);

  return (
    <>
      <PageHeader
        title="Webhooks"
        description="View all webhook endpoints in your workflows"
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
        ) : webhooks.length === 0 ? (
          <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-8 text-center">
            <Globe size={48} className="mx-auto text-neutral-300 dark:text-neutral-700 mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">No webhooks found</h3>
            <p className="text-neutral-500 dark:text-neutral-400">
              No workflows with webhook triggers detected. Create a workflow with a Webhook node to see it here.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
                <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 mb-1">
                  <Webhook size={16} />
                  <span className="text-xs font-medium uppercase">Total Webhooks</span>
                </div>
                <span className="text-2xl font-semibold text-neutral-900 dark:text-white">
                  {webhooks.length}
                </span>
              </div>

              <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
                <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 mb-1">
                  <Power size={16} />
                  <span className="text-xs font-medium uppercase">Active</span>
                </div>
                <span className="text-2xl font-semibold text-green-600 dark:text-green-400">
                  {activeWebhooks.length}
                </span>
              </div>

              <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
                <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 mb-1">
                  <PowerOff size={16} />
                  <span className="text-xs font-medium uppercase">Inactive</span>
                </div>
                <span className="text-2xl font-semibold text-neutral-500 dark:text-neutral-400">
                  {inactiveWebhooks.length}
                </span>
              </div>
            </div>

            {/* Active Webhooks */}
            {activeWebhooks.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <h3 className="text-sm font-medium text-neutral-900 dark:text-white">
                    Active Webhooks ({activeWebhooks.length})
                  </h3>
                </div>
                <div className="grid gap-3">
                  {activeWebhooks.map((webhook, index) => (
                    <WebhookCard
                      key={`${webhook.workflowId}-${index}`}
                      webhook={webhook}
                      onCopy={handleCopy}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Inactive Webhooks */}
            {inactiveWebhooks.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-neutral-400" />
                  <h3 className="text-sm font-medium text-neutral-900 dark:text-white">
                    Inactive Webhooks ({inactiveWebhooks.length})
                  </h3>
                </div>
                <div className="grid gap-3">
                  {inactiveWebhooks.map((webhook, index) => (
                    <WebhookCard
                      key={`${webhook.workflowId}-${index}`}
                      webhook={webhook}
                      onCopy={handleCopy}
                    />
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
