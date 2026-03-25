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
