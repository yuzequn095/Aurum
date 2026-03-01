export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

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

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    // dev: allow cookies later; safe now
    credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GET ${path} failed: ${res.status} ${text}`);
  }

  return (await res.json()) as T;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${path} failed: ${res.status} ${text}`);
  }

  return (await res.json()) as T;
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PATCH ${path} failed: ${res.status} ${text}`);
  }

  return (await res.json()) as T;
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DELETE ${path} failed: ${res.status} ${text}`);
  }

  return (await res.json()) as T;
}

export async function fetchMonthlySummary(year: number, month: number) {
  const qs = new URLSearchParams({
    year: String(year),
    month: String(month),
  });
  const path = `/v1/analytics/monthly-summary?${qs.toString()}`;
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GET ${path} failed: ${res.status} ${text}`);
  }

  return (await res.json()) as unknown;
}

export async function fetchCategoryBreakdown(year: number, month: number) {
  const qs = new URLSearchParams({
    year: String(year),
    month: String(month),
  });
  const path = `/v1/analytics/category-breakdown?${qs.toString()}`;
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GET ${path} failed: ${res.status} ${text}`);
  }

  return (await res.json()) as unknown;
}

export async function fetchAiMonthlyReport(year: number, month: number): Promise<AiMonthlyReportResponse> {
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
  return apiGet<AiMonthlyReportResponse>(
    `/v1/ai/monthly-report?${qs.toString()}`,
  );
}
