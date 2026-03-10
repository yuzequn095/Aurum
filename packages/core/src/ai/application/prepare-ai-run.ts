import { getAIProviderAdapter } from '../providers';
import { DefaultAIRouter } from '../router';
import type {
  AIExecutionMode,
  AIProviderKind,
  AIRunInput,
  AITaskType,
  PromptPack,
} from '../types';

export interface PreparedAIRunDraft {
  taskType: AITaskType;
  provider: AIProviderKind;
  executionMode: AIExecutionMode;
  promptVersion: string;
  status: 'prepared';
  inputSummary?: string;
  promptPack: PromptPack;
}

export function prepareAIRun(input: AIRunInput): PreparedAIRunDraft {
  const router = new DefaultAIRouter();
  const route = router.resolve(input.taskType);

  const provider = getAIProviderAdapter(route.provider);
  if (!provider) {
    throw new Error(`No provider adapter found for provider: ${route.provider}`);
  }

  if (!provider.supports(input.taskType)) {
    throw new Error(`Provider ${route.provider} does not support task type: ${input.taskType}`);
  }

  const prepared = provider.prepareRun(input);

  return {
    taskType: input.taskType,
    provider: route.provider,
    executionMode: route.executionMode,
    promptVersion: prepared.promptPack.promptVersion,
    status: 'prepared',
    inputSummary: prepared.inputSummary,
    promptPack: prepared.promptPack,
  };
}
