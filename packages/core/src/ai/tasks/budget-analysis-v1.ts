import type { AITaskDefinition } from '../task-definition';
import type { PromptPack } from '../types';
import { buildJsonBlock, buildPromptPackUserMessage, formatUsd } from './task-helpers';

export interface BudgetAnalysisCategoryInput {
  categoryName: string;
  amount: number;
}

export interface BudgetAnalysisInput {
  periodLabel: string;
  monthlyIncome: number;
  essentialExpenses: number;
  discretionaryExpenses: number;
  savingsAmount: number;
  targetSavingsRate?: number;
  topExpenseCategories: BudgetAnalysisCategoryInput[];
  planningGoals?: string[];
  pressurePoints?: string[];
}

const TASK_TYPE = 'budget_analysis_v1';
const PROMPT_VERSION = '1.0.0';
const TITLE = 'Budget Analysis';
const REQUIRED_HEADINGS = [
  '# Budget Analysis',
  '## Budget Snapshot',
  '## What Is Working',
  '## Pressure Points',
  '## Suggested Adjustments',
];

function buildUserMessage(input: BudgetAnalysisInput): string {
  return buildPromptPackUserMessage([
    'Prepare a budget analysis in markdown for Aurum planning workflows.',
    '',
    'Use the exact headings below and focus on practical budgeting guidance rather than generic personal finance tips.',
    ...REQUIRED_HEADINGS,
    '',
    'Budget context:',
    buildJsonBlock({
      periodLabel: input.periodLabel,
      monthlyIncome: input.monthlyIncome,
      essentialExpenses: input.essentialExpenses,
      discretionaryExpenses: input.discretionaryExpenses,
      savingsAmount: input.savingsAmount,
      targetSavingsRate: input.targetSavingsRate ?? null,
      topExpenseCategories: input.topExpenseCategories,
      planningGoals: input.planningGoals ?? [],
      pressurePoints: input.pressurePoints ?? [],
    }),
    '',
    'Requirements:',
    '- Highlight one or two healthy patterns that should be preserved.',
    '- Call out the clearest budget pressure points.',
    '- Suggest realistic adjustments with near-term implementation steps.',
  ]);
}

export const budgetAnalysisV1TaskDefinition: AITaskDefinition<BudgetAnalysisInput> = {
  taskType: TASK_TYPE,
  promptVersion: PROMPT_VERSION,
  title: TITLE,
  buildPromptPack(input: BudgetAnalysisInput): PromptPack {
    return {
      taskType: TASK_TYPE,
      promptVersion: PROMPT_VERSION,
      schemaVersion: '1.0.0',
      title: TITLE,
      messages: [
        {
          role: 'system',
          content:
            'You are Aurum, a budgeting analysis assistant. Produce clear markdown guidance that helps a user understand their budget posture and take realistic next steps.',
        },
        {
          role: 'user',
          content: buildUserMessage(input),
        },
      ],
      expectedOutputFormat: 'markdown',
      instructions: [
        'Use the exact required headings in order.',
        'Base the analysis only on the supplied budget data.',
        'Keep suggestions grounded and implementation-ready.',
      ],
      metadata: {
        periodLabel: input.periodLabel,
        monthlyIncome: input.monthlyIncome,
        topExpenseCategoryCount: input.topExpenseCategories.length,
      },
    };
  },
  summarizeInput(input: BudgetAnalysisInput): string {
    return `${input.periodLabel} budget with income ${formatUsd(input.monthlyIncome)} and savings ${formatUsd(input.savingsAmount)}.`;
  },
};
