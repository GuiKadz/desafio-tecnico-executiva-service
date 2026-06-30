'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2 } from 'lucide-react';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import type { FieldType, TemplateFieldInput } from '@/lib/types';

const FIELD_TYPE_LABEL: Record<FieldType, string> = {
  TEXT: 'Texto',
  NUMBER: 'Número',
  DATE: 'Data',
  BOOLEAN: 'Booleano',
};

const FIELD_TYPES = Object.keys(FIELD_TYPE_LABEL) as FieldType[];

/** Reordena `order` de 0..n-1 sempre que a lista de campos muda. */
function reindex(fields: TemplateFieldInput[]): TemplateFieldInput[] {
  return fields.map((field, index) => ({ ...field, order: index }));
}

export default function TemplatePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [fields, setFields] = useState<TemplateFieldInput[]>([]);
  const [version, setVersion] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<FieldType>('TEXT');
  const [newFieldRequired, setNewFieldRequired] = useState('true');

  useEffect(() => {
    let cancelled = false;

    api.templates
      .active()
      .then((template) => {
        if (cancelled) return;
        if (template) {
          setFields(
            template.fields
              .sort((a, b) => a.order - b.order)
              .map(({ name, type, required, order }) => ({
                name,
                type,
                required,
                order,
              })),
          );
          setVersion(template.version);
        }
      })
      .catch((error) => {
        const message = error instanceof ApiError ? error.message : 'Falha ao carregar template';
        toast.error('Erro ao carregar template', { description: message });
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function resetDialog() {
    setNewFieldName('');
    setNewFieldType('TEXT');
    setNewFieldRequired('true');
  }

  function handleAddField() {
    if (!newFieldName.trim()) return;

    setFields((current) =>
      reindex([
        ...current,
        {
          name: newFieldName.trim(),
          type: newFieldType,
          required: newFieldRequired === 'true',
          order: current.length,
        },
      ]),
    );
    resetDialog();
    setDialogOpen(false);
  }

  function handleRemoveField(index: number) {
    setFields((current) => reindex(current.filter((_, i) => i !== index)));
  }

  function handleMoveField(index: number, direction: -1 | 1) {
    setFields((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;

      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return reindex(next);
    });
  }

  async function handleSave() {
    if (fields.length === 0) {
      toast.error('Adicione pelo menos um campo antes de salvar');
      return;
    }

    setIsSaving(true);
    try {
      const created = await api.templates.create({ fields });
      setVersion(created.version);
      toast.success(`Template salvo (versão ${created.version})`, {
        description: 'Contratos já gerados não são afetados por esta alteração.',
      });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Falha ao salvar template';
      toast.error('Erro ao salvar template', { description: message });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contrato padrão</h1>
          <p className="text-muted-foreground text-sm">
            {version ? `Versão ativa: v${version}` : 'Nenhuma versão criada ainda'}
          </p>
        </div>

        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus />
                Adicionar campo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo campo</DialogTitle>
                <DialogDescription>
                  Esse campo só entra em vigor depois que você salvar uma nova versão do template.
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col gap-4 py-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="field-name">Nome do campo</Label>
                  <Input
                    id="field-name"
                    placeholder="Nome do contratante"
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Tipo</Label>
                  <Select
                    value={newFieldType}
                    onValueChange={(value) => setNewFieldType(value as FieldType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FIELD_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {FIELD_TYPE_LABEL[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2">
                  <Label>Obrigatório?</Label>
                  <Select value={newFieldRequired} onValueChange={setNewFieldRequired}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Sim</SelectItem>
                      <SelectItem value="false">Não</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    resetDialog();
                    setDialogOpen(false);
                  }}
                >
                  Cancelar
                </Button>
                <Button onClick={handleAddField} disabled={!newFieldName.trim()}>
                  Adicionar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Campos do contrato</CardTitle>
          <CardDescription>
            {isAdmin
              ? 'Defina quais campos compõem o contrato gerado a partir deste template.'
              : 'Campos definidos pelo administrador do tenant.'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : fields.length === 0 ? (
            <p className="text-muted-foreground text-sm py-6 text-center">
              {isAdmin
                ? 'Nenhum campo definido ainda. Clique em "Adicionar campo" para começar.'
                : 'O administrador ainda não configurou o template deste tenant.'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Obrigatório</TableHead>
                  {isAdmin && <TableHead className="text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, index) => (
                  <TableRow key={`${field.name}-${index}`}>
                    <TableCell className="font-medium">{field.name}</TableCell>
                    <TableCell>{FIELD_TYPE_LABEL[field.type]}</TableCell>
                    <TableCell>
                      <Badge variant={field.required ? 'default' : 'outline'}>
                        {field.required ? 'Sim' : 'Não'}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={index === 0}
                            onClick={() => handleMoveField(index, -1)}
                          >
                            <ArrowUp />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={index === fields.length - 1}
                            onClick={() => handleMoveField(index, 1)}
                          >
                            <ArrowDown />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveField(index)}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>

        {isAdmin && (
          <CardFooter className="justify-end">
            <Button onClick={handleSave} disabled={isSaving || isLoading}>
              {isSaving && <Loader2 className="animate-spin" />}
              Salvar nova versão
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
