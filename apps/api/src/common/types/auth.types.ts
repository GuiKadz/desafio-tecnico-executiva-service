export interface CurrentUserPayload {
  sub: string;
  email: string;
  tenantId: string;
  role: 'ADMIN' | 'VIEWER';
}
