import { getStoredSettings } from '../hooks/useSettings';

/**
 * Get the n8n instance URL from settings or environment variables
 * Can be called with settings object or without (will use stored settings)
 */
export const getN8nUrl = (settings?: { n8nUrl: string }): string => {
  const resolvedSettings = settings || getStoredSettings();
  return resolvedSettings.n8nUrl || import.meta.env.VITE_N8N_URL || '';
};

/**
 * Copy text to clipboard and return success status
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

/**
 * Export data to CSV file
 */
export const exportToCSV = (data: Record<string, unknown>[], filename: string): void => {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers
        .map(header => {
          const value = row[header];
          const stringValue = value === null || value === undefined ? '' : String(value);
          // Escape quotes and wrap in quotes if contains comma or quote
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        })
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};
