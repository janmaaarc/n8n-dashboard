import { useState, useEffect, useCallback } from 'react';

export type TableDensity = 'compact' | 'normal' | 'comfortable';

export interface Settings {
  n8nUrl: string;
  apiKey: string;
  refreshInterval: number;
  autoRefresh: boolean;
  tableDensity: TableDensity;
  defaultPageSize: number;
}

// Separate storage keys for sensitive vs non-sensitive data
const STORAGE_KEY = 'n8n-dashboard-settings';
const SENSITIVE_STORAGE_KEY = 'n8n-dashboard-credentials';

const defaultSettings: Settings = {
  n8nUrl: '',
  apiKey: '',
  refreshInterval: 30,
  autoRefresh: true,
  tableDensity: 'normal',
  defaultPageSize: 15,
};

// Check if we're in development mode
const isDevelopment = (): boolean => {
  return import.meta.env.DEV === true;
};

const loadSettings = (): Settings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const baseSettings = stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;

    // Only load sensitive data (API key) in development mode
    // In production, API key should come from environment variables or Supabase
    if (isDevelopment()) {
      const sensitiveStored = localStorage.getItem(SENSITIVE_STORAGE_KEY);
      if (sensitiveStored) {
        const sensitive = JSON.parse(sensitiveStored);
        return { ...baseSettings, ...sensitive };
      }
    }

    return baseSettings;
  } catch {
    return defaultSettings;
  }
};

const saveSettings = (settings: Settings): void => {
  // Save non-sensitive settings
  const { apiKey, ...nonSensitiveSettings } = settings;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nonSensitiveSettings));

  // Only save sensitive data (API key) in development mode
  // In production, API key should come from environment variables or Supabase
  if (isDevelopment() && apiKey) {
    localStorage.setItem(SENSITIVE_STORAGE_KEY, JSON.stringify({ apiKey }));
  } else if (!isDevelopment()) {
    // Remove any previously stored sensitive data in production
    localStorage.removeItem(SENSITIVE_STORAGE_KEY);
  }
};

export const useSettings = () => {
  const [settings, setSettingsState] = useState<Settings>(loadSettings);
  const [isConfigured, setIsConfigured] = useState<boolean>(false);

  useEffect(() => {
    const loaded = loadSettings();
    setSettingsState(loaded);
    // In production, we're configured if we have a URL (API key comes from server)
    // In development, we need both URL and API key
    if (isDevelopment()) {
      setIsConfigured(Boolean(loaded.n8nUrl && loaded.apiKey));
    } else {
      setIsConfigured(Boolean(loaded.n8nUrl));
    }
  }, []);

  const updateSettings = useCallback((newSettings: Partial<Settings>) => {
    setSettingsState((prev) => {
      const updated = { ...prev, ...newSettings };
      saveSettings(updated);
      if (isDevelopment()) {
        setIsConfigured(Boolean(updated.n8nUrl && updated.apiKey));
      } else {
        setIsConfigured(Boolean(updated.n8nUrl));
      }
      return updated;
    });
  }, []);

  const resetSettings = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SENSITIVE_STORAGE_KEY);
    setSettingsState(defaultSettings);
    setIsConfigured(false);
  }, []);

  return {
    settings,
    isConfigured,
    updateSettings,
    resetSettings,
  };
};

export const getStoredSettings = (): Settings => loadSettings();
