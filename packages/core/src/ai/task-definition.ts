import type { AITaskType, PromptPack } from './types';

export interface AITaskDefinition<TInput = unknown> {
  taskType: AITaskType;
  promptVersion: string;
  title: string;
  buildPromptPack(input: TInput): PromptPack;
  summarizeInput?(input: TInput): string;
}
