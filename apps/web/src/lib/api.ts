import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
} from '@/lib/auth/tokens';

function isLoopbackHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function resolveApiBase(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL;
  const browserDefault =
    typeof window !== 'undefined'
      ? `${window.location.protocol}//${window.location.hostname}:3001`
      : 'http://localhost:3001';

  if (!configured) {
    return browserDefault;
  }

  if (typeof window === 'undefined') {
    return configured;
  }

  try {
    const url = new URL(configured);
    if (isLoopbackHost(url.hostname) && isLoopbackHost(window.location.hostname)) {
      url.hostname = window.location.hostname;
      return url.toString().replace(/\/$/, '');
    }
  } catch {
    return configured;
  }

  return configured;
}

export const API_BASE = resolveApiBase();

export class ApiError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export type MonthlySummaryResponse = {
  year: number;
  month: number;
  range: {
    startDate: string;
    endDate: string;
  };
  totals: {
    incomeCents: number;
    expenseCents: number;
    netCents: number;
  };
  previousMonth?: {
    year: number;
    month: number;
    totals: {
      incomeCents: number;
      expenseCents: number;
      netCents: number;
    };
  };
  deltaPercent?: {
    income?: number | null;
    expense?: number | null;
    net?: number | null;
  };
};

export type CategoryBreakdownResponse = {
  year: number;
  month: number;
  totals: Array<{
    categoryId: string | null;
    categoryName: string | null;
    expenseCents: number;
  }>;
};

export type AiInsight = {
  id: string;
  title: string;
  body: string;
  severity: 'info' | 'warn' | 'good' | 'error';
  meta?: Record<string, unknown>;
};

export type AiMonthlyReportResponse = {
  year: number;
  month: number;
  summary: MonthlySummaryResponse;
  categoryBreakdown: CategoryBreakdownResponse;
  insights: AiInsight[];
};

export type CategoryOption = {
  id: string;
  name: string;
  parentId: string | null;
};

export type SubcategoryOption = {
  id: string;
  categoryId: string;
  name: string;
};

export type AccountOption = {
  id: string;
  name: string;
  currency: string;
};

type RefreshResponse = {
  accessToken: string;
  refreshToken: string;
};

function isBrowser() {
  return typeof window !== 'undefined';
}

function redirectToLogin() {
  if (!isBrowser()) return;
  window.location.href = '/login';
}

function extractMessage(value: unknown): string | null {
  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => extractMessage(item))
      .filter((item): item is string => Boolean(item));
    return parts.length > 0 ? parts.join(', ') : null;
  }

  return null;
}

function deriveErrorMessage(status: number, parsed: unknown, fallbackText: string): string {
  const direct = extractMessage(parsed);
  if (direct) return direct;

  if (parsed && typeof parsed === 'object' && 'message' in parsed) {
    const payloadMessage = extractMessage((parsed as { message?: unknown }).message);
    if (payloadMessage) return payloadMessage;
  }

  const fallback = fallbackText.trim();
  if (fallback.length > 0) return fallback;

  return `Request failed with status ${status}`;
}

async function readErrorResponse(res: Response): Promise<{ parsed: unknown; text: string }> {
  let text = '';

  try {
    text = await res.text();
  } catch {
    return { parsed: undefined, text: '' };
  }

  if (!text) {
    return { parsed: undefined, text: '' };
  }

  try {
    return { parsed: JSON.parse(text), text };
  } catch {
    return { parsed: undefined, text };
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  const res = await fetch(`${API_BASE}/v1/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) return null;

  const payload = (await res.json()) as RefreshResponse;
  if (!payload.accessToken || !payload.refreshToken) return null;
  setAccessToken(payload.accessToken);
  setRefreshToken(payload.refreshToken);
  return payload.accessToken;
}

async function authFetch(
  path: string,
  init: RequestInit = {},
  retryOnUnauthorized = true,
): Promise<Response> {
  const headers = new Headers(init.headers);
  const accessToken = getAccessToken();
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  });

  if (response.status !== 401 || !retryOnUnauthorized) {
    return response;
  }

  const newAccessToken = await refreshAccessToken();
  if (!newAccessToken) {
    clearTokens();
    redirectToLogin();
    return response;
  }

  const retryHeaders = new Headers(init.headers);
  retryHeaders.set('Authorization', `Bearer ${newAccessToken}`);

  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: retryHeaders,
    credentials: 'include',
  });
}

async function parseJsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const { parsed, text } = await readErrorResponse(res);
    const message = deriveErrorMessage(res.status, parsed, text);
    throw new ApiError(res.status, message, parsed);
  }

  return (await res.json()) as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await authFetch(path);
  return parseJsonOrThrow<T>(res);
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await authFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return parseJsonOrThrow<T>(res);
}

export async function apiPublicPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  return parseJsonOrThrow<T>(res);
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await authFetch(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return parseJsonOrThrow<T>(res);
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await authFetch(path, {
    method: 'DELETE',
  });
  return parseJsonOrThrow<T>(res);
}

export async function fetchMonthlySummary(year: number, month: number) {
  const qs = new URLSearchParams({
    year: String(year),
    month: String(month),
  });
  return apiGet<MonthlySummaryResponse>(`/v1/analytics/monthly-summary?${qs.toString()}`);
}

export async function fetchCategoryBreakdown(year: number, month: number) {
  const qs = new URLSearchParams({
    year: String(year),
    month: String(month),
  });
  return apiGet<CategoryBreakdownResponse>(`/v1/analytics/category-breakdown?${qs.toString()}`);
}

export async function fetchAiMonthlyReport(
  year: number,
  month: number,
): Promise<AiMonthlyReportResponse> {
  return getMonthlyAiReport(year, month);
}

export async function getMonthlyAiReport(
  year: number,
  month: number,
): Promise<AiMonthlyReportResponse> {
  const qs = new URLSearchParams({
    year: String(year),
    month: String(month),
  });
  return apiGet<AiMonthlyReportResponse>(`/v1/ai/monthly-report?${qs.toString()}`);
}

export async function getCategories(): Promise<CategoryOption[]> {
  return apiGet<CategoryOption[]>('/v1/categories');
}

export async function createCategory(name: string): Promise<CategoryOption> {
  return apiPost<CategoryOption>('/v1/categories', { name });
}

export async function deleteCategory(id: string): Promise<{ ok: boolean }> {
  return apiDelete<{ ok: boolean }>(`/v1/categories/${id}`);
}

export async function createAccount(
  name: string,
  currency?: string,
): Promise<AccountOption> {
  return apiPost<AccountOption>('/v1/accounts', {
    name,
    currency,
  });
}

export async function getSubcategories(categoryId: string): Promise<SubcategoryOption[]> {
  const qs = new URLSearchParams({ categoryId });
  return apiGet<SubcategoryOption[]>(`/v1/subcategories?${qs.toString()}`);
}

export async function createSubcategory(
  categoryId: string,
  name: string,
): Promise<SubcategoryOption> {
  return apiPost<SubcategoryOption>('/v1/subcategories', {
    categoryId,
    name,
  });
}

export async function deleteSubcategory(id: string): Promise<{ ok: boolean }> {
  return apiDelete<{ ok: boolean }>(`/v1/subcategories/${id}`);
}
