import type { AIReportArtifact } from '@aurum/core';
import type { AIReportRecord, Prisma } from '@prisma/client';

function mapMetadata(
  metadata: Prisma.JsonValue | null,
): Record<string, unknown> | undefined {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return undefined;
  }

  return metadata as Record<string, unknown>;
}

export function mapAIReportRecordToArtifact(
  record: AIReportRecord,
): AIReportArtifact {
  return {
    id: record.id,
    reportType: record.reportType as AIReportArtifact['reportType'],
    taskType: record.taskType as AIReportArtifact['taskType'],
    sourceRunId: record.sourceRunId,
    sourceSnapshotId: record.sourceSnapshotId ?? undefined,
    title: record.title,
    contentMarkdown: record.contentMarkdown,
    promptVersion: record.promptVersion,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    metadata: mapMetadata(record.metadata),
  };
}
