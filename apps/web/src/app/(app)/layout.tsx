'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { CommandPaletteProvider } from '@/components/command-palette';
import { CommandPalette } from '@/components/command-palette/command-palette';
import CommandBootstrap from '@/components/command-palette/command-bootstrap';
import { GlobalCommands } from '@/components/command-palette/commands';

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  return (
    <CommandPaletteProvider>
      <GlobalCommands />
      <CommandBootstrap />
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex flex-1 flex-col">
          <Topbar />
          <main className="brutal-grid-bg flex-1 overflow-y-auto bg-background p-4 md:p-6">
            {children}
          </main>
        </div>
        <CommandPalette />
      </div>
    </CommandPaletteProvider>
  );
}
