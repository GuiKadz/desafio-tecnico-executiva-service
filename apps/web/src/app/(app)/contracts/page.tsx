'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Plus, Search, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { ContractTable } from '@/components/contracts/contract-table';
import type { Contract, ContractStatus, ContractTemplate } from '@/lib/types';

const ALL_STATUS = 'ALL' as const;

export default function ContractsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [template, setTemplate] = useState<ContractTemplate | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<ContractStatus | typeof ALL_STATUS>(ALL_STATUS);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchFieldName, setSearchFieldName] = useState<string>('');
  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    api.templates
      .active()
      .catch(() => null)
      .then((t) => setTemplate(t ?? null));
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await Promise.resolve();
      if (cancelled) return;

      setIsLoading(true);

      try {
        const result = await api.contracts.list({
          page,
          status: status === ALL_STATUS ? undefined : status,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          fieldName: searchFieldName || undefined,
          fieldValue: searchFieldName ? searchValue || undefined : undefined,
        });

        if (cancelled) return;

        setContracts(result.data);
        setMeta(result.meta);
      } catch (error) {
        const message = error instanceof ApiError ? error.message : 'Falha ao carregar contratos';
        toast.error('Erro ao carregar contratos', { description: message });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
     
  }, [page, status, dateFrom, dateTo, searchFieldName, searchValue]);

  function handleFilterChange<T>(setter: (value: T) => void) {
    return (value: T) => {
      setPage(1);
      setter(value);
    };
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Contratos</h1>
          <p className="font-mono text-sm text-muted-foreground">
            {meta.total} registro{meta.total === 1 ? '' : 's'}
          </p>
        </div>

        {isAdmin && (
          <Button variant="accent" asChild disabled={!template}>
            <Link href="/contracts/new">
              <Plus />
              Novo contrato
            </Link>
          </Button>
        )}
      </div>

      <Card size="sm">
        <CardHeader className="flex flex-row items-center gap-2 space-y-0">
          <div className="flex size-7 items-center justify-center rounded-md border-2 border-border bg-accent">
            <SlidersHorizontal className="size-3.5" strokeWidth={2.5} />
          </div>
          <CardTitle className="text-sm font-black uppercase tracking-wide">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Status
              </span>
              <Select
                value={status}
                onValueChange={handleFilterChange((v) => setStatus(v as typeof status))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_STATUS}>Todos</SelectItem>
                  <SelectItem value="DRAFT">Rascunho</SelectItem>
                  <SelectItem value="ACTIVE">Ativo</SelectItem>
                  <SelectItem value="CLOSED">Encerrado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Criado a partir de
              </span>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => handleFilterChange(setDateFrom)(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Criado até
              </span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => handleFilterChange(setDateTo)(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Buscar por campo
              </span>
              <Select
                value={searchFieldName || 'NONE'}
                onValueChange={handleFilterChange((v) => setSearchFieldName(v === 'NONE' ? '' : v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um campo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Nenhum</SelectItem>
                  {template?.fields.map((field) => (
                    <SelectItem key={field.id} value={field.name}>
                      {field.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {searchFieldName && (
            <div className="flex flex-col gap-2 sm:max-w-xs">
              <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Valor de &quot;{searchFieldName}&quot;
              </span>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="ex: acme"
                  value={searchValue}
                  onChange={(e) => handleFilterChange(setSearchValue)(e.target.value)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : contracts.length === 0 ? (
            <p className="text-muted-foreground text-sm py-6 text-center">
              Nenhum contrato encontrado com os filtros atuais.
            </p>
          ) : (
            <>
              <ContractTable contracts={contracts} />

              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground">
                  Página {meta.page} de {meta.totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={meta.page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft />
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={meta.page >= meta.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Próxima
                    <ChevronRight />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
