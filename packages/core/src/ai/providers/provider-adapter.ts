import type {
  AIExecutionMode,
  AIProviderKind,
  AIRouteDecision,
  AIRunInput,
  PromptPack,
} from '../types';

export interface PrepareRunResult {
  route: AIRouteDecision;
  promptPack: PromptPack;
  inputSummary?: string;
}

export interface AIProviderAdapter {
  kind: AIProviderKind;
  executionMode: AIExecutionMode;
  supports(taskType: AIRunInput['taskType']): boolean;
  prepareRun(input: AIRunInput): PrepareRunResult;
}
