import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';

export interface AIConversationContext {
  sourceSnapshotId?: string;
  sourceReportId?: string;
  sourceFinancialHealthScoreId?: string;
}

export interface AIConversationMessageView {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AIConversationSummaryView {
  id: string;
  title: string;
  messageCount: number;
  lastMessageAt?: string;
  createdAt: string;
  updatedAt: string;
  context?: AIConversationContext;
}

export interface AIConversationDetailView {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  context?: AIConversationContext;
  messages: AIConversationMessageView[];
}

export interface CreateAIConversationRequest {
  title: string;
  sourceSnapshotId?: string;
  sourceReportId?: string;
  sourceFinancialHealthScoreId?: string;
  messages?: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
    metadata?: Record<string, unknown>;
  }>;
}

export interface UpdateAIConversationRequest {
  title?: string;
}

export async function createAIConversation(
  body: CreateAIConversationRequest,
): Promise<AIConversationDetailView> {
  return apiPost<AIConversationDetailView>('/v1/ai-conversations', body);
}

export async function listAIConversations(): Promise<AIConversationSummaryView[]> {
  return apiGet<AIConversationSummaryView[]>('/v1/ai-conversations');
}

export async function getAIConversationById(id: string): Promise<AIConversationDetailView> {
  return apiGet<AIConversationDetailView>(`/v1/ai-conversations/${id}`);
}

export async function updateAIConversation(
  id: string,
  body: UpdateAIConversationRequest,
): Promise<AIConversationSummaryView> {
  return apiPatch<AIConversationSummaryView>(`/v1/ai-conversations/${id}`, body);
}

export async function deleteAIConversation(id: string): Promise<{ ok: true }> {
  return apiDelete<{ ok: true }>(`/v1/ai-conversations/${id}`);
}
