'use client';

import { motion } from 'framer-motion';
import { FilePlus2, PenLine, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ContractHistoryEntry, HistoryAction } from '@/lib/types';

const ACTION_CONFIG: Record<HistoryAction, { label: string; icon: React.ElementType; bg: string }> =
  {
    CREATED: { label: 'CRIAÇÃO', icon: FilePlus2, bg: 'bg-accent' },
    STATUS_CHANGED: { label: 'STATUS', icon: RefreshCcw, bg: 'bg-yellow-300' },
    FIELD_UPDATED: { label: 'EDIÇÃO', icon: PenLine, bg: 'bg-secondary' },
  };

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' });
}

export function HistoryTimeline({ entries }: { entries: ContractHistoryEntry[] }) {
  if (entries.length === 0) {
    return <p className="py-6 text-center font-mono text-sm text-muted-foreground"></p>;
  }

  return (
    <ol className="relative flex flex-col gap-7 pl-3">
      <div className="absolute top-2 bottom-2 left-[19px] w-1 bg-border" />

      {entries.map((entry, i) => {
        const config = ACTION_CONFIG[entry.action] ?? ACTION_CONFIG.FIELD_UPDATED;
        const Icon = config.icon;

        return (
          <motion.li
            key={entry.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 350, damping: 22, delay: i * 0.05 }}
            className="relative flex gap-4"
          >
            <span
              className={cn(
                'relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-border ring-4 ring-background',
                config.bg,
              )}
            >
              <Icon className="size-4" strokeWidth={2.5} />
            </span>

            <div className="brutal-block flex-1 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-black tracking-widest">{config.label}</span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {formatDateTime(entry.changedAt)}
                </span>
              </div>

              {entry.fieldName && (
                <p className="mt-1.5 font-mono text-xs text-muted-foreground">
                  campo: {entry.fieldName}
                </p>
              )}

              {(entry.oldValue || entry.newValue) && (
                <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-sm">
                  {entry.oldValue && (
                    <span className="rounded border-2 border-red-600 bg-red-100 px-1.5 py-0.5 text-red-700 line-through dark:bg-red-950 dark:text-red-300">
                      {entry.oldValue}
                    </span>
                  )}
                  {entry.oldValue && entry.newValue && <span className="font-bold">→</span>}
                  {entry.newValue && (
                    <span className="rounded border-2 border-emerald-600 bg-emerald-100 px-1.5 py-0.5 font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      {entry.newValue}
                    </span>
                  )}
                </div>
              )}

              <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                por <span className="font-bold">{entry.changedBy.name}</span> · id:
                {entry.id.slice(0, 8)}
              </p>
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}
