import type { AITaskDefinition } from '../task-definition';
import type { PromptPack } from '../types';
import { buildJsonBlock, buildPromptPackUserMessage } from './task-helpers';

export interface HealthScoreExplainerDimensionInput {
  dimension: string;
  score: number;
  maxScore: number;
  label: string;
  reason: string;
}

export interface HealthScoreExplainerInput {
  portfolioName?: string;
  snapshotDate: string;
  totalScore: number;
  maxScore: number;
  grade: string;
  headline?: string;
  summary?: string;
  breakdown: HealthScoreExplainerDimensionInput[];
}

const TASK_TYPE = 'health_score_explainer_v1';
const PROMPT_VERSION = '1.0.0';
const TITLE = 'Financial Health Score Explainer';
const REQUIRED_HEADINGS = [
  '# Financial Health Score',
  '## Headline',
  '## Score Breakdown',
  '## What This Means',
  '## Recommended Actions',
];

function buildUserMessage(input: HealthScoreExplainerInput): string {
  return buildPromptPackUserMessage([
    'Explain a Financial Health Score artifact in structured markdown.',
    '',
    'Use the exact headings below and make the explanation understandable to a non-expert user without losing analytical precision.',
    ...REQUIRED_HEADINGS,
    '',
    'Score context:',
    buildJsonBlock({
      portfolioName: input.portfolioName ?? null,
      snapshotDate: input.snapshotDate,
      totalScore: input.totalScore,
      maxScore: input.maxScore,
      grade: input.grade,
      headline: input.headline ?? null,
      summary: input.summary ?? null,
      breakdown: input.breakdown,
    }),
    '',
    'Requirements:',
    '- Explain the strongest and weakest dimensions.',
    '- Translate technical scoring language into plain English.',
    '- Keep the actions practical and framed as improvements, not warnings only.',
  ]);
}

export const healthScoreExplainerV1TaskDefinition: AITaskDefinition<HealthScoreExplainerInput> = {
  taskType: TASK_TYPE,
  promptVersion: PROMPT_VERSION,
  title: TITLE,
  buildPromptPack(input: HealthScoreExplainerInput): PromptPack {
    return {
      taskType: TASK_TYPE,
      promptVersion: PROMPT_VERSION,
      schemaVersion: '1.0.0',
      title: TITLE,
      messages: [
        {
          role: 'system',
          content:
            'You are Aurum, a financial health explainer. Convert structured scoring output into clear markdown that explains what the score means, why it was earned, and what to improve next.',
        },
        {
          role: 'user',
          content: buildUserMessage(input),
        },
      ],
      expectedOutputFormat: 'markdown',
      instructions: [
        'Use the exact required headings.',
        'Ground all explanations in the provided score artifact.',
        'Be supportive and concrete, not alarmist.',
      ],
      metadata: {
        portfolioName: input.portfolioName,
        snapshotDate: input.snapshotDate,
        totalScore: input.totalScore,
        grade: input.grade,
      },
    };
  },
  summarizeInput(input: HealthScoreExplainerInput): string {
    return `${input.portfolioName ?? 'Portfolio'} score ${input.totalScore}/${input.maxScore} (${input.grade}) on ${input.snapshotDate}.`;
  },
};
