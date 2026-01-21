import { useEffect, useCallback } from 'react';

interface ShortcutHandlers {
  onRefresh?: () => void;
  onSearch?: () => void;
  onSettings?: () => void;
  onHelp?: () => void;
  onEscape?: () => void;
  onToggleTheme?: () => void;
  onCommandPalette?: () => void;
}

export const useKeyboardShortcuts = (handlers: ShortcutHandlers) => {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Handle Cmd+K for command palette (works even in inputs)
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        handlers.onCommandPalette?.();
        return;
      }

      // Ignore if user is typing in an input
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        if (event.key === 'Escape' && handlers.onEscape) {
          handlers.onEscape();
        }
        return;
      }

      // Single key shortcuts
      switch (event.key.toLowerCase()) {
        case 'r':
          if (!event.metaKey && !event.ctrlKey) {
            event.preventDefault();
            handlers.onRefresh?.();
          }
          break;
        case '/':
          event.preventDefault();
          handlers.onSearch?.();
          break;
        case ',':
          event.preventDefault();
          handlers.onSettings?.();
          break;
        case '?':
          event.preventDefault();
          handlers.onHelp?.();
          break;
        case 'escape':
          handlers.onEscape?.();
          break;
        case 'd':
          if (!event.metaKey && !event.ctrlKey) {
            event.preventDefault();
            handlers.onToggleTheme?.();
          }
          break;
      }
    },
    [handlers]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};

export const shortcuts = [
  { key: '⌘K', description: 'Command palette' },
  { key: 'R', description: 'Refresh data' },
  { key: '/', description: 'Focus search' },
  { key: ',', description: 'Open settings' },
  { key: 'D', description: 'Toggle dark mode' },
  { key: '?', description: 'Show shortcuts' },
  { key: 'Esc', description: 'Close modal' },
];
