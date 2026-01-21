import type { Workflow, Execution, Credential, Variable } from '../types';
import { getStoredSettings } from '../hooks/useSettings';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const getBaseUrl = (): string => {
  // Always use proxy path to avoid CORS issues
  // In dev: Vite proxy forwards to VITE_N8N_URL
  // In prod: Vercel serverless function handles it
  return '/api/n8n';
};

const getHeaders = async (): Promise<HeadersInit> => {
  const settings = getStoredSettings();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // If Supabase is configured and user is authenticated, include the access token
  // The serverless proxy will use this to look up the user's encrypted credentials
  if (isSupabaseConfigured()) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      headers['Authorization'] = `Bearer ${data.session.access_token}`;
    }
  }

  // For development without Supabase, use local settings or env variable
  if (!isSupabaseConfigured()) {
    if (settings.apiKey) {
      headers['X-N8N-API-KEY'] = settings.apiKey;
    } else if (import.meta.env.DEV && import.meta.env.VITE_N8N_API_KEY) {
      headers['X-N8N-API-KEY'] = import.meta.env.VITE_N8N_API_KEY;
    }
  }

  return headers;
};

export const n8nApi = {
  async getWorkflows(params?: { limit?: number }): Promise<{ data: Workflow[] }> {
    const searchParams = new URLSearchParams();
    // Default to 250 to fetch more workflows, n8n's default is often 10-100
    searchParams.set('limit', (params?.limit ?? 250).toString());

    const res = await fetch(`${getBaseUrl()}/api/v1/workflows?${searchParams.toString()}`, {
      headers: await getHeaders(),
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch workflows: ${res.statusText}`);
    }

    return res.json();
  },

  // Fetch all workflows using cursor-based pagination
  async getAllWorkflows(): Promise<{ data: Workflow[] }> {
    const allWorkflows: Workflow[] = [];
    let cursor: string | undefined;
    const limit = 250;

    do {
      const searchParams = new URLSearchParams();
      searchParams.set('limit', limit.toString());
      if (cursor) {
        searchParams.set('cursor', cursor);
      }

      const res = await fetch(`${getBaseUrl()}/api/v1/workflows?${searchParams.toString()}`, {
        headers: await getHeaders(),
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch workflows: ${res.statusText}`);
      }

      const response = await res.json();
      const workflows = response.data || [];
      allWorkflows.push(...workflows);

      // n8n returns nextCursor if there are more results
      cursor = response.nextCursor;
    } while (cursor);

    return { data: allWorkflows };
  },

  async getWorkflow(id: string): Promise<Workflow> {
    const res = await fetch(`${getBaseUrl()}/api/v1/workflows/${id}`, {
      headers: await getHeaders(),
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch workflow: ${res.statusText}`);
    }

    return res.json();
  },

  async getExecutions(params?: {
    limit?: number;
    status?: string;
    workflowId?: string;
  }): Promise<{ data: Execution[] }> {
    const searchParams = new URLSearchParams();
    // Default to 250 if no limit specified
    searchParams.set('limit', (params?.limit ?? 250).toString());
    if (params?.status) searchParams.set('status', params.status);
    if (params?.workflowId) searchParams.set('workflowId', params.workflowId);

    const url = `${getBaseUrl()}/api/v1/executions?${searchParams.toString()}`;
    const res = await fetch(url, {
      headers: await getHeaders(),
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch executions: ${res.statusText}`);
    }

    return res.json();
  },

  // Fetch all executions using cursor-based pagination
  async getAllExecutions(params?: {
    status?: string;
    workflowId?: string;
  }): Promise<{ data: Execution[] }> {
    const allExecutions: Execution[] = [];
    let cursor: string | undefined;
    const limit = 250;

    do {
      const searchParams = new URLSearchParams();
      searchParams.set('limit', limit.toString());
      if (params?.status) searchParams.set('status', params.status);
      if (params?.workflowId) searchParams.set('workflowId', params.workflowId);
      if (cursor) {
        searchParams.set('cursor', cursor);
      }

      const res = await fetch(`${getBaseUrl()}/api/v1/executions?${searchParams.toString()}`, {
        headers: await getHeaders(),
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch executions: ${res.statusText}`);
      }

      const response = await res.json();
      const executions = response.data || [];
      allExecutions.push(...executions);

      // n8n returns nextCursor if there are more results
      cursor = response.nextCursor;
    } while (cursor);

    return { data: allExecutions };
  },

  async getExecution(id: string): Promise<Execution> {
    const res = await fetch(`${getBaseUrl()}/api/v1/executions/${id}`, {
      headers: await getHeaders(),
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch execution: ${res.statusText}`);
    }

    return res.json();
  },

  async activateWorkflow(id: string): Promise<Workflow> {
    const res = await fetch(`${getBaseUrl()}/api/v1/workflows/${id}/activate`, {
      method: 'POST',
      headers: await getHeaders(),
    });

    if (!res.ok) {
      throw new Error(`Failed to activate workflow: ${res.statusText}`);
    }

    return res.json();
  },

  async deactivateWorkflow(id: string): Promise<Workflow> {
    const res = await fetch(`${getBaseUrl()}/api/v1/workflows/${id}/deactivate`, {
      method: 'POST',
      headers: await getHeaders(),
    });

    if (!res.ok) {
      throw new Error(`Failed to deactivate workflow: ${res.statusText}`);
    }

    return res.json();
  },

  async triggerWorkflow(id: string): Promise<{ executionId: string }> {
    const res = await fetch(`${getBaseUrl()}/api/v1/workflows/${id}/run`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      throw new Error(`Failed to trigger workflow: ${res.statusText}`);
    }

    return res.json();
  },

  async testConnection(): Promise<boolean> {
    try {
      const res = await fetch(`${getBaseUrl()}/api/v1/workflows?limit=1`, {
        headers: await getHeaders(),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  // Credentials (note: n8n API only returns metadata, not actual secrets)
  async getCredentials(): Promise<{ data: Credential[] }> {
    const searchParams = new URLSearchParams();
    searchParams.set('limit', '250');

    const res = await fetch(`${getBaseUrl()}/api/v1/credentials?${searchParams.toString()}`, {
      headers: await getHeaders(),
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch credentials: ${res.statusText}`);
    }

    return res.json();
  },

  // Variables (requires n8n 1.x+)
  async getVariables(): Promise<{ data: Variable[] }> {
    const searchParams = new URLSearchParams();
    searchParams.set('limit', '250');

    const res = await fetch(`${getBaseUrl()}/api/v1/variables?${searchParams.toString()}`, {
      headers: await getHeaders(),
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch variables: ${res.statusText}`);
    }

    return res.json();
  },
};
