import type { PortfolioSnapshot } from '@aurum/core';
import { apiGet, apiPost } from '@/lib/api';

export async function listPortfolioSnapshots(): Promise<PortfolioSnapshot[]> {
  return apiGet<PortfolioSnapshot[]>('/v1/portfolio-snapshots');
}

export async function createPortfolioSnapshot(
  snapshot: PortfolioSnapshot,
): Promise<PortfolioSnapshot> {
  return apiPost<PortfolioSnapshot>('/v1/portfolio-snapshots', snapshot);
}

export async function getPortfolioSnapshotById(
  id: string,
): Promise<PortfolioSnapshot> {
  return apiGet<PortfolioSnapshot>(`/v1/portfolio-snapshots/${id}`);
}
