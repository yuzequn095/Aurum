import type { AIRunRecord, AIRunRepository } from '@aurum/core';
import { AI_RUNS_STORAGE_KEY } from '../storage-keys';

function getBrowserStorage(): Storage | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return window.localStorage;
}

function isAIRunRecord(value: unknown): value is AIRunRecord {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<AIRunRecord>;
  return typeof candidate.id === 'string';
}

export class LocalStorageAIRunRepository implements AIRunRepository {
  private readAll(): AIRunRecord[] {
    const storage = getBrowserStorage();
    if (!storage) {
      return [];
    }

    const raw = storage.getItem(AI_RUNS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.filter(isAIRunRecord);
    } catch {
      return [];
    }
  }

  private writeAll(records: AIRunRecord[]): void {
    const storage = getBrowserStorage();
    if (!storage) {
      return;
    }

    storage.setItem(AI_RUNS_STORAGE_KEY, JSON.stringify(records));
  }

  private upsert(run: AIRunRecord): AIRunRecord {
    const existing = this.readAll().filter((item) => item.id !== run.id);
    existing.push(run);
    this.writeAll(existing);
    return run;
  }

  create(run: AIRunRecord): AIRunRecord {
    return this.upsert(run);
  }

  update(run: AIRunRecord): AIRunRecord {
    return this.upsert(run);
  }

  getById(id: string): AIRunRecord | undefined {
    return this.readAll().find((run) => run.id === id);
  }

  list(): AIRunRecord[] {
    return this.readAll().sort((a, b) => {
      const aCreatedAt = typeof a.createdAt === 'string' ? a.createdAt : '';
      const bCreatedAt = typeof b.createdAt === 'string' ? b.createdAt : '';
      return bCreatedAt.localeCompare(aCreatedAt);
    });
  }
}
