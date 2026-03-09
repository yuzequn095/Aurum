import type { AITaskDefinition } from '../task-definition';
import type { AITaskType } from '../types';
import { portfolioReportV1TaskDefinition } from './portfolio-report-v1';

export const aiTaskRegistry: Partial<Record<AITaskType, AITaskDefinition<any>>> = {
  portfolio_report_v1: portfolioReportV1TaskDefinition,
};

export function getAITaskDefinition(
  taskType: AITaskType,
): AITaskDefinition<any> | undefined {
  return aiTaskRegistry[taskType];
}
