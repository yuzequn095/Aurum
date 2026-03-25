import type { AITaskDefinition } from '../task-definition';
import type { AITaskType } from '../types';
import { budgetAnalysisV1TaskDefinition } from './budget-analysis-v1';
import { dailyMarketBriefV1TaskDefinition } from './daily-market-brief-v1';
import { healthScoreExplainerV1TaskDefinition } from './health-score-explainer-v1';
import { monthlyFinancialReviewV1TaskDefinition } from './monthly-financial-review-v1';
import { portfolioAnalysisV1TaskDefinition } from './portfolio-analysis-v1';
import { portfolioReportV1TaskDefinition } from './portfolio-report-v1';

export const aiTaskRegistry: Partial<Record<AITaskType, AITaskDefinition<any>>> = {
  budget_analysis_v1: budgetAnalysisV1TaskDefinition,
  daily_market_brief_v1: dailyMarketBriefV1TaskDefinition,
  health_score_explainer_v1: healthScoreExplainerV1TaskDefinition,
  monthly_financial_review_v1: monthlyFinancialReviewV1TaskDefinition,
  portfolio_analysis_v1: portfolioAnalysisV1TaskDefinition,
  portfolio_report_v1: portfolioReportV1TaskDefinition,
};

export function getAITaskDefinition(
  taskType: AITaskType,
): AITaskDefinition<any> | undefined {
  return aiTaskRegistry[taskType];
}
