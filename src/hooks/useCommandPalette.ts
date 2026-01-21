import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

export interface Command {
  id: string;
  label: string;
  description?: string;
  category: 'navigation' | 'action' | 'workflow';
  keywords?: string[];
  action: () => void;
}

interface UseCommandPaletteOptions {
  workflows?: Array<{ id: string; name: string }>;
  onRefresh?: () => void;
}

export const useCommandPalette = (options: UseCommandPaletteOptions = {}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const open = useCallback(() => {
    setIsOpen(true);
    setQuery('');
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
  }, []);

  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);

  const navigationCommands: Command[] = useMemo(
    () => [
      {
        id: 'nav-dashboard',
        label: 'Go to Dashboard',
        description: 'Overview of workflows and executions',
        category: 'navigation',
        keywords: ['home', 'overview', 'main'],
        action: () => {
          navigate('/');
          close();
        },
      },
      {
        id: 'nav-workflows',
        label: 'Go to Workflows',
        description: 'View and manage all workflows',
        category: 'navigation',
        keywords: ['automation', 'list'],
        action: () => {
          navigate('/workflows');
          close();
        },
      },
      {
        id: 'nav-workflows-active',
        label: 'View Active Workflows',
        description: 'Show only active workflows',
        category: 'navigation',
        keywords: ['running', 'enabled'],
        action: () => {
          navigate('/workflows?status=active');
          close();
        },
      },
      {
        id: 'nav-executions',
        label: 'Go to Executions',
        description: 'View execution history',
        category: 'navigation',
        keywords: ['runs', 'history', 'logs'],
        action: () => {
          navigate('/executions');
          close();
        },
      },
      {
        id: 'nav-executions-errors',
        label: 'View Failed Executions',
        description: 'Show only failed executions',
        category: 'navigation',
        keywords: ['errors', 'failed', 'problems'],
        action: () => {
          navigate('/executions?status=error');
          close();
        },
      },
      {
        id: 'nav-credentials',
        label: 'Go to Credentials',
        description: 'Manage credentials',
        category: 'navigation',
        keywords: ['secrets', 'auth', 'keys'],
        action: () => {
          navigate('/credentials');
          close();
        },
      },
      {
        id: 'nav-variables',
        label: 'Go to Variables',
        description: 'Manage environment variables',
        category: 'navigation',
        keywords: ['env', 'config', 'settings'],
        action: () => {
          navigate('/variables');
          close();
        },
      },
      {
        id: 'nav-settings',
        label: 'Go to Settings',
        description: 'Configure application settings',
        category: 'navigation',
        keywords: ['preferences', 'config'],
        action: () => {
          navigate('/settings');
          close();
        },
      },
    ],
    [navigate, close]
  );

  const actionCommands: Command[] = useMemo(
    () => [
      ...(options.onRefresh
        ? [
            {
              id: 'action-refresh',
              label: 'Refresh Data',
              description: 'Reload workflows and executions',
              category: 'action' as const,
              keywords: ['reload', 'update', 'sync'],
              action: () => {
                options.onRefresh?.();
                close();
              },
            },
          ]
        : []),
    ],
    [options.onRefresh, close]
  );

  const workflowCommands: Command[] = useMemo(() => {
    if (!options.workflows) return [];
    return options.workflows.map((workflow) => ({
      id: `workflow-${workflow.id}`,
      label: workflow.name,
      description: 'Open workflow',
      category: 'workflow' as const,
      keywords: [],
      action: () => {
        navigate(`/workflows?search=${encodeURIComponent(workflow.name)}`);
        close();
      },
    }));
  }, [options.workflows, navigate, close]);

  const allCommands = useMemo(
    () => [...navigationCommands, ...actionCommands, ...workflowCommands],
    [navigationCommands, actionCommands, workflowCommands]
  );

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return allCommands;

    const lowerQuery = query.toLowerCase();
    return allCommands.filter((command) => {
      const labelMatch = command.label.toLowerCase().includes(lowerQuery);
      const descriptionMatch = command.description?.toLowerCase().includes(lowerQuery);
      const keywordMatch = command.keywords?.some((k) => k.toLowerCase().includes(lowerQuery));
      return labelMatch || descriptionMatch || keywordMatch;
    });
  }, [allCommands, query]);

  return {
    isOpen,
    query,
    setQuery,
    open,
    close,
    toggle,
    commands: filteredCommands,
    executeCommand: (command: Command) => command.action(),
  };
};
