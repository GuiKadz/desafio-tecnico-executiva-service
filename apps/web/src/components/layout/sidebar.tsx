'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, LayoutDashboard, LayoutTemplate, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/contracts', label: 'Contratos', icon: FileText },
  { href: '/template', label: 'Template', icon: LayoutTemplate },
  { href: '/settings', label: 'Configurações', icon: Settings },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 border-r-2 border-border bg-card md:flex md:flex-col">
      <div className="flex h-16 items-center gap-3 border-b-2 border-border px-4">
        <div className="flex size-9 items-center justify-center rounded-md border-2 border-border bg-accent text-sm font-black">
          ES
        </div>
        <span className="text-sm font-black uppercase tracking-tight">Executiva Service</span>
      </div>

      <nav className="flex flex-1 flex-col gap-2.5 p-4">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 rounded-md border-2 px-3 py-2.5 text-sm font-bold transition-all',
                isActive
                  ? 'border-border bg-primary text-primary-foreground shadow-[var(--shadow-brutal-sm)]'
                  : 'border-transparent text-muted-foreground hover:-translate-x-0.5 hover:-translate-y-0.5 hover:border-border hover:bg-background hover:text-foreground hover:shadow-[var(--shadow-brutal-sm)]',
              )}
            >
              <Icon className="size-4 shrink-0" strokeWidth={2.5} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t-2 border-border p-4">
        <div className="rounded-md border-2 border-border bg-accent/40 px-3 py-2 font-mono text-[11px] font-bold">
          v1.0 — PRODUÇÃO
        </div>
      </div>
    </aside>
  );
}
