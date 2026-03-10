import type { AIRunRepository } from '../repository';
import type { AIRunRecord } from '../types';

export function listAIRuns(repository: AIRunRepository): AIRunRecord[] {
  return repository.list();
}
