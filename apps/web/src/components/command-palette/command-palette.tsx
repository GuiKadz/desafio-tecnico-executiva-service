'use client';

import { useMemo, useState } from 'react';
import { Command } from 'cmdk';
import { History, Search, SearchX } from 'lucide-react';

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

import { useCommandPalette } from './provider';
import type { CommandItem } from './types';

const RECENT_GROUP = 'Recentes';

const GROUP_ORDER = [RECENT_GROUP, 'Navegação', 'Ações', 'Sistema'];

export function CommandPalette() {
  const { open, setOpen, commands, recentIds, runCommand } = useCommandPalette();

  const [search, setSearch] = useState('');

  const groups = useMemo(() => {
    const map = new Map<string, CommandItem[]>();

    if (search.trim().length === 0 && recentIds.length > 0) {
      const recents = recentIds
        .map((id) => commands.find((c) => c.id === id))
        .filter((c): c is CommandItem => Boolean(c));

      if (recents.length > 0) {
        map.set(RECENT_GROUP, recents);
      }
    }

    commands.forEach((command) => {
      if (!map.has(command.group)) {
        map.set(command.group, []);
      }

      map.get(command.group)!.push(command);
    });

    return [...map.entries()].sort(([a], [b]) => {
      const indexA = GROUP_ORDER.indexOf(a);
      const indexB = GROUP_ORDER.indexOf(b);

      if (indexA === -1 && indexB === -1) return a.localeCompare(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;

      return indexA - indexB;
    });
  }, [commands, recentIds, search]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setSearch('');
      }}
    >
      <DialogContent
        className="
          top-[18%]
          translate-y-0
          overflow-hidden
          border-4
          border-black
          p-0
          shadow-[10px_10px_0px_0px_#000]
          sm:max-w-2xl
        "
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Paleta de comandos</DialogTitle>
        <DialogDescription className="sr-only">
          Busque páginas e execute ações rapidamente
        </DialogDescription>

        <Command className="bg-background" loop shouldFilter>
          <div className="flex items-center gap-3 border-b-2 border-border px-4">
            <Search className="size-5 shrink-0 text-muted-foreground" strokeWidth={2.5} />

            <Command.Input
              autoFocus
              value={search}
              onValueChange={setSearch}
              placeholder="Buscar contratos, páginas, ações..."
              className="
                h-14
                w-full
                bg-transparent
                text-sm
                outline-none
                placeholder:text-muted-foreground
              "
            />

            <kbd
              className="
                hidden
                shrink-0
                rounded
                border-2
                border-border
                bg-muted
                px-1.5
                py-0.5
                font-mono
                text-[10px]
                font-semibold
                text-muted-foreground
                sm:inline-block
              "
            >
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-[420px] overflow-y-auto p-2">
            <Command.Empty className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
              <SearchX className="size-6" strokeWidth={2} />
              Nenhum resultado para &ldquo;{search}&rdquo;.
            </Command.Empty>

            {groups.map(([group, items]) => (
              <Command.Group
                key={group}
                heading={group}
                className="
                  mb-2
                  [&_[cmdk-group-heading]]:px-2
                  [&_[cmdk-group-heading]]:py-1.5
                  [&_[cmdk-group-heading]]:text-[11px]
                  [&_[cmdk-group-heading]]:font-bold
                  [&_[cmdk-group-heading]]:uppercase
                  [&_[cmdk-group-heading]]:tracking-wide
                  [&_[cmdk-group-heading]]:text-muted-foreground
                "
              >
                {items.map((item) => (
                  <Command.Item
                    key={`${group}-${item.id}`}
                    value={[item.title, item.subtitle, group, ...(item.keywords ?? [])]
                      .filter(Boolean)
                      .join(' ')}
                    onSelect={() => runCommand(item)}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-md border-2 border-transparent px-3 py-2.5 transition-all',
                      'data-[selected=true]:border-black data-[selected=true]:bg-black data-[selected=true]:text-white',
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-8 shrink-0 items-center justify-center rounded-md border-2 border-border bg-muted text-foreground transition-colors',
                        'group-data-[selected=true]:border-white/30',
                      )}
                    >
                      {group === RECENT_GROUP ? (
                        <History className="size-4" />
                      ) : (
                        (item.icon ?? <Search className="size-4" />)
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold leading-tight">{item.title}</p>

                      {item.subtitle && (
                        <p className="truncate text-xs opacity-70">{item.subtitle}</p>
                      )}
                    </div>

                    {item.shortcut && (
                      <div className="flex shrink-0 gap-1">
                        {item.shortcut.map((key) => (
                          <kbd
                            key={key}
                            className="
                              rounded
                              border
                              border-current/30
                              px-1.5
                              py-0.5
                              font-mono
                              text-[10px]
                              opacity-70
                            "
                          >
                            {key}
                          </kbd>
                        ))}
                      </div>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>

          <div className="flex justify-between border-t-2 border-border bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
            <div className="flex gap-4">
              <span className="flex items-center gap-1">
                <kbd className="rounded border px-1 py-0.5 font-mono text-[10px]">↑↓</kbd>
                Navegar
              </span>

              <span className="flex items-center gap-1">
                <kbd className="rounded border px-1 py-0.5 font-mono text-[10px]">↵</kbd>
                Abrir
              </span>

              <span className="flex items-center gap-1">
                <kbd className="rounded border px-1 py-0.5 font-mono text-[10px]">Esc</kbd>
                Fechar
              </span>
            </div>

            <span className="flex items-center gap-1">
              <kbd className="rounded border px-1 py-0.5 font-mono text-[10px]">⌘K</kbd>
              Abrir
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
