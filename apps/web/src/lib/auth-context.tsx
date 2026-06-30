'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { api, clearTokens, decodeJwt, getAccessToken, saveTokens, subscribeTokens } from './api';
import type { AuthUser, LoginPayload, OnboardingPayload, TokenPair } from './types';

interface AccessTokenPayload {
  sub: string;
  email: string;
  tenantId: string;
  role: AuthUser['role'];
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  onboarding: (payload: OnboardingPayload) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function userFromTokens(tokens: TokenPair): AuthUser | null {
  const payload = decodeJwt<AccessTokenPayload>(tokens.accessToken);
  if (!payload) return null;
  return {
    id: payload.sub,
    email: payload.email,
    tenantId: payload.tenantId,
    role: payload.role,
  };
}

function getServerSnapshot() {
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const accessToken = useSyncExternalStore(subscribeTokens, getAccessToken, getServerSnapshot);
  const user = useMemo(() => (accessToken ? userFromTokens({ accessToken }) : null), [accessToken]);
  const router = useRouter();

  const login = useCallback(async (payload: LoginPayload) => {
    const tokens = await api.auth.login(payload);
    saveTokens(tokens);
  }, []);

  const onboarding = useCallback(async (payload: OnboardingPayload) => {
    const tokens = await api.auth.onboarding(payload);
    saveTokens(tokens);
  }, []);

  const logout = useCallback(() => {
    void api.auth.logout().catch(() => undefined);
    clearTokens();
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, isLoading: false, login, onboarding, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth precisa ser usado dentro de um <AuthProvider>');
  }
  return context;
}
