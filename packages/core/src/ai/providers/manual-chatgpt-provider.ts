import { getAITaskDefinition } from '../tasks';
import type { AIRouteDecision, AIRunInput } from '../types';
import type { AIProviderAdapter, PrepareRunResult } from './provider-adapter';

const MANUAL_CHATGPT_SUPPORTED_TASKS: AIRunInput['taskType'][] = ['portfolio_report_v1'];

export const manualChatGPTProvider: AIProviderAdapter = {
  kind: 'manual_chatgpt',
  executionMode: 'manual',
  supports(taskType: AIRunInput['taskType']): boolean {
    return MANUAL_CHATGPT_SUPPORTED_TASKS.includes(taskType);
  },
  prepareRun(input: AIRunInput): PrepareRunResult {
    if (!this.supports(input.taskType)) {
      throw new Error(`manual_chatgpt does not support task type: ${input.taskType}`);
    }

    const taskDefinition = getAITaskDefinition(input.taskType);
    if (!taskDefinition) {
      throw new Error(`Task definition not found for task type: ${input.taskType}`);
    }

    const promptPack = taskDefinition.buildPromptPack(input.payload);
    const inputSummary =
      typeof taskDefinition.summarizeInput === 'function'
        ? taskDefinition.summarizeInput(input.payload)
        : undefined;

    const route: AIRouteDecision = {
      provider: 'manual_chatgpt',
      executionMode: 'manual',
      reason: 'Phase 1 manual workflow policy',
    };

    return {
      route,
      promptPack,
      inputSummary,
    };
  },
};
