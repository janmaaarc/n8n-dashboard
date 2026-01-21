import React, { useState } from 'react';
import { Bell, Plus, Trash2, Power, PowerOff, AlertCircle, Check, X, Settings2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { PageHeader } from '../components/layout';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useAlerts, type AlertRule } from '../hooks/useAlerts';
import { useWorkflows } from '../hooks/useN8n';
import { useToast } from '../components/Toast';

type RuleType = AlertRule['type'];

const ruleTypeLabels: Record<RuleType, string> = {
  consecutive_failures: 'Consecutive Failures',
  error_rate: 'Error Rate (%)',
  execution_time: 'Execution Time (s)',
};

const ruleTypeDescriptions: Record<RuleType, string> = {
  consecutive_failures: 'Alert when a workflow fails X times in a row',
  error_rate: 'Alert when error rate exceeds X% over last hour',
  execution_time: 'Alert when execution takes longer than X seconds',
};

export const AlertsPage: React.FC = () => {
  const { rules, events, addRule, deleteRule, toggleRule, acknowledgeEvent, clearEvents, unacknowledgedCount } = useAlerts();
  const { data: workflows } = useWorkflows({ autoRefresh: false });
  const toast = useToast();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newRule, setNewRule] = useState<{
    name: string;
    type: RuleType;
    threshold: number;
    workflowId: string;
    browserNotification: boolean;
    webhookUrl: string;
  }>({
    name: '',
    type: 'consecutive_failures',
    threshold: 3,
    workflowId: '',
    browserNotification: true,
    webhookUrl: '',
  });

  const handleAddRule = () => {
    if (!newRule.name.trim()) {
      toast.error('Please enter a rule name');
      return;
    }

    addRule({
      name: newRule.name,
      enabled: true,
      type: newRule.type,
      threshold: newRule.threshold,
      workflowId: newRule.workflowId || undefined,
      notification: {
        browser: newRule.browserNotification,
        webhookUrl: newRule.webhookUrl || undefined,
      },
    });

    toast.success('Alert rule created', newRule.name);
    setShowAddForm(false);
    setNewRule({
      name: '',
      type: 'consecutive_failures',
      threshold: 3,
      workflowId: '',
      browserNotification: true,
      webhookUrl: '',
    });
  };

  const handleDeleteRule = (id: string, name: string) => {
    deleteRule(id);
    toast.info('Alert rule deleted', name);
  };

  const handleToggleRule = (id: string) => {
    toggleRule(id);
    const rule = rules.find(r => r.id === id);
    if (rule) {
      toast.info(`Alert ${rule.enabled ? 'disabled' : 'enabled'}`, rule.name);
    }
  };

  return (
    <>
      <PageHeader
        title="Alerts"
        description="Configure notifications for workflow failures and issues"
        actions={
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
          >
            <Plus size={16} />
            Add Rule
          </button>
        }
      />

      <ErrorBoundary>
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
              <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 mb-1">
                <Settings2 size={16} />
                <span className="text-xs font-medium uppercase">Total Rules</span>
              </div>
              <span className="text-2xl font-semibold text-neutral-900 dark:text-white">
                {rules.length}
              </span>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
              <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 mb-1">
                <Power size={16} />
                <span className="text-xs font-medium uppercase">Active</span>
              </div>
              <span className="text-2xl font-semibold text-green-600 dark:text-green-400">
                {rules.filter(r => r.enabled).length}
              </span>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
              <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 mb-1">
                <Bell size={16} />
                <span className="text-xs font-medium uppercase">Total Events</span>
              </div>
              <span className="text-2xl font-semibold text-neutral-900 dark:text-white">
                {events.length}
              </span>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
              <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 mb-1">
                <AlertCircle size={16} />
                <span className="text-xs font-medium uppercase">Unacknowledged</span>
              </div>
              <span className="text-2xl font-semibold text-red-600 dark:text-red-400">
                {unacknowledgedCount}
              </span>
            </div>
          </div>

          {/* Add Rule Form */}
          {showAddForm && (
            <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-neutral-900 dark:text-white">New Alert Rule</h3>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Rule Name
                  </label>
                  <input
                    type="text"
                    value={newRule.name}
                    onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Critical Workflow Failures"
                    className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Rule Type
                  </label>
                  <select
                    value={newRule.type}
                    onChange={(e) => setNewRule(prev => ({ ...prev, type: e.target.value as RuleType }))}
                    className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-500"
                  >
                    {Object.entries(ruleTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    {ruleTypeDescriptions[newRule.type]}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Threshold
                  </label>
                  <input
                    type="number"
                    value={newRule.threshold}
                    onChange={(e) => setNewRule(prev => ({ ...prev, threshold: parseInt(e.target.value) || 0 }))}
                    min={1}
                    className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Workflow (optional)
                  </label>
                  <select
                    value={newRule.workflowId}
                    onChange={(e) => setNewRule(prev => ({ ...prev, workflowId: e.target.value }))}
                    className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-500"
                  >
                    <option value="">All Workflows</option>
                    {workflows?.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Webhook URL (optional)
                  </label>
                  <input
                    type="url"
                    value={newRule.webhookUrl}
                    onChange={(e) => setNewRule(prev => ({ ...prev, webhookUrl: e.target.value }))}
                    placeholder="https://hooks.slack.com/..."
                    className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="browserNotification"
                    checked={newRule.browserNotification}
                    onChange={(e) => setNewRule(prev => ({ ...prev, browserNotification: e.target.checked }))}
                    className="rounded border-neutral-300 dark:border-neutral-600"
                  />
                  <label htmlFor="browserNotification" className="text-sm text-neutral-700 dark:text-neutral-300">
                    Browser notification
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddRule}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
                >
                  Create Rule
                </button>
              </div>
            </div>
          )}

          {/* Alert Rules */}
          <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
              <h3 className="text-sm font-medium text-neutral-900 dark:text-white">Alert Rules</h3>
            </div>

            {rules.length === 0 ? (
              <div className="p-8 text-center text-neutral-500 dark:text-neutral-400">
                <Bell size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No alert rules configured</p>
                <p className="text-xs mt-1">Click "Add Rule" to create your first alert</p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {rules.map((rule) => (
                  <div key={rule.id} className="px-4 py-3 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleRule(rule.id)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          rule.enabled
                            ? 'bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-400'
                            : 'bg-neutral-100 text-neutral-400 dark:bg-neutral-800'
                        }`}
                      >
                        {rule.enabled ? <Power size={16} /> : <PowerOff size={16} />}
                      </button>
                      <div>
                        <p className="text-sm font-medium text-neutral-900 dark:text-white">
                          {rule.name}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {ruleTypeLabels[rule.type]}: {rule.threshold}
                          {rule.workflowId && workflows?.find(w => w.id === rule.workflowId)
                            ? ` • ${workflows.find(w => w.id === rule.workflowId)?.name}`
                            : ' • All workflows'
                          }
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {rule.notification.browser && (
                        <span className="text-xs px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded">
                          Browser
                        </span>
                      )}
                      {rule.notification.webhookUrl && (
                        <span className="text-xs px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded">
                          Webhook
                        </span>
                      )}
                      <button
                        onClick={() => handleDeleteRule(rule.id, rule.name)}
                        className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Alert Events */}
          <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <h3 className="text-sm font-medium text-neutral-900 dark:text-white">Alert History</h3>
              {events.length > 0 && (
                <button
                  onClick={clearEvents}
                  className="text-xs text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                >
                  Clear all
                </button>
              )}
            </div>

            {events.length === 0 ? (
              <div className="p-8 text-center text-neutral-500 dark:text-neutral-400">
                <AlertCircle size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No alerts triggered yet</p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-200 dark:divide-neutral-800 max-h-96 overflow-y-auto">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className={`px-4 py-3 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/50 ${
                      !event.acknowledged ? 'bg-red-50/50 dark:bg-red-500/5' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <AlertCircle
                        size={16}
                        className={event.acknowledged ? 'text-neutral-400' : 'text-red-500'}
                      />
                      <div>
                        <p className="text-sm font-medium text-neutral-900 dark:text-white">
                          {event.message}
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {event.ruleName} • {event.workflowName} •{' '}
                          {formatDistanceToNow(new Date(event.triggeredAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    {!event.acknowledged && (
                      <button
                        onClick={() => acknowledgeEvent(event.id)}
                        className="p-1.5 text-neutral-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-500/10 rounded transition-colors"
                        title="Acknowledge"
                      >
                        <Check size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </ErrorBoundary>
    </>
  );
};
