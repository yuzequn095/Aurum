import type { AIRunRepository } from '../repository';
import type { AIRunRecord } from '../types';

export function getAIRunById(
  repository: AIRunRepository,
  runId: string,
): AIRunRecord | undefined {
  return repository.getById(runId);
}
