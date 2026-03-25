export type AITaskType =
  | 'portfolio_report_v1'
  | 'monthly_financial_review_v1'
  | 'daily_market_brief_v1'
  | 'portfolio_analysis_v1'
  | 'health_score_explainer_v1'
  | 'budget_analysis_v1'
  | 'followup_qa_v1';

export type AIProviderKind = 'manual_chatgpt' | 'openai' | 'anthropic' | 'local_model' | 'bedrock';

export type AIExecutionMode = 'manual' | 'api';

export type AIRunStatus =
  | 'draft'
  | 'prepared'
  | 'waiting_for_external_result'
  | 'completed'
  | 'failed';

export type PromptMessageRole = 'system' | 'user' | 'assistant';

export type AIOutputFormat = 'markdown' | 'json' | 'text';

export interface PromptMessage {
  role: PromptMessageRole;
  content: string;
}

export interface PromptPack {
  taskType: AITaskType;
  promptVersion: string;
  schemaVersion: string;
  title: string;
  messages: PromptMessage[];
  expectedOutputFormat?: AIOutputFormat;
  instructions?: string[];
  metadata?: Record<string, unknown>;
}

export interface AIRouteDecision {
  provider: AIProviderKind;
  executionMode: AIExecutionMode;
  reason: string;
}

export interface AIRunInput {
  taskType: AITaskType;
  payload: Record<string, unknown>;
  context?: Record<string, unknown>;
}

export interface AIRunRecord {
  id: string;
  taskType: AITaskType;
  provider: AIProviderKind;
  executionMode: AIExecutionMode;
  promptVersion: string;
  status: AIRunStatus;
  inputSummary?: string;
  promptPack: PromptPack;
  rawOutput?: string;
  createdAt: string;
  updatedAt: string;
}
