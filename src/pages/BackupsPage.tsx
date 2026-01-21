import React, { useState, useRef } from 'react';
import { RefreshCw, Download, Upload, Archive, Check, AlertCircle, FileJson, Clock } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { PageHeader } from '../components/layout';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useWorkflows } from '../hooks/useN8n';
import { useSettings } from '../hooks/useSettings';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { useToast } from '../components/Toast';
import type { Workflow } from '../types';

export const BackupsPage: React.FC = () => {
  const [selectedWorkflows, setSelectedWorkflows] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isAuthenticated } = useAuth();
  const { settings } = useSettings();
  const toast = useToast();

  const refreshOptions = {
    autoRefresh: settings.autoRefresh,
    refreshInterval: settings.refreshInterval,
  };

  const shouldFetchData = !isSupabaseConfigured() || isAuthenticated;

  const { data: workflows, isLoading, refetch } = useWorkflows(
    shouldFetchData ? refreshOptions : { autoRefresh: false }
  );

  const handleRefresh = () => {
    refetch();
    toast.info('Refreshing workflows...');
  };

  const toggleWorkflowSelection = (workflowId: string) => {
    setSelectedWorkflows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(workflowId)) {
        newSet.delete(workflowId);
      } else {
        newSet.add(workflowId);
      }
      return newSet;
    });
  };

  const selectAllWorkflows = () => {
    if (!workflows) return;
    if (selectedWorkflows.size === workflows.length) {
      setSelectedWorkflows(new Set());
    } else {
      setSelectedWorkflows(new Set(workflows.map(w => w.id)));
    }
  };

  const exportWorkflow = (workflow: Workflow) => {
    const data = JSON.stringify(workflow, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow-${workflow.name.replace(/[^a-z0-9]/gi, '-')}-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Workflow exported', workflow.name);
  };

  const exportSelectedWorkflows = async () => {
    if (!workflows || selectedWorkflows.size === 0) return;

    setIsExporting(true);

    try {
      const selectedWorkflowData = workflows.filter(w => selectedWorkflows.has(w.id));

      if (selectedWorkflowData.length === 1) {
        exportWorkflow(selectedWorkflowData[0]);
      } else {
        // Export as a bundle
        const bundle = {
          exportedAt: new Date().toISOString(),
          version: '1.0',
          workflows: selectedWorkflowData,
        };

        const data = JSON.stringify(bundle, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `workflows-bundle-${format(new Date(), 'yyyy-MM-dd')}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Workflows exported', `${selectedWorkflowData.length} workflows`);
      }
    } catch {
      toast.error('Export failed', 'Unable to export workflows');
    } finally {
      setIsExporting(false);
    }
  };

  const exportAllWorkflows = async () => {
    if (!workflows) return;

    setIsExporting(true);

    try {
      const bundle = {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        totalWorkflows: workflows.length,
        workflows: workflows,
      };

      const data = JSON.stringify(bundle, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `n8n-backup-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Full backup created', `${workflows.length} workflows exported`);
    } catch {
      toast.error('Backup failed', 'Unable to create backup');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Check if it's a bundle or single workflow
      if (data.workflows && Array.isArray(data.workflows)) {
        toast.info('Import preview', `Found ${data.workflows.length} workflows in bundle`);
        // In a real implementation, you would send these to the n8n API
      } else if (data.id && data.name && data.nodes) {
        toast.info('Import preview', `Found workflow: ${data.name}`);
        // In a real implementation, you would send this to the n8n API
      } else {
        toast.error('Invalid file', 'File does not contain valid workflow data');
      }

      // Note: Actual import would require n8n API endpoint for creating workflows
      toast.info('Note', 'Import to n8n requires the POST /workflows API endpoint');
    } catch {
      toast.error('Import failed', 'Unable to parse JSON file');
    }

    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <PageHeader
        title="Backups"
        description="Export and import workflow configurations"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleImportClick}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
            >
              <Upload size={16} />
              Import
            </button>
            <button
              onClick={exportAllWorkflows}
              disabled={isExporting || !workflows?.length}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors disabled:opacity-50"
            >
              <Archive size={16} />
              Export All
            </button>
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        }
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileImport}
        className="hidden"
      />

      <ErrorBoundary>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw size={24} className="animate-spin text-neutral-400" />
          </div>
        ) : !workflows || workflows.length === 0 ? (
          <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-8 text-center">
            <Archive size={48} className="mx-auto text-neutral-300 dark:text-neutral-700 mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">No workflows found</h3>
            <p className="text-neutral-500 dark:text-neutral-400">
              No workflows available to backup.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
                <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 mb-1">
                  <FileJson size={16} />
                  <span className="text-xs font-medium uppercase">Total Workflows</span>
                </div>
                <span className="text-2xl font-semibold text-neutral-900 dark:text-white">
                  {workflows.length}
                </span>
              </div>

              <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4">
                <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 mb-1">
                  <Check size={16} />
                  <span className="text-xs font-medium uppercase">Selected</span>
                </div>
                <span className="text-2xl font-semibold text-neutral-900 dark:text-white">
                  {selectedWorkflows.size}
                </span>
              </div>

              <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-4 md:col-span-1 col-span-2">
                <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 mb-1">
                  <Clock size={16} />
                  <span className="text-xs font-medium uppercase">Last Modified</span>
                </div>
                <span className="text-lg font-semibold text-neutral-900 dark:text-white">
                  {workflows.length > 0
                    ? formatDistanceToNow(new Date(
                        Math.max(...workflows.map(w => new Date(w.updatedAt).getTime()))
                      ), { addSuffix: true })
                    : 'N/A'
                  }
                </span>
              </div>
            </div>

            {/* Info Notice */}
            <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300">Backup Information</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                    Exports include workflow configuration only. Credentials are not included for security reasons.
                    To restore workflows, use the n8n UI import feature or API.
                  </p>
                </div>
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedWorkflows.size > 0 && (
              <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-3 flex items-center justify-between">
                <span className="text-sm text-neutral-700 dark:text-neutral-300">
                  {selectedWorkflows.size} workflow{selectedWorkflows.size !== 1 ? 's' : ''} selected
                </span>
                <button
                  onClick={exportSelectedWorkflows}
                  disabled={isExporting}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors disabled:opacity-50"
                >
                  <Download size={14} />
                  Export Selected
                </button>
              </div>
            )}

            {/* Workflows Table */}
            <div className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                <h3 className="text-sm font-medium text-neutral-900 dark:text-white">Workflows</h3>
                <button
                  onClick={selectAllWorkflows}
                  className="text-xs text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                >
                  {selectedWorkflows.size === workflows.length ? 'Deselect all' : 'Select all'}
                </button>
              </div>
              <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {workflows.map((workflow) => (
                  <div
                    key={workflow.id}
                    className="px-4 py-3 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedWorkflows.has(workflow.id)}
                        onChange={() => toggleWorkflowSelection(workflow.id)}
                        className="rounded border-neutral-300 dark:border-neutral-600"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-neutral-900 dark:text-white">
                            {workflow.name}
                          </p>
                          {workflow.active && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {workflow.nodes?.length || 0} nodes • Updated {formatDistanceToNow(new Date(workflow.updatedAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => exportWorkflow(workflow)}
                      className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded transition-colors"
                    >
                      <Download size={14} />
                      Export
                    </button>
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
