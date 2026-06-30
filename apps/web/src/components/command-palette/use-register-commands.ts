'use client';

import { useEffect } from 'react';
import { useCommandPalette } from './provider';
import type { CommandItem } from './types';

export function useRegisterCommands(commands: CommandItem[]) {
  const { register, unregister } = useCommandPalette();

  useEffect(() => {
    for (const command of commands) {
      register(command);
    }

    return () => {
      for (const command of commands) {
        unregister(command.id);
      }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
