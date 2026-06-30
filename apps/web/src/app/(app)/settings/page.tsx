'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Building2,
  FileSliders,
  KeyRound,
  Loader2,
  Plus,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
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
import { useAuth } from '@/lib/auth-context';
import { api, ApiError } from '@/lib/api';
import type { Role, Tenant, UserSummary } from '@/lib/types';

const ROLE_LABEL: Record<'ADMIN' | 'VIEWER', string> = {
  ADMIN: 'Administrador',
  VIEWER: 'Visualizador',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="font-mono text-sm font-medium">{value}</span>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [users, setUsers] = useState<UserSummary[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const [addUserOpen, setAddUserOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<Role>('VIEWER');
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  const [userToDelete, setUserToDelete] = useState<UserSummary | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  function loadUsers() {
    setIsLoadingUsers(true);
    return api.users
      .list()
      .then(setUsers)
      .catch((error) => {
        const message = error instanceof ApiError ? error.message : 'Falha ao carregar usuários';
        toast.error('Erro ao carregar usuários', { description: message });
      })
      .finally(() => setIsLoadingUsers(false));
  }

  useEffect(() => {
    let cancelled = false;

    api.tenants
      .me()
      .then((data) => {
        if (!cancelled) setTenant(data);
      })
      .catch((error) => {
        const message = error instanceof ApiError ? error.message : 'Falha ao carregar tenant';
        toast.error('Erro ao carregar configurações', { description: message });
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isAdmin) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadUsers();
    }
  }, [isAdmin]);

  function resetAddUserForm() {
    setNewUserName('');
    setNewUserEmail('');
    setNewUserPassword('');
    setNewUserRole('VIEWER');
  }

  async function handleCreateUser() {
    if (!newUserName.trim() || !newUserEmail.trim() || newUserPassword.length < 8) return;

    setIsCreatingUser(true);
    try {
      const created = await api.users.create({
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        password: newUserPassword,
        role: newUserRole,
      });
      setUsers((current) => [...current, created]);
      setTenant((current) =>
        current
          ? { ...current, _count: { ...current._count, users: current._count.users + 1 } }
          : current,
      );
      toast.success('Usuário criado com sucesso');
      resetAddUserForm();
      setAddUserOpen(false);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Falha ao criar usuário';
      toast.error('Erro ao criar usuário', { description: message });
    } finally {
      setIsCreatingUser(false);
    }
  }

  async function handleDeleteUser() {
    if (!userToDelete) return;

    setIsDeletingUser(true);
    try {
      await api.users.remove(userToDelete.id);
      setUsers((current) => current.filter((u) => u.id !== userToDelete.id));
      setTenant((current) =>
        current
          ? { ...current, _count: { ...current._count, users: current._count.users - 1 } }
          : current,
      );
      toast.success('Usuário removido');
      setUserToDelete(null);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Falha ao remover usuário';
      toast.error('Erro ao remover usuário', { description: message });
    } finally {
      setIsDeletingUser(false);
    }
  }

  async function handleChangePassword() {
    if (!currentPassword || newPassword.length < 8) return;

    setIsChangingPassword(true);
    try {
      await api.auth.changePassword({ currentPassword, newPassword });
      toast.success('Senha alterada com sucesso');
      setCurrentPassword('');
      setNewPassword('');
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Falha ao trocar senha';
      toast.error('Erro ao trocar senha', { description: message });
    } finally {
      setIsChangingPassword(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Configurações</h1>
        <p className="font-mono text-sm text-muted-foreground">
          dados da organização, conta e atalhos de administração
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-md border-2 border-border bg-accent">
                <Building2 className="size-4" strokeWidth={2.5} />
              </div>
              <div>
                <CardTitle>Organização</CardTitle>
                <CardDescription>Dados do tenant atual</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col gap-3">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
              </div>
            ) : (
              <div className="divide-y divide-border">
                <InfoRow label="Nome" value={tenant?.name} />
                <InfoRow label="Slug" value={tenant?.slug} />
                <InfoRow label="Criado em" value={tenant && formatDate(tenant.createdAt)} />
                <InfoRow label="Usuários" value={tenant?._count.users} />
                <InfoRow label="Contratos" value={tenant?._count.contracts} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-md border-2 border-border bg-accent">
                <UserRound className="size-4" strokeWidth={2.5} />
              </div>
              <div>
                <CardTitle>Minha conta</CardTitle>
                <CardDescription>Sessão atual</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              <InfoRow label="E-mail" value={user?.email} />
              <InfoRow
                label="Permissão"
                value={
                  user && (
                    <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                      {ROLE_LABEL[user.role]}
                    </Badge>
                  )
                }
              />
              <InfoRow label="ID do usuário" value={user?.id.slice(0, 8)} />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-stretch gap-3 border-t pt-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Trocar senha
            </p>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="current-password" className="text-xs">
                  Senha atual
                </Label>
                <Input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new-password" className="text-xs">
                  Nova senha
                </Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="mín. 8 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
            </div>
            <Button
              size="sm"
              className="self-end"
              disabled={isChangingPassword || !currentPassword || newPassword.length < 8}
              onClick={handleChangePassword}
            >
              {isChangingPassword && <Loader2 className="animate-spin" />}
              Salvar nova senha
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-md border-2 border-border bg-accent">
                <FileSliders className="size-4" strokeWidth={2.5} />
              </div>
              <div>
                <CardTitle>Template de contrato</CardTitle>
                <CardDescription>Campos usados na criação de contratos</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {isAdmin
                ? 'Adicione, remova ou reordene os campos que compõem o template ativo do tenant.'
                : 'Apenas administradores podem editar o template ativo.'}
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline" size="sm" disabled={!isAdmin}>
              <Link href="/template">Gerenciar template</Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-md border-2 border-border bg-accent">
                <ShieldCheck className="size-4" strokeWidth={2.5} />
              </div>
              <div>
                <CardTitle>Permissões</CardTitle>
                <CardDescription>O que cada papel pode fazer</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-start gap-2.5">
              <Badge>Admin</Badge>
              <p className="text-sm text-muted-foreground">
                Cria e edita templates, cria contratos e altera status.
              </p>
            </div>
            <Separator />
            <div className="flex items-start gap-2.5">
              <Badge variant="secondary">Viewer</Badge>
              <p className="text-sm text-muted-foreground">
                Acesso de leitura ao dashboard, contratos e histórico.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {isAdmin && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-md border-2 border-border bg-accent">
                  <Users className="size-4" strokeWidth={2.5} />
                </div>
                <div>
                  <CardTitle>Usuários</CardTitle>
                  <CardDescription>Gerencie quem tem acesso a este tenant</CardDescription>
                </div>
              </div>

              <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus />
                    Adicionar usuário
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Novo usuário</DialogTitle>
                    <DialogDescription>
                      Cria uma conta dentro do tenant atual. A senha pode ser trocada pelo próprio
                      usuário depois.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="flex flex-col gap-4 py-2">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="new-user-name">Nome</Label>
                      <Input
                        id="new-user-name"
                        placeholder="Maria Souza"
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="new-user-email">E-mail</Label>
                      <Input
                        id="new-user-email"
                        type="email"
                        placeholder="maria@acme.com"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="new-user-password">Senha</Label>
                      <Input
                        id="new-user-password"
                        type="password"
                        autoComplete="new-password"
                        placeholder="mín. 8 caracteres"
                        value={newUserPassword}
                        onChange={(e) => setNewUserPassword(e.target.value)}
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label>Papel</Label>
                      <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as Role)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="VIEWER">Visualizador</SelectItem>
                          <SelectItem value="ADMIN">Administrador</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        resetAddUserForm();
                        setAddUserOpen(false);
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleCreateUser}
                      disabled={
                        isCreatingUser ||
                        !newUserName.trim() ||
                        !newUserEmail.trim() ||
                        newUserPassword.length < 8
                      }
                    >
                      {isCreatingUser && <Loader2 className="animate-spin" />}
                      Criar usuário
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>

          <CardContent>
            {isLoadingUsers ? (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : users.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhum usuário encontrado.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Papel</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => {
                    const isSelf = u.id === user?.id;
                    return (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">
                          {u.name}
                          {isSelf && (
                            <span className="ml-2 font-mono text-xs text-muted-foreground">
                              (você)
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{u.email}</TableCell>
                        <TableCell>
                          <Badge variant={u.role === 'ADMIN' ? 'default' : 'secondary'}>
                            {ROLE_LABEL[u.role]}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {formatDate(u.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isSelf}
                            title={isSelf ? 'Você não pode remover a si mesmo' : 'Remover usuário'}
                            onClick={() => setUserToDelete(u)}
                          >
                            <Trash2 />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>

          <CardFooter className="gap-2">
            <KeyRound className="size-3.5 text-muted-foreground" strokeWidth={2.5} />
            <p className="font-mono text-xs text-muted-foreground">
              o último administrador do tenant não pode ser removido
            </p>
          </CardFooter>
        </Card>
      )}

      <Dialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover usuário</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover{' '}
              <span className="font-semibold text-foreground">{userToDelete?.name}</span> (
              {userToDelete?.email})? Essa ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserToDelete(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={isDeletingUser}>
              {isDeletingUser && <Loader2 className="animate-spin" />}
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
