'use client';

import { useEffect } from 'react';

import { useCommandPalette } from './provider';

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  const tag = target.tagName;

  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}
export default function CommandBootstrap() {
  const { open, commands, openPalette } = useCommandPalette();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (open) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isEditableTarget(e.target)) return;

      if (e.key === '/') {
        e.preventDefault();
        openPalette();
        return;
      }

      const key = e.key.toUpperCase();

      const command = commands.find(
        (c) => c.shortcut?.length === 1 && c.shortcut[0].toUpperCase() === key,
      );

      if (command) {
        e.preventDefault();
        command.action();
      }
    }

    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);
  }, [open, commands, openPalette]);

  return null;
}
