import { manualChatGPTProvider } from '../providers';
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
  const prepared = manualChatGPTProvider.prepareRun(input);

  return {
    taskType: input.taskType,
    provider: prepared.route.provider,
    executionMode: prepared.route.executionMode,
    promptVersion: prepared.promptPack.promptVersion,
    status: 'prepared',
    inputSummary: prepared.inputSummary,
    promptPack: prepared.promptPack,
  };
}
