import type {
  FinancialHealthInsight,
  FinancialHealthScoreArtifact,
  FinancialHealthScoreResult,
} from '@aurum/core';
import type { FinancialHealthScoreRecord, Prisma } from '@prisma/client';

function mapJsonValue<T>(value: Prisma.JsonValue): T {
  return value as T;
}

function mapMetadata(
  metadata: Prisma.JsonValue | null,
): Record<string, unknown> | undefined {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return undefined;
  }

  return metadata as Record<string, unknown>;
}

export function mapFinancialHealthScoreRecordToArtifact(
  record: FinancialHealthScoreRecord,
): FinancialHealthScoreArtifact {
  return {
    id: record.id,
    sourceSnapshotId: record.sourceSnapshotId,
    scoringVersion: record.scoringVersion,
    result: mapJsonValue<FinancialHealthScoreResult>(record.result),
    insight: mapJsonValue<FinancialHealthInsight>(record.insight),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    metadata: mapMetadata(record.metadata),
  };
}
