export type FinancialHealthDimension =
  | 'liquidity'
  | 'diversification'
  | 'concentration_risk'
  | 'portfolio_balance';

export type FinancialHealthGrade = 'excellent' | 'good' | 'fair' | 'needs_attention';

export interface FinancialHealthPositionInput {
  symbol: string;
  marketValue: number;
  portfolioWeight?: number;
  category?: string;
}

export interface FinancialHealthScoreInput {
  snapshotDate: string;
  totalAssets: number;
  cashValue?: number;
  positions: FinancialHealthPositionInput[];
}

export interface FinancialHealthDimensionScore {
  dimension: FinancialHealthDimension;
  score: number;
  maxScore: number;
  label: string;
  reason: string;
}

export interface FinancialHealthScoreResult {
  totalScore: number;
  maxScore: number;
  grade: FinancialHealthGrade;
  breakdown: FinancialHealthDimensionScore[];
  createdAt: string;
  metadata?: Record<string, unknown>;
}
