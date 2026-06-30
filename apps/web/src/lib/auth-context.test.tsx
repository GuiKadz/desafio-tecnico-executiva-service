import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from './auth-context';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

const loginMock = vi.fn();
const onboardingMock = vi.fn();
const logoutMock = vi.fn();

vi.mock('./api', async () => {
  const actual = await vi.importActual<typeof import('./api')>('./api');
  return {
    ...actual,
    api: {
      auth: {
        login: (...args: unknown[]) => loginMock(...args),
        onboarding: (...args: unknown[]) => onboardingMock(...args),
        logout: (...args: unknown[]) => logoutMock(...args),
      },
    },
  };
});

function fakeJwt(payload: Record<string, unknown>) {
  const base64url = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${base64url({ alg: 'none' })}.${base64url(payload)}.signature`;
}

const ADMIN_PAYLOAD = {
  sub: 'user-1',
  email: 'admin@acme.com',
  tenantId: 'tenant-1',
  role: 'ADMIN' as const,
};

function Probe() {
  const { user, login, onboarding, logout } = useAuth();
  return (
    <div>
      <span data-testid="user-email">{user?.email ?? 'sem-usuario'}</span>
      <button onClick={() => login({ email: 'admin@acme.com', password: 'admin@acme.com' })}>
        login
      </button>
      <button
        onClick={() =>
          onboarding({
            tenantName: 'Acme',
            tenantSlug: 'acme',
            adminName: 'Admin',
            adminEmail: 'admin@acme.com',
            adminPassword: 'admin@acme.com',
          })
        }
      >
        onboarding
      </button>
      <button onClick={logout}>logout</button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
    loginMock.mockReset();
    onboardingMock.mockReset();
    logoutMock.mockReset().mockResolvedValue(undefined);
    pushMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('começa sem usuário quando não há token salvo', () => {
    renderWithProvider();
    expect(screen.getByTestId('user-email')).toHaveTextContent('sem-usuario');
  });

  it('hidrata o usuário a partir de um access token já salvo (refresh de página)', () => {
    window.localStorage.setItem('executiva:access-token', fakeJwt(ADMIN_PAYLOAD));
    renderWithProvider();
    expect(screen.getByTestId('user-email')).toHaveTextContent('admin@acme.com');
  });

  it('login: salva o token retornado pela API e popula o usuário a partir do JWT', async () => {
    loginMock.mockResolvedValue({ accessToken: fakeJwt(ADMIN_PAYLOAD) });
    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByText('login'));

    await waitFor(() => {
      expect(screen.getByTestId('user-email')).toHaveTextContent('admin@acme.com');
    });
    expect(window.localStorage.getItem('executiva:access-token')).toBe(fakeJwt(ADMIN_PAYLOAD));
  });

  it('onboarding: mesmo comportamento do login (salva token + popula usuário)', async () => {
    onboardingMock.mockResolvedValue({ accessToken: fakeJwt(ADMIN_PAYLOAD) });
    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByText('onboarding'));

    await waitFor(() => {
      expect(screen.getByTestId('user-email')).toHaveTextContent('admin@acme.com');
    });
  });

  it('logout: chama a API para revogar o cookie, limpa o token local e redireciona para /login', async () => {
    window.localStorage.setItem('executiva:access-token', fakeJwt(ADMIN_PAYLOAD));
    const user = userEvent.setup();
    renderWithProvider();
    expect(screen.getByTestId('user-email')).toHaveTextContent('admin@acme.com');

    await user.click(screen.getByText('logout'));

    expect(logoutMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('user-email')).toHaveTextContent('sem-usuario');
    expect(window.localStorage.getItem('executiva:access-token')).toBeNull();
    expect(pushMock).toHaveBeenCalledWith('/login');
  });

  it('logout: limpa a sessão local mesmo se a chamada à API falhar (rede fora, etc.)', async () => {
    logoutMock.mockRejectedValue(new Error('network error'));
    window.localStorage.setItem('executiva:access-token', fakeJwt(ADMIN_PAYLOAD));
    const user = userEvent.setup();
    renderWithProvider();

    await user.click(screen.getByText('logout'));

    await waitFor(() => {
      expect(screen.getByTestId('user-email')).toHaveTextContent('sem-usuario');
    });
    expect(pushMock).toHaveBeenCalledWith('/login');
  });
});
