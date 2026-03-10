import type { AIRunRecord } from '../types';

export interface AIRunRepository {
  create(run: AIRunRecord): AIRunRecord;
  update(run: AIRunRecord): AIRunRecord;
  getById(id: string): AIRunRecord | undefined;
  list(): AIRunRecord[];
}
