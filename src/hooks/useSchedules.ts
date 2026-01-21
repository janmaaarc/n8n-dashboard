import { useMemo } from 'react';
import { useWorkflows } from './useN8n';
import type { Workflow, WorkflowNode } from '../types';

export interface ScheduleInfo {
  workflowId: string;
  workflowName: string;
  workflowActive: boolean;
  nodeName: string;
  nodeType: string;
  cronExpression?: string;
  interval?: {
    value: number;
    unit: string;
  };
  rule?: {
    mode: string;
    hour?: number;
    minute?: number;
    weekdays?: number[];
  };
}

const parseScheduleNode = (workflow: Workflow, node: WorkflowNode): ScheduleInfo | null => {
  const nodeType = node.type.toLowerCase();

  // Check for Schedule/Cron nodes
  if (nodeType.includes('schedule') || nodeType.includes('cron') || nodeType.includes('interval')) {
    const params = node.parameters || {};

    // Extract cron expression
    let cronExpression: string | undefined;
    if (params.cronExpression) {
      cronExpression = params.cronExpression as string;
    } else if (params.expression) {
      cronExpression = params.expression as string;
    }

    // Extract interval
    let interval: { value: number; unit: string } | undefined;
    if (params.interval) {
      interval = {
        value: (params.interval as { value: number })?.value || params.interval as number,
        unit: (params.interval as { unit: string })?.unit || 'seconds',
      };
    } else if (params.value && params.unit) {
      interval = {
        value: params.value as number,
        unit: params.unit as string,
      };
    }

    // Extract rule (for n8n Schedule Trigger)
    let rule: ScheduleInfo['rule'] | undefined;
    if (params.rule) {
      const ruleParams = params.rule as Record<string, unknown>;
      rule = {
        mode: (ruleParams.interval as string) || 'days',
        hour: ruleParams.hour as number,
        minute: ruleParams.minute as number,
        weekdays: ruleParams.weekdays as number[],
      };
    }

    return {
      workflowId: workflow.id,
      workflowName: workflow.name,
      workflowActive: workflow.active,
      nodeName: node.name,
      nodeType: node.type,
      cronExpression,
      interval,
      rule,
    };
  }

  return null;
};

export const useSchedules = (options?: { autoRefresh?: boolean; refreshInterval?: number }) => {
  const { data: workflows, isLoading, refetch, error } = useWorkflows(options);

  const schedules = useMemo((): ScheduleInfo[] => {
    if (!workflows) return [];

    const allSchedules: ScheduleInfo[] = [];

    workflows.forEach(workflow => {
      if (!workflow.nodes) return;

      workflow.nodes.forEach(node => {
        const scheduleInfo = parseScheduleNode(workflow, node);
        if (scheduleInfo) {
          allSchedules.push(scheduleInfo);
        }
      });
    });

    // Sort by active first, then by workflow name
    return allSchedules.sort((a, b) => {
      if (a.workflowActive !== b.workflowActive) {
        return a.workflowActive ? -1 : 1;
      }
      return a.workflowName.localeCompare(b.workflowName);
    });
  }, [workflows]);

  return {
    schedules,
    isLoading,
    refetch,
    error,
  };
};
