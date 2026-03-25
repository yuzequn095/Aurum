import { apiPost } from '@/lib/api';
import type { AIConversationContext } from './ai-conversations';

export interface QuickChatRequest {
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  sourceSnapshotId?: string;
  sourceReportId?: string;
  sourceFinancialHealthScoreId?: string;
}

export interface QuickChatResponse {
  mode: 'llm' | 'fallback';
  context?: AIConversationContext;
  reply: {
    role: 'assistant';
    content: string;
    createdAt: string;
  };
}

export async function runQuickChat(body: QuickChatRequest): Promise<QuickChatResponse> {
  return apiPost<QuickChatResponse>('/v1/ai/quick-chat', body);
}
