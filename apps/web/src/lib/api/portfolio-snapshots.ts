import type {
  PortfolioSnapshot,
  PortfolioSnapshotDelta,
  PortfolioDiagnostics,
  PortfolioSnapshotLineage,
  PortfolioAssetCategory,
  PortfolioChangeExplanation,
  PortfolioHistoryScope,
  PortfolioHistorySeries,
} from '@aurum/core';
import { apiGet, apiPost } from '@/lib/api';

export async function listPortfolioSnapshots(): Promise<PortfolioSnapshot[]> {
  return apiGet<PortfolioSnapshot[]>('/v1/portfolio-snapshots');
}

export async function createPortfolioSnapshot(
  snapshot: PortfolioSnapshot,
): Promise<PortfolioSnapshot> {
  return apiPost<PortfolioSnapshot>('/v1/portfolio-snapshots', snapshot);
}

export async function getPortfolioSnapshotById(id: string): Promise<PortfolioSnapshot> {
  return apiGet<PortfolioSnapshot>(`/v1/portfolio-snapshots/${id}`);
}

export async function getPortfolioSnapshotLineage(id: string): Promise<PortfolioSnapshotLineage> {
  return apiGet<PortfolioSnapshotLineage>(`/v1/portfolio-snapshots/${id}/lineage`);
}

export async function getPortfolioSnapshotDelta(
  id: string,
  compareTo = 'previous',
): Promise<PortfolioSnapshotDelta> {
  const qs = new URLSearchParams({ compareTo });
  return apiGet<PortfolioSnapshotDelta>(`/v1/portfolio-snapshots/${id}/delta?${qs.toString()}`);
}

export async function getPortfolioSnapshotDiagnostics(id: string): Promise<PortfolioDiagnostics> {
  return apiGet<PortfolioDiagnostics>(`/v1/portfolio-snapshots/${id}/diagnostics`);
}

export async function getPortfolioSnapshotChangeExplanation(
  id: string,
  compareTo = 'previous',
): Promise<PortfolioChangeExplanation> {
  const qs = new URLSearchParams({ compareTo });
  return apiGet<PortfolioChangeExplanation>(
    `/v1/portfolio-snapshots/${id}/change-explanation?${qs.toString()}`,
  );
}

export interface PortfolioHistoryQuery {
  scope?: PortfolioHistoryScope;
  sourceId?: string;
  sourceAccountId?: string;
  assetCategory?: PortfolioAssetCategory;
  limit?: number;
}

export async function getPortfolioSnapshotHistory(
  query: PortfolioHistoryQuery = {},
): Promise<PortfolioHistorySeries> {
  const qs = new URLSearchParams({ scope: query.scope ?? 'consolidated' });
  if (query.sourceId) qs.set('sourceId', query.sourceId);
  if (query.sourceAccountId) qs.set('sourceAccountId', query.sourceAccountId);
  if (query.assetCategory) qs.set('assetCategory', query.assetCategory);
  if (query.limit !== undefined) qs.set('limit', String(query.limit));

  return apiGet<PortfolioHistorySeries>(`/v1/portfolio-snapshots/history?${qs.toString()}`);
}
