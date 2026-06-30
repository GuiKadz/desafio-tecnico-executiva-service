'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  FileText,
  FilePlus2,
  Users,
  TrendingUp,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import type { Contract, ContractStatus, Tenant } from '@/lib/types';

const STATUS_LABEL: Record<ContractStatus, string> = {
  DRAFT: 'Rascunho',
  ACTIVE: 'Ativo',
  CLOSED: 'Encerrado',
};

const STATUS_BAR: Record<ContractStatus, string> = {
  DRAFT: 'bg-yellow-300',
  ACTIVE: 'bg-accent',
  CLOSED: 'bg-secondary',
};

const STATUS_DOT: Record<ContractStatus, string> = {
  DRAFT: 'bg-yellow-400',
  ACTIVE: 'bg-accent',
  CLOSED: 'bg-muted-foreground',
};

const STATUSES: ContractStatus[] = ['DRAFT', 'ACTIVE', 'CLOSED'];

const TIMELINE_DAYS = 14;

interface TimelinePoint {
  key: string;
  label: string;
  count: number;
}

function buildTimeline(contracts: Contract[], days: number): TimelinePoint[] {
  const buckets = new Map<string, number>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }

  for (const contract of contracts) {
    const key = contract.createdAt.slice(0, 10);
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
  }

  return Array.from(buckets.entries()).map(([key, count]) => ({
    key,
    label: new Date(`${key}T00:00:00`).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    }),
    count,
  }));
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR');
}

function formatDateRelative(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `${diffDays}d atrás`;
  return formatDate(iso);
}

function KpiBlock({
  title,
  value,
  icon: Icon,
  accent = false,
  isLoading,
  sub,
}: {
  title: string;
  value: React.ReactNode;
  icon: React.ElementType;
  accent?: boolean;
  isLoading: boolean;
  sub?: string;
}) {
  return (
    <motion.div
      whileHover={{ x: -4, y: -4 }}
      whileTap={{ x: 0, y: 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      className={`brutal-block flex flex-col gap-3 p-5 ${accent ? 'bg-accent' : 'bg-card'}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-foreground/70">
          {title}
        </span>
        <div className="flex size-9 items-center justify-center rounded-md border-2 border-border bg-background">
          <Icon className="size-4" strokeWidth={2.5} />
        </div>
      </div>
      {isLoading ? (
        <Skeleton className="h-10 w-24 rounded-md" />
      ) : (
        <p className="text-4xl font-black leading-none tracking-tight">{value}</p>
      )}
      {sub && !isLoading && <p className="text-xs font-mono text-muted-foreground">{sub}</p>}
    </motion.div>
  );
}

function TimelineChart({ data, isLoading }: { data: TimelinePoint[]; isLoading: boolean }) {
  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  const max = Math.max(1, ...data.map((p) => p.count));
  const total = data.reduce((sum, p) => sum + p.count, 0);

  if (total === 0) {
    return (
      <p className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        Nenhum contrato criado nos últimos {data.length} dias.
      </p>
    );
  }

  const chartHeight = 160;

  return (
    <div className="flex flex-col gap-2">
      <div
        className="flex items-end gap-1"
        style={{ height: chartHeight }}
        role="img"
        aria-label="Contratos criados por dia"
      >
        {data.map((point, index) => {
          const heightPct = (point.count / max) * 100;
          return (
            <div
              key={point.key}
              className="group relative flex flex-1 flex-col items-center justify-end"
              style={{ height: '100%' }}
            >
              {point.count > 0 && (
                <span className="absolute -top-5 text-[10px] font-bold text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                  {point.count}
                </span>
              )}
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(heightPct, point.count > 0 ? 6 : 2)}%` }}
                transition={{ type: 'spring', stiffness: 120, damping: 20, delay: index * 0.02 }}
                className={`w-full rounded-sm border-2 border-border ${
                  point.count > 0 ? 'bg-accent' : 'bg-background'
                }`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1">
        {data.map((point, index) => (
          <span
            key={point.key}
            className={`flex-1 text-center font-mono text-[10px] text-muted-foreground ${
              index % Math.ceil(data.length / 7) === 0 ? '' : 'invisible'
            }`}
          >
            {point.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [statusCounts, setStatusCounts] = useState<Record<ContractStatus, number> | null>(null);
  const [recentContracts, setRecentContracts] = useState<Contract[]>([]);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isViewer = user?.role === 'VIEWER';

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      api.tenants.me(),
      ...STATUSES.map((status) => api.contracts.list({ status, limit: 1 })),
      api.contracts.list({ limit: 5 }),
      api.contracts.list({ limit: 100 }),
    ])
      .then(([tenantData, draftRes, activeRes, closedRes, recentRes, timelineRes]) => {
        if (cancelled) return;
        setTenant(tenantData);
        setStatusCounts({
          DRAFT: draftRes.meta.total,
          ACTIVE: activeRes.meta.total,
          CLOSED: closedRes.meta.total,
        });
        setRecentContracts(recentRes.data);
        setTimeline(buildTimeline(timelineRes.data, TIMELINE_DAYS));
      })
      .catch((error) => {
        const message = error instanceof ApiError ? error.message : 'Falha ao carregar dashboard';
        toast.error('Erro ao carregar dashboard', { description: message });
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const totalContracts = tenant?._count.contracts ?? 0;
  const closedPct =
    statusCounts && totalContracts > 0
      ? Math.round((statusCounts.CLOSED / totalContracts) * 100)
      : 0;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  })();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          {isLoading ? (
            <Skeleton className="h-9 w-56 mb-1" />
          ) : (
            <h1 className="text-3xl font-black tracking-tight">{tenant?.name}</h1>
          )}
          <p className="font-mono text-sm text-muted-foreground">
            {greeting}, <span className="text-foreground font-bold">{user?.email}</span>
            {user?.role === 'VIEWER' && (
              <span className="ml-2 inline-flex items-center rounded border-2 border-border bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                Viewer
              </span>
            )}
          </p>
        </div>

        {!isViewer && (
          <motion.div
            whileHover={{ x: -3, y: -3 }}
            whileTap={{ x: 0, y: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
          >
            <Link
              href="/contracts/new"
              className="brutal-block flex items-center gap-2 bg-accent px-4 py-2.5 text-sm font-bold hover:bg-accent/90"
            >
              <FilePlus2 className="size-4" strokeWidth={2.5} />
              Novo contrato
            </Link>
          </motion.div>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiBlock
          title="Total de contratos"
          value={totalContracts}
          icon={FileText}
          isLoading={isLoading}
          sub={
            totalContracts === 1
              ? '1 contrato cadastrado'
              : `${totalContracts} contratos cadastrados`
          }
        />
        <KpiBlock
          title="Ativos"
          value={statusCounts?.ACTIVE ?? 0}
          icon={CheckCircle2}
          accent
          isLoading={isLoading}
          sub={
            statusCounts && totalContracts > 0
              ? `${Math.round((statusCounts.ACTIVE / totalContracts) * 100)}% do total`
              : undefined
          }
        />
        <KpiBlock
          title="Rascunhos"
          value={statusCounts?.DRAFT ?? 0}
          icon={Clock}
          isLoading={isLoading}
          sub="Aguardando ativação"
        />
        <KpiBlock
          title="Usuários"
          value={tenant?._count.users ?? 0}
          icon={Users}
          isLoading={isLoading}
          sub="Membros do workspace"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="brutal-block flex flex-col gap-4 bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wider text-foreground/70">
              Distribuição por status
            </h2>
            {!isLoading && totalContracts > 0 && (
              <span className="font-mono text-xs text-muted-foreground">
                {closedPct}% encerrados
              </span>
            )}
          </div>

          {isLoading || !statusCounts ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          ) : totalContracts === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <FileText className="size-8 text-muted-foreground/40" strokeWidth={1.5} />
              <p className="text-sm text-muted-foreground">Nenhum contrato cadastrado ainda.</p>
              {!isViewer && (
                <Link
                  href="/contracts/new"
                  className="text-xs font-bold underline underline-offset-2 hover:text-foreground"
                >
                  Criar o primeiro contrato →
                </Link>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {STATUSES.map((status) => {
                const count = statusCounts[status];
                const pct = totalContracts > 0 ? Math.round((count / totalContracts) * 100) : 0;
                return (
                  <div key={status} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <div className={`size-2 rounded-full ${STATUS_DOT[status]}`} />
                        <span>{STATUS_LABEL[status]}</span>
                      </div>
                      <span className="font-mono text-muted-foreground">
                        {count} <span className="text-muted-foreground/60">({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-sm border-2 border-border bg-background">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                        className={`h-full ${STATUS_BAR[status]}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="brutal-block flex flex-col gap-4 bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wider text-foreground/70">
              Contratos recentes
            </h2>
            <Link
              href="/contracts"
              className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground"
            >
              ver todos
              <ArrowUpRight className="size-3.5" strokeWidth={2.5} />
            </Link>
          </div>

          {isLoading ? (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : recentContracts.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <FileText className="size-8 text-muted-foreground/40" strokeWidth={1.5} />
              <p className="text-sm text-muted-foreground">Nenhum contrato cadastrado ainda.</p>
            </div>
          ) : (
            <div className="flex flex-col divide-y-2 divide-border">
              {recentContracts.map((contract) => (
                <Link
                  key={contract.id}
                  href={`/contracts/${contract.id}`}
                  className="group flex items-center gap-3 py-2.5 transition-colors hover:bg-muted/40 -mx-2 px-2 rounded-sm"
                >
                  <div className={`size-2 shrink-0 rounded-full ${STATUS_DOT[contract.status]}`} />
                  <span className="flex-1 truncate font-mono text-xs text-muted-foreground">
                    #{contract.id.slice(0, 8)}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground shrink-0">
                    {formatDateRelative(contract.createdAt)}
                  </span>
                  <Badge className={`${STATUS_BAR[contract.status]} shrink-0 text-[10px]`}>
                    {STATUS_LABEL[contract.status]}
                  </Badge>
                  <ArrowUpRight
                    className="size-3.5 shrink-0 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground"
                    strokeWidth={2.5}
                  />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="brutal-block flex flex-col gap-4 bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-wider text-foreground/70">
            Criações nos últimos {TIMELINE_DAYS} dias
          </h2>
          {!isLoading && (
            <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
              <TrendingUp className="size-3.5" strokeWidth={2.5} />
              {timeline.reduce((s, p) => s + p.count, 0)} no período
            </div>
          )}
        </div>
        <TimelineChart data={timeline} isLoading={isLoading} />
      </div>
    </div>
  );
}
