import type { AIRunRepository } from '../repository';
import type { AIRunRecord } from '../types';

export function submitManualResult(
  repository: AIRunRepository,
  runId: string,
  rawOutput: string,
): AIRunRecord {
  const existing = repository.getById(runId);
  if (!existing) {
    throw new Error(`AI run not found for id: ${runId}`);
  }

  const updated: AIRunRecord = {
    ...existing,
    rawOutput,
    status: 'completed',
    updatedAt: new Date().toISOString(),
  };

  return repository.update(updated);
}
