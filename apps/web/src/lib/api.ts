import type {
  ApiErrorBody,
  ChangePasswordPayload,
  Contract,
  ContractDetail,
  ContractTemplate,
  CreateContractPayload,
  CreateTemplatePayload,
  CreateUserPayload,
  FindContractsQuery,
  LoginPayload,
  OnboardingPayload,
  PaginatedResult,
  Tenant,
  TokenPair,
  UpdateContractFieldsPayload,
  UserSummary,
} from './types';
import type { ContractStatus } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const STORAGE_KEY = 'executiva:access-token';

export class ApiError extends Error {
  status: number;
  body?: ApiErrorBody;

  constructor(status: number, body?: ApiErrorBody) {
    const message = Array.isArray(body?.message)
      ? body.message.join(', ')
      : (body?.message ?? `Erro inesperado (${status})`);
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export function saveTokens(tokens: TokenPair) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, tokens.accessToken);
}

export function getTokens(): TokenPair | null {
  if (typeof window === 'undefined') return null;
  const accessToken = window.localStorage.getItem(STORAGE_KEY);
  return accessToken ? { accessToken } : null;
}

export function clearTokens() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function decodeJwt<T = Record<string, unknown>>(token: string): T | null {
  try {
    const [, payload] = token.split('.');
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decodeURIComponent(escape(json))) as T;
  } catch {
    return null;
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  skipAuth?: boolean;
  _isRetry?: boolean;
}

let refreshPromise: Promise<TokenPair> | null = null;

async function doRefresh(): Promise<TokenPair> {
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    clearTokens();
    const body = await response.json().catch(() => undefined);
    throw new ApiError(response.status, body);
  }

  const newTokens = (await response.json()) as TokenPair;
  saveTokens(newTokens);
  return newTokens;
}

function refreshTokens(): Promise<TokenPair> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, skipAuth, _isRetry, headers, ...rest } = options;

  const tokens = getTokens();
  const finalHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...headers,
    ...(!skipAuth && tokens?.accessToken ? { Authorization: `Bearer ${tokens.accessToken}` } : {}),
  };

  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401 && !skipAuth && !_isRetry) {
    try {
      await refreshTokens();
      return apiFetch<T>(path, { ...options, _isRetry: true });
    } catch {
      clearTokens();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new ApiError(401, { statusCode: 401, message: 'Sessão expirada' });
    }
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => undefined);
    throw new ApiError(response.status, errorBody);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const api = {
  auth: {
    onboarding: (payload: OnboardingPayload) =>
      apiFetch<TokenPair>('/auth/onboarding', {
        method: 'POST',
        body: payload,
        skipAuth: true,
      }),
    login: (payload: LoginPayload) =>
      apiFetch<TokenPair>('/auth/login', {
        method: 'POST',
        body: payload,
        skipAuth: true,
      }),
    logout: () =>
      apiFetch<void>('/auth/logout', {
        method: 'POST',
        skipAuth: true,
      }),
    changePassword: (payload: ChangePasswordPayload) =>
      apiFetch<void>('/auth/me/password', {
        method: 'PATCH',
        body: payload,
      }),
  },
  users: {
    list: () => apiFetch<UserSummary[]>('/auth/users'),
    create: (payload: CreateUserPayload) =>
      apiFetch<UserSummary>('/auth/users', { method: 'POST', body: payload }),
    remove: (id: string) => apiFetch<void>(`/auth/users/${id}`, { method: 'DELETE' }),
  },
  tenants: {
    me: () => apiFetch<Tenant>('/tenants/me'),
  },
  templates: {
    active: () => apiFetch<ContractTemplate | null>('/templates/active'),
    create: (payload: CreateTemplatePayload) =>
      apiFetch<ContractTemplate>('/templates', {
        method: 'POST',
        body: payload,
      }),
  },
  contracts: {
    list: (query: FindContractsQuery = {}) =>
      apiFetch<PaginatedResult<Contract>>(`/contracts${toQueryString(query)}`),
    get: (id: string) => apiFetch<ContractDetail>(`/contracts/${id}`),
    create: (payload: CreateContractPayload) =>
      apiFetch<Contract>('/contracts', { method: 'POST', body: payload }),
    updateStatus: (id: string, status: ContractStatus) =>
      apiFetch<Contract>(`/contracts/${id}/status`, {
        method: 'PATCH',
        body: { status },
      }),
    updateFields: (id: string, payload: UpdateContractFieldsPayload) =>
      apiFetch<Contract>(`/contracts/${id}/fields`, {
        method: 'PATCH',
        body: payload,
      }),
  },
};

function toQueryString(query: FindContractsQuery): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}
