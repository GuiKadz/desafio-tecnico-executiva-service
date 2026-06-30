import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { api, apiFetch, ApiError, clearTokens, decodeJwt, getTokens, saveTokens } from './api';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function fakeJwt(payload: Record<string, unknown>) {
  const base64url = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${base64url({ alg: 'none' })}.${base64url(payload)}.signature`;
}

describe('token storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('saveTokens/getTokens round-trip apenas o accessToken', () => {
    saveTokens({ accessToken: 'abc.def.ghi' });
    expect(getTokens()).toEqual({ accessToken: 'abc.def.ghi' });
  });

  it('getTokens retorna null quando não há token salvo', () => {
    expect(getTokens()).toBeNull();
  });

  it('clearTokens remove o token salvo', () => {
    saveTokens({ accessToken: 'abc.def.ghi' });
    clearTokens();
    expect(getTokens()).toBeNull();
  });

  it('nunca persiste um refreshToken — só o accessToken existe no storage', () => {
    saveTokens({ accessToken: 'abc.def.ghi' });
    const raw = window.localStorage.getItem('executiva:access-token');
    expect(raw).toBe('abc.def.ghi');
    expect(window.localStorage.length).toBe(1);
  });
});

describe('decodeJwt', () => {
  it('decodifica o payload de um JWT válido', () => {
    const token = fakeJwt({ sub: 'user-1', role: 'ADMIN' });
    expect(decodeJwt(token)).toEqual({ sub: 'user-1', role: 'ADMIN' });
  });

  it('retorna null para um token malformado', () => {
    expect(decodeJwt('nao-e-um-jwt')).toBeNull();
  });
});

describe('ApiError', () => {
  it('usa a mensagem da API quando presente', () => {
    const error = new ApiError(404, { statusCode: 404, message: 'Não encontrado' });
    expect(error.message).toBe('Não encontrado');
    expect(error.status).toBe(404);
  });

  it('junta mensagens de validação em array (class-validator) em uma string', () => {
    const error = new ApiError(400, {
      statusCode: 400,
      message: ['email não pode ser vazio', 'senha é obrigatória'],
    });
    expect(error.message).toBe('email não pode ser vazio, senha é obrigatória');
  });

  it('usa uma mensagem genérica quando a API não retorna corpo', () => {
    const error = new ApiError(500);
    expect(error.message).toBe('Erro inesperado (500)');
  });
});

describe('apiFetch', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('envia o access token no header Authorization quando autenticado', async () => {
    saveTokens({ accessToken: 'token-valido' });
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ ok: true }));

    await apiFetch('/tenants/me');

    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer token-valido');
  });

  it('sempre manda credentials: include (necessário pro cookie de refresh)', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ ok: true }));

    await apiFetch('/tenants/me', { skipAuth: true });

    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect(init?.credentials).toBe('include');
  });

  it('skipAuth omite o header Authorization mesmo com token salvo', async () => {
    saveTokens({ accessToken: 'token-valido' });
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ ok: true }));

    await apiFetch('/auth/login', { skipAuth: true, method: 'POST' });

    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect((init?.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it('em 401, renova o token via /auth/refresh e repete a requisição original uma vez', async () => {
    saveTokens({ accessToken: 'token-expirado' });

    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ message: 'Unauthorized' }, 401)) // 1ª tentativa
      .mockResolvedValueOnce(jsonResponse({ accessToken: 'token-novo' })) // /auth/refresh
      .mockResolvedValueOnce(jsonResponse({ data: 'ok' })); // retry

    const result = await apiFetch<{ data: string }>('/contracts');

    expect(result).toEqual({ data: 'ok' });
    expect(fetch).toHaveBeenCalledTimes(3);

    const refreshCall = vi.mocked(fetch).mock.calls[1];
    expect(refreshCall[0]).toContain('/auth/refresh');

    const retryCall = vi.mocked(fetch).mock.calls[2];
    expect((retryCall[1]?.headers as Record<string, string>).Authorization).toBe(
      'Bearer token-novo',
    );

    expect(getTokens()).toEqual({ accessToken: 'token-novo' });
  });

  it('quando o refresh também falha, limpa o token e não entra em loop', async () => {
    saveTokens({ accessToken: 'token-expirado' });

    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ message: 'Unauthorized' }, 401)) // 1ª tentativa
      .mockResolvedValueOnce(jsonResponse({ message: 'Refresh inválido' }, 401)); // /auth/refresh falha

    await expect(apiFetch('/contracts')).rejects.toMatchObject({ status: 401 });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(getTokens()).toBeNull();
  });

  it('lança ApiError para qualquer status de erro que não seja 401', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ statusCode: 409, message: 'E-mail já em uso' }, 409),
    );

    await expect(apiFetch('/auth/users', { method: 'POST' })).rejects.toMatchObject({
      status: 409,
      message: 'E-mail já em uso',
    });
  });

  it('retorna undefined em respostas 204 sem tentar parsear JSON', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 204 }));

    const result = await apiFetch('/auth/logout', { method: 'POST', skipAuth: true });
    expect(result).toBeUndefined();
  });
});

describe('api.contracts.list — querystring', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ items: [], total: 0 })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('omite parâmetros undefined/vazios e serializa os demais', async () => {
    await api.contracts.list({ status: 'ACTIVE', page: 2, fieldValue: '' });

    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(url).toContain('/contracts?');
    expect(url).toContain('status=ACTIVE');
    expect(url).toContain('page=2');
    expect(url).not.toContain('fieldValue');
  });

  it('sem filtros, não anexa "?" na URL', async () => {
    await api.contracts.list();
    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(url).not.toContain('?');
  });
});
