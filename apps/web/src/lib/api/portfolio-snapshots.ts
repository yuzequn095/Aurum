import type {
  PortfolioSnapshot,
  PortfolioSnapshotDelta,
  PortfolioSnapshotLineage,
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
