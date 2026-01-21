import { useState, useEffect, useCallback } from 'react';

export interface AlertRule {
  id: string;
  name: string;
  enabled: boolean;
  type: 'consecutive_failures' | 'error_rate' | 'execution_time';
  threshold: number;
  workflowId?: string; // If empty, applies to all workflows
  notification: {
    browser: boolean;
    webhookUrl?: string;
  };
  createdAt: string;
}

export interface AlertEvent {
  id: string;
  ruleId: string;
  ruleName: string;
  workflowId: string;
  workflowName: string;
  message: string;
  triggeredAt: string;
  acknowledged: boolean;
}

const ALERTS_STORAGE_KEY = 'n8n-dashboard-alerts';
const ALERT_EVENTS_STORAGE_KEY = 'n8n-dashboard-alert-events';

const defaultRules: AlertRule[] = [];
const defaultEvents: AlertEvent[] = [];

export const useAlerts = () => {
  const [rules, setRules] = useState<AlertRule[]>(() => {
    try {
      const stored = localStorage.getItem(ALERTS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : defaultRules;
    } catch {
      return defaultRules;
    }
  });

  const [events, setEvents] = useState<AlertEvent[]>(() => {
    try {
      const stored = localStorage.getItem(ALERT_EVENTS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : defaultEvents;
    } catch {
      return defaultEvents;
    }
  });

  // Persist rules to localStorage
  useEffect(() => {
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(rules));
  }, [rules]);

  // Persist events to localStorage
  useEffect(() => {
    localStorage.setItem(ALERT_EVENTS_STORAGE_KEY, JSON.stringify(events));
  }, [events]);

  const addRule = useCallback((rule: Omit<AlertRule, 'id' | 'createdAt'>) => {
    const newRule: AlertRule = {
      ...rule,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setRules(prev => [...prev, newRule]);
    return newRule;
  }, []);

  const updateRule = useCallback((id: string, updates: Partial<Omit<AlertRule, 'id' | 'createdAt'>>) => {
    setRules(prev => prev.map(rule =>
      rule.id === id ? { ...rule, ...updates } : rule
    ));
  }, []);

  const deleteRule = useCallback((id: string) => {
    setRules(prev => prev.filter(rule => rule.id !== id));
  }, []);

  const toggleRule = useCallback((id: string) => {
    setRules(prev => prev.map(rule =>
      rule.id === id ? { ...rule, enabled: !rule.enabled } : rule
    ));
  }, []);

  const addEvent = useCallback((event: Omit<AlertEvent, 'id' | 'triggeredAt' | 'acknowledged'>) => {
    const newEvent: AlertEvent = {
      ...event,
      id: crypto.randomUUID(),
      triggeredAt: new Date().toISOString(),
      acknowledged: false,
    };
    setEvents(prev => [newEvent, ...prev].slice(0, 100)); // Keep last 100 events
    return newEvent;
  }, []);

  const acknowledgeEvent = useCallback((id: string) => {
    setEvents(prev => prev.map(event =>
      event.id === id ? { ...event, acknowledged: true } : event
    ));
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  const unacknowledgedCount = events.filter(e => !e.acknowledged).length;

  return {
    rules,
    events,
    addRule,
    updateRule,
    deleteRule,
    toggleRule,
    addEvent,
    acknowledgeEvent,
    clearEvents,
    unacknowledgedCount,
  };
};
