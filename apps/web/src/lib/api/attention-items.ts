import type { PortfolioAttentionItem } from '@aurum/core';
import { apiGet } from '@/lib/api';

export async function getPortfolioAttentionItems(): Promise<PortfolioAttentionItem[]> {
  return apiGet<PortfolioAttentionItem[]>('/v1/ai/attention-items');
}
