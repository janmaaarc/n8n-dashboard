import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { n8nApi } from '../services/n8n';
import type { Workflow, Execution, DashboardStats } from '../types';

interface RefreshOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const useWorkflows = (options?: RefreshOptions) => {
  const { autoRefresh = true, refreshInterval = 30 } = options || {};

  return useQuery({
    queryKey: ['workflows'],
    queryFn: async () => {
      // Use getAllWorkflows to fetch all workflows with pagination
      const response = await n8nApi.getAllWorkflows();
      return response.data;
    },
    refetchInterval: autoRefresh ? refreshInterval * 1000 : false,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
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
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
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

const getWeekBoundaries = () => {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const startOfThisWeek = new Date(now);
  startOfThisWeek.setDate(now.getDate() - dayOfWeek);
  startOfThisWeek.setHours(0, 0, 0, 0);

  const startOfLastWeek = new Date(startOfThisWeek);
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

  return { startOfThisWeek, startOfLastWeek };
};

const calculateWeeklyStats = (executions: Execution[], startDate: Date, endDate: Date) => {
  const weeklyExecutions = executions.filter((e) => {
    const date = new Date(e.startedAt);
    return date >= startDate && date < endDate;
  });

  const total = weeklyExecutions.length;
  const successful = weeklyExecutions.filter((e) => e.status === 'success').length;
  const errors = weeklyExecutions.filter((e) => e.status === 'error').length;
  const successRate = total > 0 ? (successful / total) * 100 : 0;

  return { total, successful, errors, successRate };
};

export const useDashboardStats = (
  workflows: Workflow[] | undefined,
  executions: Execution[] | undefined
): DashboardStats => {
  const emptyTrends = {
    workflows: { value: 0 },
    executions: { value: 0 },
    successRate: { value: 0 },
    errors: { value: 0, isPositiveGood: false },
  };

  if (!workflows || !executions) {
    return {
      totalWorkflows: 0,
      activeWorkflows: 0,
      totalExecutions: 0,
      successRate: 0,
      recentErrors: 0,
      trends: emptyTrends,
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

  // Calculate weekly trends
  const { startOfThisWeek, startOfLastWeek } = getWeekBoundaries();
  const now = new Date();

  const thisWeekStats = calculateWeeklyStats(executions, startOfThisWeek, now);
  const lastWeekStats = calculateWeeklyStats(executions, startOfLastWeek, startOfThisWeek);

  const trends = {
    workflows: { value: 0 }, // Workflows don't typically have weekly trends
    executions: { value: thisWeekStats.total - lastWeekStats.total },
    successRate: {
      value: Number((thisWeekStats.successRate - lastWeekStats.successRate).toFixed(1))
    },
    errors: {
      value: thisWeekStats.errors - lastWeekStats.errors,
      isPositiveGood: false
    },
  };

  return {
    totalWorkflows,
    activeWorkflows,
    totalExecutions,
    successRate,
    recentErrors,
    trends,
  };
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
