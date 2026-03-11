import type { AIReportArtifact, AIReportRepository } from '@aurum/core';
import { AI_REPORTS_STORAGE_KEY } from '../storage-keys';

function getBrowserStorage(): Storage | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return window.localStorage;
}

function isAIReportArtifact(value: unknown): value is AIReportArtifact {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<AIReportArtifact>;
  return typeof candidate.id === 'string';
}

export class LocalStorageAIReportRepository implements AIReportRepository {
  private readAll(): AIReportArtifact[] {
    const storage = getBrowserStorage();
    if (!storage) {
      return [];
    }

    const raw = storage.getItem(AI_REPORTS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.filter(isAIReportArtifact);
    } catch {
      return [];
    }
  }

  private writeAll(reports: AIReportArtifact[]): void {
    const storage = getBrowserStorage();
    if (!storage) {
      return;
    }

    storage.setItem(AI_REPORTS_STORAGE_KEY, JSON.stringify(reports));
  }

  private upsert(report: AIReportArtifact): AIReportArtifact {
    const existing = this.readAll().filter((item) => item.id !== report.id);
    existing.push(report);
    this.writeAll(existing);
    return report;
  }

  create(report: AIReportArtifact): AIReportArtifact {
    return this.upsert(report);
  }

  update(report: AIReportArtifact): AIReportArtifact {
    return this.upsert(report);
  }

  getById(id: string): AIReportArtifact | undefined {
    return this.readAll().find((report) => report.id === id);
  }

  list(): AIReportArtifact[] {
    return this.readAll().sort((a, b) => {
      const aCreatedAt = typeof a.createdAt === 'string' ? a.createdAt : '';
      const bCreatedAt = typeof b.createdAt === 'string' ? b.createdAt : '';
      return bCreatedAt.localeCompare(aCreatedAt);
    });
  }
}
