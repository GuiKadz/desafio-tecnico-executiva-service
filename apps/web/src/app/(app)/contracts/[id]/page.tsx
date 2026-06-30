'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import { HistoryTimeline } from '@/components/contracts/history-timeline';
import type { ContractDetail, ContractStatus } from '@/lib/types';

const STATUS_LABEL: Record<ContractStatus, string> = {
  DRAFT: 'Rascunho',
  ACTIVE: 'Ativo',
  CLOSED: 'Encerrado',
};

const STATUS_VARIANT: Record<ContractStatus, 'secondary' | 'default' | 'outline'> = {
  DRAFT: 'secondary',
  ACTIVE: 'default',
  CLOSED: 'outline',
};

const NEXT_STATUS: Record<ContractStatus, ContractStatus | null> = {
  DRAFT: 'ACTIVE',
  ACTIVE: 'CLOSED',
  CLOSED: null,
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR');
}

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [values, setValues] = useState<Record<string, string>>({});
  const [isSavingFields, setIsSavingFields] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  const load = useCallback(() => {
    setIsLoading(true);
    api.contracts
      .get(id)
      .then((data) => {
        setContract(data);
        setValues(Object.fromEntries(data.values.map((v) => [v.fieldName, v.value])));
      })
      .catch((error) => {
        const message = error instanceof ApiError ? error.message : 'Falha ao carregar contrato';
        toast.error('Erro ao carregar contrato', { description: message });
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function handleSaveFields(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!contract) return;

    setIsSavingFields(true);
    try {
      await api.contracts.updateFields(contract.id, {
        values: Object.entries(values).map(([fieldName, value]) => ({
          fieldName,
          value,
        })),
      });
      toast.success('Campos atualizados');
      load();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Falha ao salvar campos';
      toast.error('Erro ao salvar campos', { description: message });
    } finally {
      setIsSavingFields(false);
    }
  }

  async function handleAdvanceStatus() {
    if (!contract) return;
    const next = NEXT_STATUS[contract.status];
    if (!next) return;

    if (!window.confirm(`Mudar status para "${STATUS_LABEL[next]}"?`)) return;

    setIsChangingStatus(true);
    try {
      await api.contracts.updateStatus(contract.id, next);
      toast.success(`Status alterado para ${STATUS_LABEL[next]}`);
      load();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Falha ao mudar status';
      toast.error('Erro ao mudar status', { description: message });
    } finally {
      setIsChangingStatus(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 max-w-2xl">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!contract) {
    return <p className="text-muted-foreground text-sm">Contrato não encontrado.</p>;
  }

  const isDraft = contract.status === 'DRAFT';
  const nextStatus = NEXT_STATUS[contract.status];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/contracts">
            <ArrowLeft />
            Voltar
          </Link>
        </Button>

        <div className="flex flex-wrap items-center gap-3 mt-1">
          <h1 className="text-2xl font-semibold tracking-tight">Contrato</h1>
          <Badge variant={STATUS_VARIANT[contract.status]}>{STATUS_LABEL[contract.status]}</Badge>
        </div>
        <p className="text-muted-foreground text-sm">
          Criado em {formatDateTime(contract.createdAt)} · template v{contract.template.version}
        </p>
      </div>

      {isAdmin && nextStatus && (
        <div>
          <Button onClick={handleAdvanceStatus} disabled={isChangingStatus}>
            {isChangingStatus && <Loader2 className="animate-spin" />}
            Avançar para {STATUS_LABEL[nextStatus]}
          </Button>
        </div>
      )}

      <Tabs defaultValue="values">
        <TabsList>
          <TabsTrigger value="values">Valores</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="values">
          <Card className="max-w-xl">
            <form onSubmit={handleSaveFields}>
              <CardContent className="flex flex-col gap-4 pt-6">
                {contract.template.fields
                  .sort((a, b) => a.order - b.order)
                  .map((field) => (
                    <div key={field.id} className="flex flex-col gap-2">
                      <Label htmlFor={field.id}>
                        {field.name}
                        {field.required && <span className="text-destructive"> *</span>}
                      </Label>

                      {!isAdmin || !isDraft ? (
                        <p className="text-sm py-2">
                          {values[field.name] || <span className="text-muted-foreground">—</span>}
                        </p>
                      ) : field.type === 'BOOLEAN' ? (
                        <Select
                          value={values[field.name] ?? ''}
                          onValueChange={(value) =>
                            setValues((c) => ({ ...c, [field.name]: value }))
                          }
                        >
                          <SelectTrigger id={field.id}>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">Sim</SelectItem>
                            <SelectItem value="false">Não</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          id={field.id}
                          type={
                            field.type === 'NUMBER'
                              ? 'number'
                              : field.type === 'DATE'
                                ? 'date'
                                : 'text'
                          }
                          value={values[field.name] ?? ''}
                          onChange={(e) =>
                            setValues((c) => ({ ...c, [field.name]: e.target.value }))
                          }
                        />
                      )}
                    </div>
                  ))}
              </CardContent>

              {isAdmin && isDraft && (
                <CardFooter>
                  <Button type="submit" disabled={isSavingFields}>
                    {isSavingFields && <Loader2 className="animate-spin" />}
                    Salvar alterações
                  </Button>
                </CardFooter>
              )}
            </form>

            {isAdmin && !isDraft && (
              <CardFooter>
                <p className="text-xs text-muted-foreground">
                  Só é possível editar campos enquanto o contrato está em Rascunho.
                </p>
              </CardFooter>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico de alterações</CardTitle>
            </CardHeader>
            <CardContent>
              <HistoryTimeline entries={contract.history} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
