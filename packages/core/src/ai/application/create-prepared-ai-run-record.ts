import { prepareAIRun } from './prepare-ai-run';
import type { AIRunRepository } from '../repository';
import type { AIRunInput, AIRunRecord } from '../types';

function generateAIRunId(): string {
  return `airun_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createPreparedAIRunRecord(
  repository: AIRunRepository,
  input: AIRunInput,
): AIRunRecord {
  const prepared = prepareAIRun(input);
  const now = new Date().toISOString();

  const run: AIRunRecord = {
    id: generateAIRunId(),
    taskType: prepared.taskType,
    provider: prepared.provider,
    executionMode: prepared.executionMode,
    promptVersion: prepared.promptVersion,
    status: 'prepared',
    inputSummary: prepared.inputSummary,
    promptPack: prepared.promptPack,
    createdAt: now,
    updatedAt: now,
  };

  return repository.create(run);
}
