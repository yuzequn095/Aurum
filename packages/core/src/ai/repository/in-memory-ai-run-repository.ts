import type { AIRunRecord } from '../types';
import type { AIRunRepository } from './ai-run-repository';

export class InMemoryAIRunRepository implements AIRunRepository {
  private readonly runs = new Map<string, AIRunRecord>();

  create(run: AIRunRecord): AIRunRecord {
    this.runs.set(run.id, run);
    return run;
  }

  update(run: AIRunRecord): AIRunRecord {
    this.runs.set(run.id, run);
    return run;
  }

  getById(id: string): AIRunRecord | undefined {
    return this.runs.get(id);
  }

  list(): AIRunRecord[] {
    return Array.from(this.runs.values()).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }
}
