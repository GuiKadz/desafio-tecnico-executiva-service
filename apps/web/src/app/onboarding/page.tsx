'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
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
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/api';

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function OnboardingPage() {
  const { onboarding } = useAuth();
  const router = useRouter();

  const [tenantName, setTenantName] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleTenantNameChange(value: string) {
    setTenantName(value);
    if (!slugTouched) setTenantSlug(slugify(value));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await onboarding({
        tenantName,
        tenantSlug,
        adminName,
        adminEmail,
        adminPassword,
      });
      toast.success('Tenant criado com sucesso');
      router.push('/dashboard');
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Não foi possível conectar à API';
      toast.error('Erro ao criar tenant', { description: message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">Criar tenant</CardTitle>
          <CardDescription>Configure sua empresa e o usuário administrador inicial</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="tenantName">Nome da empresa</Label>
              <Input
                id="tenantName"
                placeholder="Acme Contratos LTDA"
                required
                value={tenantName}
                onChange={(e) => handleTenantNameChange(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="tenantSlug">Identificador (slug)</Label>
              <Input
                id="tenantSlug"
                placeholder="acme-contratos"
                required
                pattern="^[a-z0-9]+(-[a-z0-9]+)*$"
                value={tenantSlug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setTenantSlug(e.target.value);
                }}
              />
              <p className="text-xs text-muted-foreground">
                Apenas letras minúsculas, números e hífens.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="adminName">Seu nome</Label>
              <Input
                id="adminName"
                placeholder="Maria Souza"
                autoComplete="name"
                required
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="adminEmail">Seu e-mail</Label>
              <Input
                id="adminEmail"
                type="email"
                placeholder="admin@acme.com"
                autoComplete="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="adminPassword">Senha</Label>
              <Input
                id="adminPassword"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                required
                minLength={8}
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Mínimo de 8 caracteres.</p>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 mt-2">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="animate-spin" />}
              Criar tenant
            </Button>

            <p className="text-sm text-muted-foreground text-center">
              Já tem uma conta?{' '}
              <Link href="/login" className="text-foreground underline underline-offset-4">
                Entrar
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </main>
  );
}
