import {
  AIConversationMessageRole,
  type AIConversationMessageRecord,
  type AIConversationRecord,
  type Prisma,
} from '@prisma/client';
import type {
  AIConversationContext,
  AIConversationDetailView,
  AIConversationMessageView,
  AIConversationSummaryView,
} from './ai-conversations.types';

type ConversationRecordWithMessages = AIConversationRecord & {
  messages: AIConversationMessageRecord[];
};

type ConversationSummaryRecord = AIConversationRecord & {
  _count: { messages: number };
  messages: Array<Pick<AIConversationMessageRecord, 'createdAt'>>;
};

function mapMetadata(
  metadata: Prisma.JsonValue | null,
): Record<string, unknown> | undefined {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return undefined;
  }

  return metadata as Record<string, unknown>;
}

function mapRole(
  role: AIConversationMessageRole,
): AIConversationMessageView['role'] {
  switch (role) {
    case AIConversationMessageRole.SYSTEM:
      return 'system';
    case AIConversationMessageRole.USER:
      return 'user';
    case AIConversationMessageRole.ASSISTANT:
      return 'assistant';
  }
}

function mapContext(record: {
  sourceSnapshotId: string | null;
  sourceReportId: string | null;
  sourceFinancialHealthScoreId: string | null;
}): AIConversationContext | undefined {
  const context: AIConversationContext = {
    sourceSnapshotId: record.sourceSnapshotId ?? undefined,
    sourceReportId: record.sourceReportId ?? undefined,
    sourceFinancialHealthScoreId:
      record.sourceFinancialHealthScoreId ?? undefined,
  };

  return Object.values(context).some((value) => value != null)
    ? context
    : undefined;
}

function mapMessage(
  record: AIConversationMessageRecord,
): AIConversationMessageView {
  return {
    id: record.id,
    role: mapRole(record.role),
    content: record.content,
    metadata: mapMetadata(record.metadata),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export function mapAIConversationDetailRecord(
  record: ConversationRecordWithMessages,
): AIConversationDetailView {
  return {
    id: record.id,
    title: record.title,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    context: mapContext(record),
    messages: record.messages.map(mapMessage),
  };
}

export function mapAIConversationSummaryRecord(
  record: ConversationSummaryRecord,
): AIConversationSummaryView {
  return {
    id: record.id,
    title: record.title,
    messageCount: record._count.messages,
    lastMessageAt: record.messages[0]?.createdAt.toISOString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    context: mapContext(record),
  };
}
