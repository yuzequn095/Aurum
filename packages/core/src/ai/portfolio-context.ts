import type {
  PortfolioChangeExplanation,
  PortfolioDiagnostics,
  PortfolioHistorySummary,
} from '../portfolio/types';

export type PortfolioChangeExplanationInput = PortfolioChangeExplanation;
export type PortfolioDiagnosticsInput = PortfolioDiagnostics;
export type PortfolioHistorySummaryInput = PortfolioHistorySummary;

/** Provider-neutral structured portfolio enrichment shared by prompt packs. */
export interface PortfolioAIContextInput {
  version: 'portfolio-ai-context-v1';
  diagnostics?: PortfolioDiagnosticsInput | null;
  changeExplanation?: PortfolioChangeExplanationInput | null;
  historySummary?: PortfolioHistorySummaryInput | null;
  dataLimitations?: string[];
}
