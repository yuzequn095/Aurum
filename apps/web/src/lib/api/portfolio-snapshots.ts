import type { PortfolioSnapshot } from '@aurum/core';
import { apiGet } from '@/lib/api';

export async function listPortfolioSnapshots(): Promise<PortfolioSnapshot[]> {
  return apiGet<PortfolioSnapshot[]>('/v1/portfolio-snapshots');
}

export async function getPortfolioSnapshotById(
  id: string,
): Promise<PortfolioSnapshot> {
  return apiGet<PortfolioSnapshot>(`/v1/portfolio-snapshots/${id}`);
}
