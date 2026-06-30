'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { CommandItem } from './types';

const RECENT_STORAGE_KEY = 'command-palette:recent';
const MAX_RECENT = 5;

interface CommandContextType {
  open: boolean;
  commands: CommandItem[];
  recentIds: string[];
  setOpen(open: boolean): void;
  openPalette(): void;
  closePalette(): void;
  togglePalette(): void;
  register(command: CommandItem): void;
  unregister(id: string): void;
  runCommand(command: CommandItem): void;
}

const CommandContext = createContext<CommandContextType | null>(null);

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [commands, setCommands] = useState<CommandItem[]>([]);

  const [recentIds, setRecentIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];

    try {
      const stored = window.localStorage.getItem(RECENT_STORAGE_KEY);
      return stored ? (JSON.parse(stored) as string[]) : [];
    } catch {
      return [];
    }
  });

  const register = useCallback((command: CommandItem) => {
    setCommands((old) => {
      const exists = old.find((c) => c.id === command.id);
      if (exists) return old.map((c) => (c.id === command.id ? command : c));
      return [...old, command];
    });
  }, []);

  const unregister = useCallback((id: string) => {
    setCommands((old) => old.filter((c) => c.id !== id));
  }, []);

  const openPalette = useCallback(() => setOpen(true), []);
  const closePalette = useCallback(() => setOpen(false), []);
  const togglePalette = useCallback(() => setOpen((v) => !v), []);

  const runCommand = useCallback((command: CommandItem) => {
    setOpen(false);

    setRecentIds((old) => {
      const next = [command.id, ...old.filter((id) => id !== command.id)].slice(0, MAX_RECENT);

      try {
        window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next));
      } catch {}

      return next;
    });

    requestAnimationFrame(() => command.action());
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const cmd = e.metaKey || e.ctrlKey;

      if (cmd && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        togglePalette();
      }

      if (e.key === 'Escape') {
        closePalette();
      }
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePalette, closePalette]);

  const value = useMemo(
    () => ({
      open,
      commands,
      recentIds,
      register,
      unregister,
      runCommand,
      setOpen,
      openPalette,
      closePalette,
      togglePalette,
    }),
    [
      open,
      commands,
      recentIds,
      register,
      unregister,
      runCommand,
      openPalette,
      closePalette,
      togglePalette,
    ],
  );

  return <CommandContext.Provider value={value}>{children}</CommandContext.Provider>;
}

export function useCommandPalette() {
  const context = useContext(CommandContext);

  if (!context) {
    throw new Error('useCommandPalette must be used inside CommandPaletteProvider');
  }

  return context;
}
