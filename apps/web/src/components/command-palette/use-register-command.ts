'use client';

import { useEffect } from 'react';
import { useCommandPalette } from './provider';
import type { CommandItem } from './types';

export function useRegisterCommand(command: CommandItem) {
  const { register, unregister } = useCommandPalette();

  useEffect(() => {
    register(command);

    return () => unregister(command.id);
  }, [command, register, unregister]);
}
