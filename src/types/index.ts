export interface Workflow {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  nodes: WorkflowNode[];
  connections: Record<string, unknown>;
  tags?: Tag[];
}

export interface WorkflowNode {
  id: string;
  name: string;
  type: string;
  position: [number, number];
  parameters: Record<string, unknown>;
}

export interface Tag {
  id: string;
  name: string;
}

export interface Execution {
  id: string;
  finished: boolean;
  mode: string;
  retryOf: string | null;
  retrySuccessId: string | null;
  startedAt: string;
  stoppedAt: string | null;
  workflowId: string;
  workflowName?: string;
  status: 'success' | 'error' | 'running' | 'waiting';
  data?: ExecutionData;
}

export interface ExecutionData {
  resultData: {
    runData: Record<string, unknown>;
    error?: {
      message: string;
      stack?: string;
    };
  };
}

export interface ExecutionSummary {
  total: number;
  success: number;
  error: number;
  running: number;
}

export interface DashboardStats {
  totalWorkflows: number;
  activeWorkflows: number;
  totalExecutions: number;
  successRate: number;
  recentErrors: number;
}

export interface Credential {
  id: string;
  name: string;
  type: string;
  createdAt: string;
  updatedAt: string;
}

export interface Variable {
  id: string;
  key: string;
  value: string;
  type: string;
}
