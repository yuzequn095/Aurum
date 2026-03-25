import type { AIEntitlementFeatureKey } from '@/lib/api/entitlements';

export type AIInsightsSectionKey = 'reports' | 'analysis' | 'planning' | 'conversations';

export type AIInsightsEntryState = 'available' | 'preview' | 'coming-soon';

export interface AIInsightsCatalogEntry {
  id: string;
  section: AIInsightsSectionKey;
  title: string;
  description: string;
  state: AIInsightsEntryState;
  featureKey?: AIEntitlementFeatureKey;
  actionLabel: string;
  anchor: string;
}

export interface AIInsightsCatalogSection {
  key: AIInsightsSectionKey;
  title: string;
  description: string;
  anchor: string;
}

export const aiInsightsCatalogSections: AIInsightsCatalogSection[] = [
  {
    key: 'reports',
    title: 'Reports',
    description: 'Structured AI deliverables grounded in canonical portfolio snapshots.',
    anchor: 'reports',
  },
  {
    key: 'analysis',
    title: 'Analysis',
    description: 'Scores and deeper diagnostic views that explain portfolio and financial health.',
    anchor: 'analysis',
  },
  {
    key: 'planning',
    title: 'Planning',
    description: 'Forward-looking workflows for budgets, goals, and future guided plans.',
    anchor: 'planning',
  },
  {
    key: 'conversations',
    title: 'Conversations',
    description:
      'Ephemeral Quick Chat plus saved conversation history when you explicitly keep it.',
    anchor: 'conversations',
  },
];

export const aiInsightsCatalogEntries: AIInsightsCatalogEntry[] = [
  {
    id: 'monthly-financial-review',
    section: 'reports',
    title: 'Monthly Financial Review',
    description:
      'First-class report entry built on the current snapshot-linked report artifact flow.',
    state: 'available',
    featureKey: 'ai.report.snapshot_portfolio_report',
    actionLabel: 'Generate review',
    anchor: 'reports-monthly-review',
  },
  {
    id: 'daily-market-brief',
    section: 'reports',
    title: 'Daily Market Brief',
    description:
      'Reserved product slot for the daily brief workflow without overbuilding market execution yet.',
    state: 'coming-soon',
    featureKey: 'ai.report.daily_market_brief',
    actionLabel: 'Coming next',
    anchor: 'reports-daily-market-brief',
  },
  {
    id: 'financial-health-score',
    section: 'analysis',
    title: 'Financial Health Score',
    description: 'Server-backed score generation and history scoped to the selected snapshot.',
    state: 'available',
    featureKey: 'ai.analysis.financial_health_score',
    actionLabel: 'Generate score',
    anchor: 'analysis-financial-health-score',
  },
  {
    id: 'portfolio-analysis',
    section: 'analysis',
    title: 'Portfolio Analysis',
    description:
      'Use Quick Chat with selected context today while richer structured portfolio analysis evolves.',
    state: 'preview',
    featureKey: 'ai.analysis.portfolio_analysis',
    actionLabel: 'Use Quick Chat',
    anchor: 'analysis-portfolio-analysis',
  },
  {
    id: 'budget-planning',
    section: 'planning',
    title: 'Budget Planning',
    description: 'System-owned planning entry reserved for upcoming budget guidance workflows.',
    state: 'coming-soon',
    featureKey: 'ai.planning.budget',
    actionLabel: 'Coming next',
    anchor: 'planning-budget',
  },
  {
    id: 'goals-planning',
    section: 'planning',
    title: 'Goals Planning',
    description:
      'System-owned planning entry reserved for future goal and milestone planning support.',
    state: 'coming-soon',
    featureKey: 'ai.planning.goals',
    actionLabel: 'Coming next',
    anchor: 'planning-goals',
  },
  {
    id: 'quick-chat',
    section: 'conversations',
    title: 'Quick Chat',
    description:
      'Ephemeral by default, grounded in your selected snapshot, report, and score context.',
    state: 'available',
    featureKey: 'ai.quick_chat',
    actionLabel: 'Open Quick Chat',
    anchor: 'conversations-quick-chat',
  },
  {
    id: 'saved-conversations',
    section: 'conversations',
    title: 'Saved Conversations',
    description:
      'Persistent conversation history entered through Quick Chat -> Save -> Conversations.',
    state: 'available',
    featureKey: 'ai.conversations.save',
    actionLabel: 'Browse history',
    anchor: 'conversations-saved-history',
  },
];
