export type Role = 'ADMIN' | 'VIEWER';

export interface AuthUser {
  id: string;
  email: string;
  tenantId: string;
  role: Role;
}

export interface TokenPair {
  accessToken: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  _count: {
    users: number;
    contracts: number;
  };
}

export interface OnboardingPayload {
  tenantName: string;
  tenantSlug: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: Role;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export type FieldType = 'TEXT' | 'NUMBER' | 'DATE' | 'BOOLEAN';

export interface TemplateField {
  id: string;
  name: string;
  type: FieldType;
  required: boolean;
  order: number;
}

export interface ContractTemplate {
  id: string;
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
  fields: TemplateField[];
}

export interface TemplateFieldInput {
  name: string;
  type: FieldType;
  required: boolean;
  order: number;
}

export interface CreateTemplatePayload {
  fields: TemplateFieldInput[];
}

export type ContractStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED';

export type HistoryAction = 'CREATED' | 'STATUS_CHANGED' | 'FIELD_UPDATED';

export interface ContractFieldValue {
  id: string;
  fieldName: string;
  fieldType: FieldType;
  value: string;
  contractId: string;
}

export interface ContractHistoryEntry {
  id: string;
  action: HistoryAction;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  changedAt: string;
  contractId: string;
  changedById: string;
  changedBy: {
    id: string;
    name: string;
    email: string;
  };
}

export interface Contract {
  id: string;
  status: ContractStatus;
  createdAt: string;
  updatedAt: string;
  tenantId: string;
  templateId: string;
  values: ContractFieldValue[];
}

export interface ContractDetail extends Contract {
  template: ContractTemplate;
  history: ContractHistoryEntry[];
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface FindContractsQuery {
  page?: number;
  limit?: number;
  status?: ContractStatus;
  dateFrom?: string;
  dateTo?: string;
  fieldName?: string;
  fieldValue?: string;
}

export interface ContractFieldValueInput {
  fieldName: string;
  value: string;
}

export interface CreateContractPayload {
  values: ContractFieldValueInput[];
}

export interface UpdateContractFieldsPayload {
  values: ContractFieldValueInput[];
}

export interface ApiErrorBody {
  statusCode: number;
  message: string | string[];
  error?: string;
}
