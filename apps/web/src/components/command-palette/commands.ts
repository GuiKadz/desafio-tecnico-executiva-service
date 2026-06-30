'use client';

import { createElement } from 'react';
import { Home, FilePlus2, FileText, LogOut, Settings, LayoutTemplate } from 'lucide-react';

import { useRouter } from 'next/navigation';

import { useAuth } from '@/lib/auth-context';

import { useRegisterCommands } from './use-register-commands';

export function GlobalCommands() {
  const router = useRouter();

  const { logout, user } = useAuth();

  const isViewer = user?.role === 'VIEWER';

  useRegisterCommands([
    {
      id: 'dashboard',
      title: 'Dashboard',
      subtitle: 'Ir para página inicial',
      icon: createElement(Home, { className: 'size-4' }),
      group: 'Navegação',
      category: 'navigation',
      keywords: ['home', 'inicio'],
      action: () => router.push('/'),
    },

    {
      id: 'contracts',
      title: 'Contratos',
      subtitle: 'Lista de contratos',
      icon: createElement(FileText, { className: 'size-4' }),
      group: 'Navegação',
      category: 'navigation',
      keywords: ['contrato'],
      action: () => router.push('/contracts'),
    },

    ...(!isViewer
      ? [
          {
            id: 'create-contract',
            title: 'Novo contrato',
            subtitle: 'Criar contrato',
            icon: createElement(FilePlus2, { className: 'size-4' }),
            group: 'Ações',
            category: 'action' as const,
            shortcut: ['N'],
            action: () => router.push('/contracts/new'),
          },
        ]
      : []),

    {
      id: 'templates',
      title: 'Templates',
      subtitle: 'Modelos',
      icon: createElement(LayoutTemplate, { className: 'size-4' }),
      group: 'Navegação',
      category: 'template',
      action: () => router.push('/template'),
    },

    {
      id: 'settings',
      title: 'Configurações',
      subtitle: 'Preferências do sistema',
      icon: createElement(Settings, { className: 'size-4' }),
      group: 'Sistema',
      category: 'settings',
      action: () => router.push('/settings'),
    },

    {
      id: 'logout',
      title: 'Sair',
      subtitle: 'Encerrar sessão',
      icon: createElement(LogOut, { className: 'size-4' }),
      group: 'Sistema',
      category: 'action',
      keywords: ['logout'],
      action: logout,
    },
  ]);

  return null;
}
