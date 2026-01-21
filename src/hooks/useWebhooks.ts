import { useMemo } from 'react';
import { useWorkflows } from './useN8n';
import { useSettings } from './useSettings';
import type { Workflow, WorkflowNode } from '../types';

export interface WebhookInfo {
  workflowId: string;
  workflowName: string;
  workflowActive: boolean;
  nodeName: string;
  nodeType: string;
  path: string;
  httpMethod: string;
  webhookUrl: string;
  responseMode?: string;
  authentication?: string;
}

const parseWebhookNode = (workflow: Workflow, node: WorkflowNode, baseUrl: string): WebhookInfo | null => {
  const nodeType = node.type.toLowerCase();

  // Check for Webhook nodes
  if (nodeType.includes('webhook')) {
    const params = node.parameters || {};

    // Extract path - could be under 'path' or in options
    let path = (params.path as string) || '';
    if (!path && params.options) {
      const options = params.options as Record<string, unknown>;
      path = (options.path as string) || '';
    }

    // Default to workflow id if no path specified
    if (!path) {
      path = workflow.id;
    }

    // Ensure path starts with /
    if (!path.startsWith('/')) {
      path = `/${path}`;
    }

    // Extract HTTP method
    let httpMethod = (params.httpMethod as string) || 'GET';
    if (Array.isArray(httpMethod)) {
      httpMethod = httpMethod.join(', ');
    }

    // Extract response mode
    const responseMode = (params.responseMode as string) || 'onReceived';

    // Extract authentication
    let authentication = 'None';
    if (params.authentication) {
      authentication = params.authentication as string;
    } else if (params.options) {
      const options = params.options as Record<string, unknown>;
      if (options.authentication) {
        authentication = options.authentication as string;
      }
    }

    // Build webhook URL
    const webhookUrl = `${baseUrl}/webhook${path}`;

    return {
      workflowId: workflow.id,
      workflowName: workflow.name,
      workflowActive: workflow.active,
      nodeName: node.name,
      nodeType: node.type,
      path,
      httpMethod: httpMethod.toUpperCase(),
      webhookUrl,
      responseMode,
      authentication,
    };
  }

  return null;
};

export const useWebhooks = (options?: { autoRefresh?: boolean; refreshInterval?: number }) => {
  const { data: workflows, isLoading, refetch, error } = useWorkflows(options);
  const { settings } = useSettings();

  const webhooks = useMemo((): WebhookInfo[] => {
    if (!workflows) return [];

    // Get base URL from settings or default
    const baseUrl = settings.n8nUrl || 'https://your-n8n-instance.com';

    const allWebhooks: WebhookInfo[] = [];

    workflows.forEach(workflow => {
      if (!workflow.nodes) return;

      workflow.nodes.forEach(node => {
        const webhookInfo = parseWebhookNode(workflow, node, baseUrl);
        if (webhookInfo) {
          allWebhooks.push(webhookInfo);
        }
      });
    });

    // Sort by active first, then by workflow name
    return allWebhooks.sort((a, b) => {
      if (a.workflowActive !== b.workflowActive) {
        return a.workflowActive ? -1 : 1;
      }
      return a.workflowName.localeCompare(b.workflowName);
    });
  }, [workflows, settings.n8nUrl]);

  return {
    webhooks,
    isLoading,
    refetch,
    error,
  };
};
