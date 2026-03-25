export interface QuickChatContextView {
  sourceSnapshotId?: string;
  sourceReportId?: string;
  sourceFinancialHealthScoreId?: string;
}

export interface QuickChatReplyView {
  role: 'assistant';
  content: string;
  createdAt: string;
}

export interface QuickChatResponseView {
  mode: 'llm' | 'fallback';
  context?: QuickChatContextView;
  reply: QuickChatReplyView;
}
