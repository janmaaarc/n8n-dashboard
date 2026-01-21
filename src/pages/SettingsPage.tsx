import React, { useState, useEffect } from 'react';
import { Server, Key, Clock, RotateCw, CheckCircle, XCircle, Loader2, Bell, Save } from 'lucide-react';
import { PageHeader } from '../components/layout';
import { n8nApi } from '../services/n8n';
import { useSettings, type Settings } from '../hooks/useSettings';
import { getNotificationSettings, saveNotificationSettings, useNotifications } from '../hooks/useNotifications';
import { useCredentials } from '../hooks/useCredentials';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { useToast } from '../components/Toast';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings, resetSettings } = useSettings();
  const toast = useToast();

  const [formData, setFormData] = useState<Settings>(settings);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [notificationSettings, setNotificationSettings] = useState(getNotificationSettings);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { permission, requestPermission, isSupported } = useNotifications();
  const { isAuthenticated } = useAuth();
  const { credentials, saveCredentials, loading: credentialsLoading } = useCredentials();

  const useSupabaseCredentials = isSupabaseConfigured() && isAuthenticated;

  useEffect(() => {
    if (useSupabaseCredentials && credentials) {
      setFormData((prev) => ({
        ...prev,
        n8nUrl: credentials.n8nUrl || prev.n8nUrl,
        apiKey: credentials.hasApiKey ? '••••••••' : '',
      }));
    } else {
      setFormData(settings);
    }
    setConnectionStatus('idle');
    setNotificationSettings(getNotificationSettings());
    setSaveError(null);
  }, [settings, credentials, useSupabaseCredentials]);

  const handleChange = (field: keyof Settings, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setConnectionStatus('idle');
  };

  const handleNotificationChange = async (field: 'enabled' | 'onError' | 'onSuccess', value: boolean) => {
    if (field === 'enabled' && value && permission !== 'granted') {
      const result = await requestPermission();
      if (result !== 'granted') {
        return;
      }
    }

    const newSettings = { ...notificationSettings, [field]: value };
    setNotificationSettings(newSettings);
    saveNotificationSettings(newSettings);
  };

  const handleTestConnection = async () => {
    setConnectionStatus('testing');
    updateSettings(formData);
    await new Promise((resolve) => setTimeout(resolve, 100));
    const success = await n8nApi.testConnection();
    setConnectionStatus(success ? 'success' : 'error');
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);

    try {
      if (useSupabaseCredentials) {
        if (formData.apiKey && formData.apiKey !== '••••••••') {
          const success = await saveCredentials(formData.n8nUrl, formData.apiKey);
          if (!success) {
            setSaveError('Failed to save credentials');
            return;
          }
        } else if (formData.n8nUrl !== credentials?.n8nUrl) {
          setSaveError('Please enter your API key to save changes');
          return;
        }
        updateSettings({ refreshInterval: formData.refreshInterval, autoRefresh: formData.autoRefresh });
      } else {
        updateSettings(formData);
      }
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    resetSettings();
    toast.info('Settings reset to defaults');
  };

  return (
    <>
      <PageHeader
        title="Settings"
        description="Configure your n8n connection and preferences"
        actions={
          <button
            onClick={handleSave}
            disabled={saving || credentialsLoading}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        }
      />

      <div className="max-w-2xl space-y-6">
        {/* Connection Section */}
        <section className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-6">
          <h3 className="text-sm font-medium text-neutral-900 dark:text-white mb-4">
            Connection
          </h3>
          <div className="space-y-4">
            {/* n8n URL */}
            <div>
              <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300 mb-2">
                <Server size={14} className="text-neutral-400" />
                n8n Instance URL
              </label>
              <input
                type="url"
                value={formData.n8nUrl}
                onChange={(e) => handleChange('n8nUrl', e.target.value)}
                placeholder="https://your-n8n.example.com"
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* API Key */}
            <div>
              <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300 mb-2">
                <Key size={14} className="text-neutral-400" />
                API Key
              </label>
              <input
                type="password"
                value={formData.apiKey}
                onChange={(e) => handleChange('apiKey', e.target.value)}
                onFocus={() => {
                  if (formData.apiKey === '••••••••') {
                    setFormData((prev) => ({ ...prev, apiKey: '' }));
                  }
                }}
                placeholder={useSupabaseCredentials && credentials?.hasApiKey ? 'Enter new API key to update' : 'Your n8n API key'}
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
              />
              {useSupabaseCredentials && credentials?.hasApiKey && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  API key is securely stored. Enter a new key only to update it.
                </p>
              )}
            </div>

            {/* Test Connection */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleTestConnection}
                disabled={connectionStatus === 'testing'}
                className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
              >
                {connectionStatus === 'testing' ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : connectionStatus === 'success' ? (
                  <CheckCircle size={14} className="text-emerald-500" />
                ) : connectionStatus === 'error' ? (
                  <XCircle size={14} className="text-red-500" />
                ) : (
                  <Server size={14} className="text-neutral-400" />
                )}
                Test Connection
              </button>
              {connectionStatus === 'success' && (
                <span className="text-sm text-emerald-600 dark:text-emerald-500">Connected!</span>
              )}
              {connectionStatus === 'error' && (
                <span className="text-sm text-red-600 dark:text-red-500">Connection failed</span>
              )}
            </div>
          </div>
        </section>

        {/* Preferences Section */}
        <section className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-6">
          <h3 className="text-sm font-medium text-neutral-900 dark:text-white mb-4">
            Preferences
          </h3>
          <div className="space-y-4">
            {/* Auto Refresh */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                <RotateCw size={14} className="text-neutral-400" />
                Auto-refresh data
              </label>
              <button
                type="button"
                onClick={() => handleChange('autoRefresh', !formData.autoRefresh)}
                className={`relative w-10 h-6 rounded-full transition-colors ${
                  formData.autoRefresh
                    ? 'bg-indigo-500'
                    : 'bg-neutral-200 dark:bg-neutral-700'
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                    formData.autoRefresh ? 'left-5' : 'left-1'
                  }`}
                />
              </button>
            </div>

            {/* Refresh Interval */}
            {formData.autoRefresh && (
              <div>
                <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300 mb-2">
                  <Clock size={14} className="text-neutral-400" />
                  Refresh interval
                </label>
                <select
                  value={formData.refreshInterval}
                  onChange={(e) => handleChange('refreshInterval', Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value={10}>10 seconds</option>
                  <option value={30}>30 seconds</option>
                  <option value={60}>1 minute</option>
                  <option value={300}>5 minutes</option>
                </select>
              </div>
            )}
          </div>
        </section>

        {/* Notifications Section */}
        {isSupported && (
          <section className="bg-white dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800 p-6">
            <h3 className="text-sm font-medium text-neutral-900 dark:text-white mb-4">
              Notifications
            </h3>
            <div className="space-y-4">
              {/* Enable Notifications */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                  <Bell size={14} className="text-neutral-400" />
                  Enable browser notifications
                </label>
                <button
                  type="button"
                  onClick={() => handleNotificationChange('enabled', !notificationSettings.enabled)}
                  className={`relative w-10 h-6 rounded-full transition-colors ${
                    notificationSettings.enabled
                      ? 'bg-indigo-500'
                      : 'bg-neutral-200 dark:bg-neutral-700'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      notificationSettings.enabled ? 'left-5' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {permission === 'denied' && (
                <p className="text-xs text-amber-600 dark:text-amber-500">
                  Notifications are blocked. Enable them in your browser settings.
                </p>
              )}

              {/* Notification Types */}
              {notificationSettings.enabled && (
                <div className="pl-6 space-y-3 border-l-2 border-neutral-200 dark:border-neutral-700">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">
                      On execution errors
                    </span>
                    <button
                      type="button"
                      onClick={() => handleNotificationChange('onError', !notificationSettings.onError)}
                      className={`relative w-10 h-6 rounded-full transition-colors ${
                        notificationSettings.onError
                          ? 'bg-indigo-500'
                          : 'bg-neutral-200 dark:bg-neutral-700'
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                          notificationSettings.onError ? 'left-5' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">
                      On execution success
                    </span>
                    <button
                      type="button"
                      onClick={() => handleNotificationChange('onSuccess', !notificationSettings.onSuccess)}
                      className={`relative w-10 h-6 rounded-full transition-colors ${
                        notificationSettings.onSuccess
                          ? 'bg-indigo-500'
                          : 'bg-neutral-200 dark:bg-neutral-700'
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                          notificationSettings.onSuccess ? 'left-5' : 'left-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Error Message */}
        {saveError && (
          <div className="p-4 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
            <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>
          </div>
        )}

        {/* Danger Zone */}
        <section className="bg-white dark:bg-neutral-900 rounded-lg border border-red-200 dark:border-red-500/20 p-6">
          <h3 className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">
            Danger Zone
          </h3>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
            Reset all settings to their default values.
          </p>
          <button
            onClick={handleReset}
            disabled={saving}
            className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50"
          >
            Reset to Defaults
          </button>
        </section>
      </div>
    </>
  );
};
