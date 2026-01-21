import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { n8nApi } from '../services/n8n';
import type { Workflow, Execution, DashboardStats, Tag, Credential, Variable } from '../types';

interface RefreshOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const useWorkflows = (options?: RefreshOptions) => {
  const { autoRefresh = true, refreshInterval = 30 } = options || {};

  return useQuery({
    queryKey: ['workflows'],
    queryFn: async () => {
      const response = await n8nApi.getWorkflows();
      return response.data;
    },
    refetchInterval: autoRefresh ? refreshInterval * 1000 : false,
  });
};

export const useExecutions = (params?: {
  limit?: number;
  status?: string;
  workflowId?: string;
}, options?: RefreshOptions) => {
  const { autoRefresh = true, refreshInterval = 10 } = options || {};

  return useQuery({
    queryKey: ['executions', params],
    queryFn: async () => {
      const response = await n8nApi.getExecutions(params);
      return response.data;
    },
    refetchInterval: autoRefresh ? refreshInterval * 1000 : false,
  });
};

export const useExecution = (id: string | null) => {
  return useQuery({
    queryKey: ['execution', id],
    queryFn: () => n8nApi.getExecution(id!),
    enabled: !!id,
  });
};

export const useToggleWorkflow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workflow: Workflow) => {
      if (workflow.active) {
        return n8nApi.deactivateWorkflow(workflow.id);
      }
      return n8nApi.activateWorkflow(workflow.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });
};

export const useTriggerWorkflow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workflowId: string) => {
      return n8nApi.triggerWorkflow(workflowId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['executions'] });
    },
  });
};

export const useDashboardStats = (
  workflows: Workflow[] | undefined,
  executions: Execution[] | undefined
): DashboardStats => {
  if (!workflows || !executions) {
    return {
      totalWorkflows: 0,
      activeWorkflows: 0,
      totalExecutions: 0,
      successRate: 0,
      recentErrors: 0,
    };
  }

  const totalWorkflows = workflows.length;
  const activeWorkflows = workflows.filter((w) => w.active).length;
  const totalExecutions = executions.length;
  const successfulExecutions = executions.filter((e) => e.status === 'success').length;
  const successRate = totalExecutions > 0
    ? (successfulExecutions / totalExecutions) * 100
    : 0;
  const recentErrors = executions.filter((e) => e.status === 'error').length;

  return {
    totalWorkflows,
    activeWorkflows,
    totalExecutions,
    successRate,
    recentErrors,
  };
};

export const useTags = (options?: RefreshOptions) => {
  const { autoRefresh = false, refreshInterval = 60 } = options || {};

  return useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const response = await n8nApi.getTags();
      return response.data;
    },
    refetchInterval: autoRefresh ? refreshInterval * 1000 : false,
  });
};

export const useCredentials = (options?: RefreshOptions) => {
  const { autoRefresh = false, refreshInterval = 60 } = options || {};

  return useQuery({
    queryKey: ['credentials'],
    queryFn: async () => {
      const response = await n8nApi.getCredentials();
      return response.data;
    },
    refetchInterval: autoRefresh ? refreshInterval * 1000 : false,
  });
};

export const useVariables = (options?: RefreshOptions) => {
  const { autoRefresh = false, refreshInterval = 60 } = options || {};

  return useQuery({
    queryKey: ['variables'],
    queryFn: async () => {
      const response = await n8nApi.getVariables();
      return response.data;
    },
    refetchInterval: autoRefresh ? refreshInterval * 1000 : false,
  });
};
