'use client';

import { LogOut, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { useCommandPalette } from '@/components/command-palette';

const ROLE_LABEL: Record<'ADMIN' | 'VIEWER', string> = {
  ADMIN: 'Admin',
  VIEWER: 'Viewer',
};

export function Topbar() {
  const { user, logout } = useAuth();
  const { openPalette } = useCommandPalette();

  return (
    <header className="flex h-16 items-center justify-between border-b-2 border-border bg-card px-4 md:px-6">
      <span className="text-sm font-black uppercase md:hidden">Executiva Service</span>

      <button
        type="button"
        onClick={() => openPalette()}
        className="hidden items-center gap-2 rounded-md border-2 border-border bg-background px-3 py-1.5 text-sm text-muted-foreground transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[var(--shadow-brutal-sm)] md:flex"
      >
        <Search className="size-4" strokeWidth={2.5} />
        <span className="font-medium">Buscar...</span>
        <kbd className="ml-2 rounded border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          /
        </kbd>
      </button>

      <div className="flex items-center gap-3">
        {user && (
          <div className="flex items-center gap-2 rounded-md border-2 border-border bg-background px-3 py-1.5 text-sm">
            <span className="hidden font-mono text-xs text-muted-foreground sm:inline">
              {user.email}
            </span>
            <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
              {ROLE_LABEL[user.role]}
            </Badge>
          </div>
        )}

        <Button variant="outline" size="sm" onClick={logout}>
          <LogOut className="size-4" />
          Sair
        </Button>
      </div>
    </header>
  );
}
