'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import type { ContractTemplate } from '@/lib/types';

export default function NewContractPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isViewer = user?.role === 'VIEWER';

  const [template, setTemplate] = useState<ContractTemplate | null>(null);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(true);
  const [values, setValues] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isViewer) return;

    api.templates
      .active()
      .then((t) => setTemplate(t))
      .catch((error) => {
        const message = error instanceof ApiError ? error.message : 'Falha ao carregar template';
        toast.error('Erro ao carregar template', { description: message });
      })
      .finally(() => setIsLoadingTemplate(false));
  }, [isViewer]);

  function setFieldValue(fieldName: string, value: string) {
    setValues((current) => ({ ...current, [fieldName]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!template) return;

    setIsSubmitting(true);
    try {
      const payloadValues = template.fields
        .filter((field) => values[field.name] !== undefined && values[field.name] !== '')
        .map((field) => ({ fieldName: field.name, value: values[field.name] }));

      const contract = await api.contracts.create({ values: payloadValues });
      toast.success('Contrato criado em Rascunho');
      router.push(`/contracts/${contract.id}`);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Falha ao criar contrato';
      toast.error('Erro ao criar contrato', { description: message });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isViewer) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link href="/contracts">
              <ArrowLeft />
              Voltar
            </Link>
          </Button>
        </div>
        <div className="brutal-block flex max-w-md flex-col items-center gap-4 bg-card p-8 text-center">
          <div className="flex size-12 items-center justify-center rounded-md border-2 border-border bg-destructive/10">
            <ShieldX className="size-6 text-destructive" strokeWidth={2} />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight">Acesso restrito</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Usuários com perfil <span className="font-bold">Viewer</span> não podem criar
              contratos. Entre em contato com um administrador.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/contracts">Ver contratos existentes</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/contracts">
            <ArrowLeft />
            Voltar
          </Link>
        </Button>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Novo contrato</h1>
        <p className="text-sm text-muted-foreground">
          Preenchido a partir do template ativo do tenant
        </p>
      </div>

      <Card className="max-w-xl">
        {isLoadingTemplate ? (
          <CardContent className="flex flex-col gap-4 pt-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        ) : !template ? (
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Este tenant ainda não tem um template de contrato configurado. Configure em{' '}
              <Link href="/template" className="underline underline-offset-4">
                Template
              </Link>
              .
            </p>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle className="text-base">Dados do contrato</CardTitle>
              <CardDescription>
                Campos obrigatórios precisam ser preenchidos antes de salvar.
              </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col gap-4">
              {template.fields
                .sort((a, b) => a.order - b.order)
                .map((field) => (
                  <div key={field.id} className="flex flex-col gap-2">
                    <Label htmlFor={field.id}>
                      {field.name}
                      {field.required && <span className="text-destructive"> *</span>}
                    </Label>

                    {field.type === 'BOOLEAN' ? (
                      <Select
                        value={values[field.name] ?? ''}
                        onValueChange={(value) => setFieldValue(field.name, value)}
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
                        required={field.required}
                        value={values[field.name] ?? ''}
                        onChange={(e) => setFieldValue(field.name, e.target.value)}
                      />
                    )}
                  </div>
                ))}
            </CardContent>

            <CardFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="animate-spin" />}
                Criar contrato
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
