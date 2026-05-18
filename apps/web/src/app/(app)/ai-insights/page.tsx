'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import {
  CsvPortfolioSnapshotAdapter,
  type AIReportArtifact,
  type FinancialHealthScoreArtifact,
  type PortfolioSnapshot,
} from '@aurum/core';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { mockPortfolioCsvImportInput } from '@/lib/ai/dev-seeds';
import {
  aiInsightsCatalogEntries,
  aiInsightsCatalogSections,
  type AIInsightsCatalogEntry,
  type AIInsightsSectionKey,
} from '@/lib/ai/insights-catalog';
import {
  createAIConversation,
  deleteAIConversation,
  getAIConversationById,
  listAIConversations,
  type AIConversationContext,
  type AIConversationDetailView,
  type AIConversationSummaryView,
} from '@/lib/api/ai-conversations';
import { createPortfolioSnapshot, listPortfolioSnapshots } from '@/lib/api/portfolio-snapshots';
import { listAIReports } from '@/lib/api/ai-reports';
import {
  createDailyMarketBrief,
  getDailyMarketBriefPreferences,
  updateDailyMarketBriefPreferences,
  type DailyMarketBriefPreferenceView,
  type DailyMarketBriefScope,
} from '@/lib/api/daily-market-brief';
import {
  createFinancialHealthScoreForSnapshot,
  listFinancialHealthScoresBySourceSnapshotId,
} from '@/lib/api/financial-health-scores';
import {
  getCurrentUserEntitlements,
  type CurrentUserEntitlementsView,
} from '@/lib/api/entitlements';
import { createMonthlyFinancialReview } from '@/lib/api/monthly-financial-review';
import { runQuickChat } from '@/lib/api/quick-chat';

type QuickChatTranscriptMessage = {
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  mode?: 'llm' | 'fallback';
};

function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatMonthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function formatReportTypeLabel(reportType: AIReportArtifact['reportType']): string {
  switch (reportType) {
    case 'monthly_financial_review_v1':
      return 'Monthly Financial Review';
    case 'daily_market_brief_v1':
      return 'Daily Market Brief';
    case 'portfolio_report_v1':
    default:
      return 'Portfolio Report';
  }
}

function getLatestCompletedMonthPreset(referenceDate = new Date()) {
  const year = referenceDate.getUTCFullYear();
  const monthIndex = referenceDate.getUTCMonth();

  if (monthIndex === 0) {
    return {
      year: year - 1,
      month: 12,
    };
  }

  return {
    year,
    month: monthIndex,
  };
}

function getStringMetadataValue(
  report: AIReportArtifact | undefined,
  key: string,
): string | undefined {
  if (!report) {
    return undefined;
  }

  const value = report.metadata?.[key];
  return typeof value === 'string' ? value : undefined;
}

function formatDimensionName(value: string): string {
  return value
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function normalizeConversationContext(input: {
  sourceSnapshotId?: string | null;
  sourceReportId?: string | null;
  sourceFinancialHealthScoreId?: string | null;
}): AIConversationContext | undefined {
  const context: AIConversationContext = {
    sourceSnapshotId: input.sourceSnapshotId ?? undefined,
    sourceReportId: input.sourceReportId ?? undefined,
    sourceFinancialHealthScoreId: input.sourceFinancialHealthScoreId ?? undefined,
  };

  return Object.values(context).some((value) => value != null) ? context : undefined;
}

function formatConversationContextSummary(context?: AIConversationContext): string {
  if (!context) {
    return 'No linked snapshot, report, or score context.';
  }

  const labels: string[] = [];
  if (context.sourceSnapshotId) {
    labels.push(`Snapshot ${context.sourceSnapshotId}`);
  }
  if (context.sourceReportId) {
    labels.push(`Report ${context.sourceReportId}`);
  }
  if (context.sourceFinancialHealthScoreId) {
    labels.push(`Score ${context.sourceFinancialHealthScoreId}`);
  }

  return labels.join(' | ');
}

function getFirstUserMessage(
  messages: QuickChatTranscriptMessage[],
): QuickChatTranscriptMessage | undefined {
  return messages.find((message) => message.role === 'user');
}

function buildConversationTitle(input: {
  messages: QuickChatTranscriptMessage[];
  snapshotName?: string;
  reportTitle?: string;
  scoreHeadline?: string;
}): string {
  if (input.reportTitle?.trim()) {
    return `${input.reportTitle.trim()} Chat`.slice(0, 160);
  }

  if (input.snapshotName?.trim()) {
    return `${input.snapshotName.trim()} Quick Chat`.slice(0, 160);
  }

  if (input.scoreHeadline?.trim()) {
    return input.scoreHeadline.trim().slice(0, 160);
  }

  const firstUserMessage = getFirstUserMessage(input.messages)?.content.trim();
  if (firstUserMessage) {
    return firstUserMessage.slice(0, 160);
  }

  return 'Saved Quick Chat';
}

function hasEnabledFeature(
  entitlements: CurrentUserEntitlementsView | null,
  featureKey: CurrentUserEntitlementsView['enabledFeatureKeys'][number],
): boolean {
  return entitlements == null || entitlements.enabledFeatureKeys.includes(featureKey);
}

function getCatalogEntryStateVariant(
  entry: AIInsightsCatalogEntry,
  enabled: boolean,
): 'good' | 'info' | 'warn' | 'neutral' {
  if (!enabled) {
    return 'warn';
  }

  switch (entry.state) {
    case 'available':
      return 'good';
    case 'preview':
      return 'info';
    case 'coming-soon':
    default:
      return 'neutral';
  }
}

function getCatalogEntryStateLabel(entry: AIInsightsCatalogEntry, enabled: boolean): string {
  if (!enabled) {
    return 'Locked';
  }

  switch (entry.state) {
    case 'available':
      return 'Available';
    case 'preview':
      return 'Preview';
    case 'coming-soon':
    default:
      return 'Coming Soon';
  }
}

function scrollToAnchor(anchor: string) {
  if (typeof document === 'undefined') {
    return;
  }

  document.getElementById(anchor)?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
}

function StatusNote({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'warn' | 'error' | 'good';
}) {
  const toneClassName =
    tone === 'error'
      ? 'border-[var(--aurum-danger)]/30 bg-[var(--aurum-danger)]/10 text-[var(--aurum-danger)]'
      : tone === 'warn'
        ? 'border-[var(--aurum-warning)]/25 bg-[rgba(185,133,25,0.1)] text-aurum-text'
        : tone === 'good'
          ? 'border-[var(--aurum-success)]/25 bg-[rgba(27,156,100,0.1)] text-aurum-text'
          : 'border-aurum-border bg-aurum-surface text-aurum-text';

  return (
    <p className={`rounded-[14px] border px-3 py-2 text-xs leading-5 ${toneClassName}`}>
      {children}
    </p>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  badge,
}: {
  eyebrow: string;
  title: string;
  description: string;
  badge?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-aurum-muted">
            {eyebrow}
          </p>
          {badge}
        </div>
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight text-aurum-text">{title}</h2>
          <p className="max-w-3xl text-sm leading-7 text-aurum-muted">{description}</p>
        </div>
      </div>
    </div>
  );
}

function MetadataTile({
  label,
  value,
  breakAll,
}: {
  label: string;
  value: ReactNode;
  breakAll?: boolean;
}) {
  return (
    <div className="rounded-[16px] border border-aurum-border bg-aurum-surface px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-aurum-muted">
        {label}
      </p>
      <p className={`mt-2 text-sm font-medium text-aurum-text ${breakAll ? 'break-all' : ''}`}>
        {value}
      </p>
    </div>
  );
}

function MarkdownReportContent({ content }: { content: string }) {
  const blocks = content
    .trim()
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (blocks.length === 0) {
    return <p className="text-sm text-aurum-muted">This report has no readable content yet.</p>;
  }

  return (
    <div className="space-y-4 text-sm leading-7 text-aurum-text">
      {blocks.map((block, index) => {
        if (block.startsWith('```')) {
          return (
            <pre
              key={`${index}-${block.slice(0, 12)}`}
              className="aurum-scrollbar overflow-auto rounded-[16px] border border-aurum-border bg-aurum-surface-alt p-4 text-xs leading-6 text-aurum-text"
            >
              {block.replace(/^```[a-zA-Z]*\n?|\n?```$/g, '')}
            </pre>
          );
        }

        const headingMatch = block.match(/^(#{1,4})\s+(.+)$/);
        if (headingMatch) {
          const [, hashes, text] = headingMatch;
          const headingClassName =
            hashes.length <= 2
              ? 'text-xl font-semibold tracking-tight text-aurum-text'
              : 'text-base font-semibold text-aurum-text';
          return (
            <h3 key={`${index}-${text}`} className={headingClassName}>
              {text}
            </h3>
          );
        }

        const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
        const bulletLines = lines.filter((line) => /^[-*]\s+/.test(line));
        const orderedLines = lines.filter((line) => /^\d+\.\s+/.test(line));

        if (bulletLines.length === lines.length) {
          return (
            <ul key={`${index}-${block.slice(0, 12)}`} className="space-y-2">
              {bulletLines.map((line) => (
                <li
                  key={line}
                  className="rounded-[14px] border border-aurum-border bg-aurum-surface px-4 py-3"
                >
                  {line.replace(/^[-*]\s+/, '')}
                </li>
              ))}
            </ul>
          );
        }

        if (orderedLines.length === lines.length) {
          return (
            <ol key={`${index}-${block.slice(0, 12)}`} className="space-y-2">
              {orderedLines.map((line) => (
                <li
                  key={line}
                  className="rounded-[14px] border border-aurum-border bg-aurum-surface px-4 py-3"
                >
                  {line.replace(/^\d+\.\s+/, '')}
                </li>
              ))}
            </ol>
          );
        }

        return (
          <p
            key={`${index}-${block.slice(0, 12)}`}
            className="whitespace-pre-wrap rounded-[16px] border border-transparent bg-transparent"
          >
            {block.replace(/\*\*/g, '')}
          </p>
        );
      })}
    </div>
  );
}

function ScoreGauge({
  score,
  maxScore,
}: {
  score: number;
  maxScore: number;
}) {
  const percent = maxScore > 0 ? Math.max(0, Math.min(100, (score / maxScore) * 100)) : 0;

  return (
    <div className="space-y-2">
      <div className="h-2.5 overflow-hidden rounded-full bg-[rgba(212,175,55,0.14)]">
        <div
          className="h-full rounded-full bg-[var(--aurum-accent)]"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-xs text-aurum-muted">{Math.round(percent)}% of available score</p>
    </div>
  );
}

function TranscriptBubble({
  role,
  content,
  createdAt,
  mode,
}: {
  role: string;
  content: string;
  createdAt: string;
  mode?: 'llm' | 'fallback';
}) {
  const assistant = role === 'assistant';

  return (
    <div
      className={`rounded-[18px] border px-4 py-3 text-sm ${
        assistant
          ? 'border-[var(--aurum-accent)]/25 bg-[rgba(212,175,55,0.12)]'
          : role === 'system'
            ? 'border-dashed border-aurum-border bg-aurum-surface-alt'
            : 'border-aurum-border bg-aurum-surface'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-aurum-muted">
          {assistant ? 'Aurum' : role === 'user' ? 'You' : role}
        </p>
        <p className="text-[11px] text-aurum-muted">{formatDateTime(createdAt)}</p>
      </div>
      <p className="mt-2 whitespace-pre-wrap leading-7 text-aurum-text">{content}</p>
      {mode ? (
        <Badge variant={mode === 'llm' ? 'good' : 'neutral'} className="mt-3">
          {mode === 'llm' ? 'Provider reply' : 'Fallback reply'}
        </Badge>
      ) : null}
    </div>
  );
}

export default function AiInsightsPage() {
  const defaultReviewPeriod = getLatestCompletedMonthPreset();
  const [snapshots, setSnapshots] = useState<PortfolioSnapshot[]>([]);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const [isSnapshotsLoading, setIsSnapshotsLoading] = useState(false);
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [snapshotsStatusMessage, setSnapshotsStatusMessage] = useState('');
  const [reports, setReports] = useState<AIReportArtifact[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [isReportsLoading, setIsReportsLoading] = useState(false);
  const [reportsStatusMessage, setReportsStatusMessage] = useState('');
  const [monthlyReviewStatusMessage, setMonthlyReviewStatusMessage] = useState<string>('');
  const [isGeneratingMonthlyReview, setIsGeneratingMonthlyReview] = useState(false);
  const [reviewYear, setReviewYear] = useState<number>(defaultReviewPeriod.year);
  const [reviewMonth, setReviewMonth] = useState<number>(defaultReviewPeriod.month);
  const [useSelectedSnapshotOverride, setUseSelectedSnapshotOverride] = useState(false);
  const [isGeneratingDailyMarketBrief, setIsGeneratingDailyMarketBrief] = useState(false);
  const [dailyMarketBriefStatusMessage, setDailyMarketBriefStatusMessage] = useState('');
  const [dailyMarketBriefScope, setDailyMarketBriefScope] =
    useState<DailyMarketBriefScope>('portfolio_aware');
  const [useSelectedSnapshotForDailyMarketBrief, setUseSelectedSnapshotForDailyMarketBrief] =
    useState(false);
  const [dailyMarketBriefPreferences, setDailyMarketBriefPreferences] =
    useState<DailyMarketBriefPreferenceView | null>(null);
  const [
    useSelectedSnapshotForDailyMarketBriefDelivery,
    setUseSelectedSnapshotForDailyMarketBriefDelivery,
  ] = useState(false);
  const [isDailyMarketBriefPreferencesSaving, setIsDailyMarketBriefPreferencesSaving] =
    useState(false);
  const [dailyMarketBriefPreferencesStatusMessage, setDailyMarketBriefPreferencesStatusMessage] =
    useState('');
  const [scores, setScores] = useState<FinancialHealthScoreArtifact[]>([]);
  const [selectedScoreId, setSelectedScoreId] = useState<string | null>(null);
  const [isScoresLoading, setIsScoresLoading] = useState(false);
  const [isGeneratingScore, setIsGeneratingScore] = useState(false);
  const [scoreStatusMessage, setScoreStatusMessage] = useState<string>('');
  const [entitlements, setEntitlements] = useState<CurrentUserEntitlementsView | null>(null);
  const [entitlementsStatusMessage, setEntitlementsStatusMessage] = useState('');
  const [quickChatMessages, setQuickChatMessages] = useState<QuickChatTranscriptMessage[]>([]);
  const [quickChatDraft, setQuickChatDraft] = useState('');
  const [quickChatContext, setQuickChatContext] = useState<AIConversationContext | undefined>();
  const [quickChatStatusMessage, setQuickChatStatusMessage] = useState('');
  const [isQuickChatRunning, setIsQuickChatRunning] = useState(false);
  const [isSavingConversation, setIsSavingConversation] = useState(false);
  const [lastSavedConversationId, setLastSavedConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<AIConversationSummaryView[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<AIConversationDetailView | null>(
    null,
  );
  const [isConversationsLoading, setIsConversationsLoading] = useState(false);
  const [isConversationDetailLoading, setIsConversationDetailLoading] = useState(false);
  const [isDeletingConversation, setIsDeletingConversation] = useState(false);
  const [conversationStatusMessage, setConversationStatusMessage] = useState('');

  const selectedReport = reports.find((report) => report.id === selectedReportId);
  const selectedSnapshot = selectedSnapshotId
    ? snapshots.find((snapshot) => snapshot.id === selectedSnapshotId)
    : undefined;
  const selectedScore = scores.find((score) => score.id === selectedScoreId);
  const selectedScoreResult = selectedScore?.result;
  const selectedScoreInsight = selectedScore?.insight;
  const selectedContext = normalizeConversationContext({
    sourceSnapshotId: selectedSnapshotId,
    sourceReportId: selectedReportId,
    sourceFinancialHealthScoreId: selectedScoreId,
  });
  const activeQuickChatContext =
    quickChatMessages.length > 0 ? quickChatContext : (quickChatContext ?? selectedContext);
  const quickChatEnabled = hasEnabledFeature(entitlements, 'ai.quick_chat');
  const conversationSaveEnabled = hasEnabledFeature(entitlements, 'ai.conversations.save');
  const quickChatSnapshot = activeQuickChatContext?.sourceSnapshotId
    ? snapshots.find((snapshot) => snapshot.id === activeQuickChatContext.sourceSnapshotId)
    : undefined;
  const quickChatReport = activeQuickChatContext?.sourceReportId
    ? reports.find((report) => report.id === activeQuickChatContext.sourceReportId)
    : undefined;
  const quickChatScore = activeQuickChatContext?.sourceFinancialHealthScoreId
    ? scores.find((score) => score.id === activeQuickChatContext.sourceFinancialHealthScoreId)
    : undefined;
  const financialHealthScoreEnabled = hasEnabledFeature(
    entitlements,
    'ai.analysis.financial_health_score',
  );
  const portfolioAnalysisEnabled = hasEnabledFeature(
    entitlements,
    'ai.analysis.portfolio_analysis',
  );
  const monthlyReviewEnabled = hasEnabledFeature(
    entitlements,
    'ai.report.monthly_financial_review',
  );
  const dailyMarketBriefEnabled = hasEnabledFeature(entitlements, 'ai.report.daily_market_brief');
  const effectiveReviewMonthLabel = formatMonthLabel(reviewYear, reviewMonth);
  const sectionEntries = aiInsightsCatalogSections.reduce(
    (accumulator, section) => ({
      ...accumulator,
      [section.key]: aiInsightsCatalogEntries.filter((entry) => entry.section === section.key),
    }),
    {} as Record<AIInsightsSectionKey, AIInsightsCatalogEntry[]>,
  );
  const sectionCounts: Record<AIInsightsSectionKey, number> = {
    reports: reports.length,
    analysis: scores.length,
    planning: sectionEntries.planning.length,
    conversations: conversations.length,
  };

  const loadSnapshots = async () => {
    setIsSnapshotsLoading(true);
    setSnapshotsStatusMessage('');

    try {
      const nextSnapshots = await listPortfolioSnapshots();
      setSnapshots(nextSnapshots);

      if (nextSnapshots.length === 0) {
        setSelectedSnapshotId(null);
        setSnapshotsStatusMessage('No persisted snapshots found yet.');
        return;
      }

      setSelectedSnapshotId((currentSelectedId) => {
        const hasCurrent = currentSelectedId
          ? nextSnapshots.some((snapshot) => snapshot.id === currentSelectedId)
          : false;
        return hasCurrent ? currentSelectedId : (nextSnapshots[0].id ?? null);
      });
      setSnapshotsStatusMessage(`Loaded ${nextSnapshots.length} persisted snapshots.`);
    } catch (error) {
      setSnapshotsStatusMessage(
        error instanceof Error ? error.message : 'Failed to load snapshots from API.',
      );
    } finally {
      setIsSnapshotsLoading(false);
    }
  };

  const loadEntitlements = async () => {
    setEntitlementsStatusMessage('');

    try {
      const nextEntitlements = await getCurrentUserEntitlements();
      setEntitlements(nextEntitlements);
    } catch (error) {
      setEntitlementsStatusMessage(
        error instanceof Error ? error.message : 'Failed to load AI entitlements.',
      );
    }
  };

  const loadDailyMarketBriefPreferences = async () => {
    setDailyMarketBriefPreferencesStatusMessage('');

    try {
      const nextPreferences = await getDailyMarketBriefPreferences();
      setDailyMarketBriefPreferences(nextPreferences);
      setUseSelectedSnapshotForDailyMarketBriefDelivery(Boolean(nextPreferences.sourceSnapshotId));
    } catch (error) {
      setDailyMarketBriefPreferencesStatusMessage(
        error instanceof Error
          ? error.message
          : 'Failed to load Daily Market Brief delivery preferences.',
      );
    }
  };

  const loadConversations = async (preferredConversationId?: string) => {
    setIsConversationsLoading(true);
    setConversationStatusMessage('');

    try {
      const nextConversations = await listAIConversations();
      setConversations(nextConversations);
      setSelectedConversationId((currentSelectedId) => {
        if (
          preferredConversationId &&
          nextConversations.some((conversation) => conversation.id === preferredConversationId)
        ) {
          return preferredConversationId;
        }

        const hasCurrent = currentSelectedId
          ? nextConversations.some((conversation) => conversation.id === currentSelectedId)
          : false;
        return hasCurrent ? currentSelectedId : (nextConversations[0]?.id ?? null);
      });
      if (nextConversations.length === 0) {
        setSelectedConversation(null);
        setConversationStatusMessage('No saved conversations yet.');
      }
    } catch (error) {
      setConversationStatusMessage(
        error instanceof Error ? error.message : 'Failed to load saved conversations.',
      );
    } finally {
      setIsConversationsLoading(false);
    }
  };

  const loadConversationDetail = async (conversationId: string) => {
    setIsConversationDetailLoading(true);

    try {
      const nextConversation = await getAIConversationById(conversationId);
      setSelectedConversation(nextConversation);
    } catch (error) {
      setSelectedConversation(null);
      setConversationStatusMessage(
        error instanceof Error ? error.message : 'Failed to load saved conversation detail.',
      );
    } finally {
      setIsConversationDetailLoading(false);
    }
  };

  const loadReports = async (preferredReportId?: string) => {
    setIsReportsLoading(true);
    setReportsStatusMessage('');

    try {
      const nextReports = await listAIReports();
      setReports(nextReports);
      setSelectedReportId((currentSelectedId) => {
        if (preferredReportId && nextReports.some((report) => report.id === preferredReportId)) {
          return preferredReportId;
        }

        const hasCurrent = currentSelectedId
          ? nextReports.some((report) => report.id === currentSelectedId)
          : false;
        return hasCurrent ? currentSelectedId : (nextReports[0]?.id ?? null);
      });
      if (nextReports.length === 0) {
        setReportsStatusMessage('No persisted reports found yet.');
      } else {
        setReportsStatusMessage(`Loaded ${nextReports.length} persisted reports.`);
      }
    } catch (error) {
      setReportsStatusMessage(
        error instanceof Error ? error.message : 'Failed to load reports from API.',
      );
    } finally {
      setIsReportsLoading(false);
    }
  };

  const loadScoresForSelectedSnapshot = async (sourceSnapshotId: string | null) => {
    if (!sourceSnapshotId) {
      setScores([]);
      setSelectedScoreId(null);
      setScoreStatusMessage('Select a portfolio snapshot to view score history.');
      return;
    }

    setIsScoresLoading(true);
    setScoreStatusMessage('');

    try {
      const nextScores = await listFinancialHealthScoresBySourceSnapshotId(sourceSnapshotId);
      setScores(nextScores);
      setSelectedScoreId((currentSelectedId) => {
        const hasCurrent = currentSelectedId
          ? nextScores.some((score) => score.id === currentSelectedId)
          : false;
        return hasCurrent ? currentSelectedId : (nextScores[0]?.id ?? null);
      });
      if (nextScores.length === 0) {
        setScoreStatusMessage('No financial health scores found for selected snapshot yet.');
      } else {
        setScoreStatusMessage(`Loaded ${nextScores.length} score artifacts for selected snapshot.`);
      }
    } catch (error) {
      setScoreStatusMessage(
        error instanceof Error ? error.message : 'Failed to load score history from API.',
      );
    } finally {
      setIsScoresLoading(false);
    }
  };

  useEffect(() => {
    void loadSnapshots();
    void loadEntitlements();
    void loadReports();
    void loadDailyMarketBriefPreferences();
    void loadConversations();
  }, []);

  useEffect(() => {
    void loadScoresForSelectedSnapshot(selectedSnapshotId);
  }, [selectedSnapshotId]);

  useEffect(() => {
    if (quickChatMessages.length === 0) {
      setQuickChatContext(
        normalizeConversationContext({
          sourceSnapshotId: selectedSnapshotId,
          sourceReportId: selectedReportId,
          sourceFinancialHealthScoreId: selectedScoreId,
        }),
      );
    }
  }, [quickChatMessages.length, selectedSnapshotId, selectedReportId, selectedScoreId]);

  useEffect(() => {
    if (!selectedConversationId) {
      setSelectedConversation(null);
      return;
    }

    void loadConversationDetail(selectedConversationId);
  }, [selectedConversationId]);

  const onGenerateMonthlyFinancialReview = async () => {
    setIsGeneratingMonthlyReview(true);
    setMonthlyReviewStatusMessage('');

    try {
      if (useSelectedSnapshotOverride && (!selectedSnapshot || !selectedSnapshot.id)) {
        setMonthlyReviewStatusMessage(
          'Select a portfolio snapshot before using the snapshot override.',
        );
        return;
      }
      const createdReport = await createMonthlyFinancialReview({
        year: reviewYear,
        month: reviewMonth,
        sourceSnapshotId:
          useSelectedSnapshotOverride && selectedSnapshot?.id ? selectedSnapshot.id : undefined,
      });
      if (createdReport.sourceSnapshotId) {
        setSelectedSnapshotId(createdReport.sourceSnapshotId);
      }
      await loadReports(createdReport.id);
      setMonthlyReviewStatusMessage(
        `Monthly Financial Review created for ${effectiveReviewMonthLabel}: ${createdReport.id}`,
      );
    } catch (error) {
      setMonthlyReviewStatusMessage(
        error instanceof Error ? error.message : 'Failed to generate monthly financial review.',
      );
    } finally {
      setIsGeneratingMonthlyReview(false);
    }
  };

  const selectedPortfolioName = getStringMetadataValue(selectedReport, 'portfolioName');
  const selectedSnapshotDate = getStringMetadataValue(selectedReport, 'snapshotDate');
  const selectedReviewMonthLabel = getStringMetadataValue(selectedReport, 'reviewMonthLabel');
  const selectedBriefDate = getStringMetadataValue(selectedReport, 'briefDate');
  const selectedMarketSessionLabel = getStringMetadataValue(selectedReport, 'marketSessionLabel');
  const selectedReportScope = getStringMetadataValue(selectedReport, 'reportScope');
  const selectedSnapshotSelectionStrategy = getStringMetadataValue(
    selectedReport,
    'snapshotSelectionStrategy',
  );
  const selectedSnapshotPortfolioName =
    selectedSnapshot?.metadata.portfolioName ?? 'Untitled Portfolio';

  const onGenerateDailyMarketBrief = async () => {
    setIsGeneratingDailyMarketBrief(true);
    setDailyMarketBriefStatusMessage('');

    try {
      if (useSelectedSnapshotForDailyMarketBrief && (!selectedSnapshot || !selectedSnapshot.id)) {
        setDailyMarketBriefStatusMessage(
          'Select a portfolio snapshot before using the Daily Market Brief snapshot override.',
        );
        return;
      }

      const createdReport = await createDailyMarketBrief({
        reportScope: dailyMarketBriefScope,
        sourceSnapshotId:
          useSelectedSnapshotForDailyMarketBrief && selectedSnapshot?.id
            ? selectedSnapshot.id
            : undefined,
      });

      if (createdReport.sourceSnapshotId) {
        setSelectedSnapshotId(createdReport.sourceSnapshotId);
      }
      await loadReports(createdReport.id);
      setDailyMarketBriefStatusMessage(`Daily Market Brief created: ${createdReport.id}`);
    } catch (error) {
      setDailyMarketBriefStatusMessage(
        error instanceof Error ? error.message : 'Failed to generate Daily Market Brief.',
      );
    } finally {
      setIsGeneratingDailyMarketBrief(false);
    }
  };

  const onCreateDemoSnapshot = async () => {
    setIsCreatingSnapshot(true);
    setSnapshotsStatusMessage('');

    try {
      const adapter = new CsvPortfolioSnapshotAdapter();
      const snapshot = adapter.toSnapshot(mockPortfolioCsvImportInput);
      const created = await createPortfolioSnapshot(snapshot);

      await loadSnapshots();
      setSelectedSnapshotId(created.id ?? null);
      setSnapshotsStatusMessage(`Sample snapshot created: ${created.id}`);
    } catch (error) {
      setSnapshotsStatusMessage(
        error instanceof Error ? error.message : 'Failed to create sample snapshot.',
      );
    } finally {
      setIsCreatingSnapshot(false);
    }
  };

  const onSaveDailyMarketBriefPreferences = async () => {
    if (!dailyMarketBriefPreferences) {
      setDailyMarketBriefPreferencesStatusMessage(
        'Daily Market Brief preferences are still loading.',
      );
      return;
    }

    if (
      useSelectedSnapshotForDailyMarketBriefDelivery &&
      (!selectedSnapshot || !selectedSnapshot.id)
    ) {
      setDailyMarketBriefPreferencesStatusMessage(
        'Select a portfolio snapshot before using it as the delivery anchor.',
      );
      return;
    }

    setIsDailyMarketBriefPreferencesSaving(true);
    setDailyMarketBriefPreferencesStatusMessage('');

    try {
      const updatedPreferences = await updateDailyMarketBriefPreferences({
        ...dailyMarketBriefPreferences,
        sourceSnapshotId:
          useSelectedSnapshotForDailyMarketBriefDelivery && selectedSnapshot?.id
            ? selectedSnapshot.id
            : undefined,
      });
      setDailyMarketBriefPreferences(updatedPreferences);
      setUseSelectedSnapshotForDailyMarketBriefDelivery(
        Boolean(updatedPreferences.sourceSnapshotId),
      );
      setDailyMarketBriefPreferencesStatusMessage('Daily Market Brief delivery preferences saved.');
    } catch (error) {
      setDailyMarketBriefPreferencesStatusMessage(
        error instanceof Error
          ? error.message
          : 'Failed to save Daily Market Brief delivery preferences.',
      );
    } finally {
      setIsDailyMarketBriefPreferencesSaving(false);
    }
  };

  const onGenerateDemoScore = async () => {
    setIsGeneratingScore(true);
    setScoreStatusMessage('');

    try {
      if (!selectedSnapshot) {
        setScoreStatusMessage('Select a portfolio snapshot before generating a score.');
        return;
      }
      if (!selectedSnapshot.id) {
        setScoreStatusMessage('Selected snapshot is missing an id and cannot create a score.');
        return;
      }

      const createdScore = await createFinancialHealthScoreForSnapshot(selectedSnapshot.id, {
        scoringVersion: '1.0.0',
      });

      await loadScoresForSelectedSnapshot(selectedSnapshot.id);
      setSelectedScoreId(createdScore.id);
      setScoreStatusMessage(`Server-created score artifact generated: ${createdScore.id}`);
    } catch (error) {
      setScoreStatusMessage(
        error instanceof Error ? error.message : 'Failed to generate financial health score',
      );
    } finally {
      setIsGeneratingScore(false);
    }
  };

  const onStartPortfolioAnalysis = () => {
    if (!portfolioAnalysisEnabled) {
      setQuickChatStatusMessage('Current entitlement does not enable portfolio analysis yet.');
      scrollToAnchor('quick-chat-section');
      return;
    }

    if (!selectedSnapshot) {
      setQuickChatStatusMessage('Select a portfolio snapshot before starting portfolio analysis.');
      scrollToAnchor('reports');
      return;
    }

    const prompt = [
      `Analyze my selected portfolio snapshot${selectedSnapshot.metadata.portfolioName ? ` for ${selectedSnapshot.metadata.portfolioName}` : ''}.`,
      'Focus on concentration, diversification, cash position, key risks, and the three most useful next actions.',
    ].join(' ');

    setQuickChatContext(selectedContext);
    setQuickChatDraft(prompt);
    setQuickChatStatusMessage(
      'Portfolio Analysis prepared a Quick Chat draft using your selected snapshot context.',
    );
    scrollToAnchor('quick-chat-section');
  };

  const onRunQuickChat = async () => {
    const content = quickChatDraft.trim();
    if (!content) {
      setQuickChatStatusMessage('Enter a message to start Quick Chat.');
      return;
    }

    const nextContext = quickChatMessages.length === 0 ? selectedContext : activeQuickChatContext;
    const nextUserMessage: QuickChatTranscriptMessage = {
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    const nextTranscript = [...quickChatMessages, nextUserMessage];

    setQuickChatMessages(nextTranscript);
    setQuickChatDraft('');
    setQuickChatContext(nextContext);
    setQuickChatStatusMessage('');
    setLastSavedConversationId(null);
    setIsQuickChatRunning(true);

    try {
      const response = await runQuickChat({
        messages: nextTranscript.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        sourceSnapshotId: nextContext?.sourceSnapshotId,
        sourceReportId: nextContext?.sourceReportId,
        sourceFinancialHealthScoreId: nextContext?.sourceFinancialHealthScoreId,
      });

      setQuickChatMessages((currentMessages) => [
        ...currentMessages,
        {
          role: 'assistant',
          content: response.reply.content,
          createdAt: response.reply.createdAt,
          mode: response.mode,
        },
      ]);
      setQuickChatContext(response.context ?? nextContext);
      setQuickChatStatusMessage(
        response.mode === 'fallback'
          ? 'Quick Chat replied from local fallback context. The draft is still ephemeral until you save it.'
          : 'Quick Chat replied. The draft is still ephemeral until you save it.',
      );
    } catch (error) {
      setQuickChatStatusMessage(
        error instanceof Error ? error.message : 'Quick Chat failed to generate a reply.',
      );
    } finally {
      setIsQuickChatRunning(false);
    }
  };

  const onClearQuickChat = () => {
    setQuickChatMessages([]);
    setQuickChatDraft('');
    setQuickChatStatusMessage('Quick Chat draft cleared. Nothing was persisted.');
    setQuickChatContext(selectedContext);
    setLastSavedConversationId(null);
  };

  const onSaveQuickChat = async () => {
    if (quickChatMessages.length === 0) {
      setQuickChatStatusMessage('Quick Chat has no transcript to save yet.');
      return;
    }

    const draftContext = activeQuickChatContext;
    setIsSavingConversation(true);
    setQuickChatStatusMessage('');
    setConversationStatusMessage('');

    try {
      const createdConversation = await createAIConversation({
        title: buildConversationTitle({
          messages: quickChatMessages,
          snapshotName: quickChatSnapshot?.metadata.portfolioName,
          reportTitle: quickChatReport?.title,
          scoreHeadline: quickChatScore?.insight.headline,
        }),
        sourceSnapshotId: draftContext?.sourceSnapshotId,
        sourceReportId: draftContext?.sourceReportId,
        sourceFinancialHealthScoreId: draftContext?.sourceFinancialHealthScoreId,
        messages: quickChatMessages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      });

      setLastSavedConversationId(createdConversation.id);
      setSelectedConversation(createdConversation);
      setSelectedConversationId(createdConversation.id);
      await loadConversations(createdConversation.id);
      setConversationStatusMessage(
        `Saved quick chat to Conversations: ${createdConversation.title}`,
      );
      setQuickChatStatusMessage('Quick Chat saved. Future access now comes from Conversations.');
    } catch (error) {
      setQuickChatStatusMessage(
        error instanceof Error ? error.message : 'Failed to save quick chat.',
      );
    } finally {
      setIsSavingConversation(false);
    }
  };

  const onDeleteSelectedConversation = async () => {
    if (!selectedConversationId) {
      return;
    }

    setIsDeletingConversation(true);
    setConversationStatusMessage('');

    try {
      await deleteAIConversation(selectedConversationId);
      const deletedConversationId = selectedConversationId;
      setSelectedConversationId(null);
      setSelectedConversation(null);
      await loadConversations();
      if (lastSavedConversationId === deletedConversationId) {
        setLastSavedConversationId(null);
      }
      setConversationStatusMessage('Saved conversation deleted.');
    } catch (error) {
      setConversationStatusMessage(
        error instanceof Error ? error.message : 'Failed to delete saved conversation.',
      );
    } finally {
      setIsDeletingConversation(false);
    }
  };

  const getEntryEnabled = (entry: AIInsightsCatalogEntry): boolean =>
    entry.featureKey ? hasEnabledFeature(entitlements, entry.featureKey) : true;

  const getEntryHint = (entry: AIInsightsCatalogEntry): string => {
    const enabled = getEntryEnabled(entry);
    if (!enabled) {
      return 'Current entitlement does not enable this action yet.';
    }

    switch (entry.id) {
      case 'monthly-financial-review':
        if (snapshots.length === 0) {
          return 'Create or import a portfolio snapshot first so reports can use current wealth context.';
        }
        return useSelectedSnapshotOverride
          ? selectedSnapshot?.id
            ? `Creates a ${effectiveReviewMonthLabel} review using the selected snapshot.`
            : 'Select a portfolio snapshot before using the snapshot override.'
          : `Creates a ${effectiveReviewMonthLabel} review using the latest relevant snapshot.`;
      case 'daily-market-brief':
        if (snapshots.length === 0) {
          return 'Create or import a portfolio snapshot first so the Daily Market Brief can use portfolio-aware context.';
        }
        return useSelectedSnapshotForDailyMarketBrief
          ? selectedSnapshot?.id
            ? 'Creates a Daily Market Brief using the selected snapshot.'
            : 'Select a portfolio snapshot before using the Daily Market Brief snapshot override.'
          : 'Creates a Daily Market Brief using the latest available snapshot.';
      case 'financial-health-score':
        return selectedSnapshot?.id
          ? 'Generates and stores a snapshot-linked analysis artifact.'
          : 'Select a portfolio snapshot to activate score generation.';
      case 'portfolio-analysis':
        return selectedSnapshot?.id
          ? 'Prepares a Quick Chat draft grounded in the selected snapshot, report, and score context.'
          : 'Select a portfolio snapshot to prepare a portfolio analysis draft.';
      case 'budget-planning':
      case 'goals-planning':
        return 'Planning workflows are intentionally reserved for the next milestone.';
      case 'quick-chat':
        return 'Ephemeral by default. Save only when the transcript deserves a place in history.';
      case 'saved-conversations':
        return 'Saved conversations remain readable, even when creation or saving is unavailable.';
      default:
        return '';
    }
  };

  const latestReport = reports[0];
  const latestConversation = conversations[0];
  const accessLabel =
    entitlements?.status === 'active'
      ? 'Creation enabled'
      : entitlements
        ? 'Read history available'
        : 'Checking access';
  const selectedSnapshotValue =
    selectedSnapshot?.totalValue != null ? formatMoney(selectedSnapshot.totalValue) : 'No value yet';

  return (
    <PageContainer className="space-y-7 pb-8 md:space-y-8 md:pb-10">
      <Card className="aurum-elevated-surface relative overflow-hidden border-[var(--aurum-border)]">
        <CardContent className="relative space-y-8 px-5 py-6 sm:px-6 sm:py-7 lg:px-8">
          <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.18fr)_minmax(340px,0.82fr)] xl:items-start">
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="info">AI Insights</Badge>
                  <Badge variant="neutral">Snapshot-grounded</Badge>
                  <Badge variant={entitlements?.status === 'active' ? 'good' : 'neutral'}>
                    {accessLabel}
                  </Badge>
                </div>
                <div className="space-y-3">
                  <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-aurum-text sm:text-4xl lg:text-[44px]">
                    A calm workspace for reports, analysis, conversations, and planning.
                  </h1>
                  <p className="max-w-3xl text-sm leading-7 text-aurum-muted sm:text-[15px]">
                    Generate durable financial artifacts, inspect the latest score, or ask a quick
                    grounded question. Quick Chat stays temporary until you explicitly save it into
                    Conversations.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  variant="primary"
                  onClick={() => scrollToAnchor('reports-monthly-review')}
                >
                  Generate Review
                </Button>
                <Button variant="secondary" onClick={() => scrollToAnchor('quick-chat-section')}>
                  Open Quick Chat
                </Button>
                <Button variant="ghost" onClick={() => scrollToAnchor('analysis')}>
                  Review Score
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <MetadataTile
                label="Selected Snapshot"
                value={selectedSnapshot?.metadata.portfolioName ?? 'Choose a snapshot below'}
              />
              <MetadataTile label="Portfolio Value" value={selectedSnapshotValue} />
              <MetadataTile
                label="Latest Artifact"
                value={latestReport?.title ?? latestConversation?.title ?? 'No AI history yet'}
              />
            </div>
          </div>

          {entitlementsStatusMessage ? (
            <StatusNote tone="warn">{entitlementsStatusMessage}</StatusNote>
          ) : null}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {aiInsightsCatalogSections.map((section) => (
              <button
                key={section.key}
                type="button"
                onClick={() => scrollToAnchor(section.anchor)}
                className="group rounded-[22px] border border-[var(--aurum-border)] bg-white p-4 text-left shadow-[var(--aurum-shadow)] transition hover:border-[var(--aurum-accent)]/35 hover:bg-[var(--aurum-surface-alt)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-aurum-text">{section.title}</p>
                  <Badge variant={section.key === 'planning' ? 'warn' : 'neutral'}>
                    {sectionCounts[section.key]}
                  </Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-aurum-muted">{section.description}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <Card>
          <CardHeader>
            <CardTitle>Current Context</CardTitle>
            <CardDescription>
              The selected snapshot, report, and score shape grounded AI workflows across the page.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
            <MetadataTile
              label="Snapshot"
              value={selectedSnapshot?.metadata.portfolioName ?? 'Select a portfolio snapshot'}
            />
            <MetadataTile label="Report" value={selectedReport?.title ?? 'No report selected'} />
            <MetadataTile
              label="Score"
              value={selectedScoreInsight?.headline ?? 'No score selected'}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What Gets Saved</CardTitle>
            <CardDescription>
              Persistence is explicit, so quick exploration does not become permanent history by
              accident.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3 xl:grid-cols-1">
            <MetadataTile label="Reports" value="Monthly reviews and market briefs are persisted." />
            <MetadataTile label="Analysis" value="Scores are stored against the selected snapshot." />
            <MetadataTile label="Conversations" value="Quick Chat saves only when you choose Save." />
          </CardContent>
        </Card>
      </section>

      <div className="flex flex-col gap-6">
        <div className="order-3 space-y-6">
      <section className="space-y-4">
        <SectionHeading
          eyebrow="Conversations"
          title="Ask quickly, save deliberately"
          description="Quick Chat is the fast lane for grounded questions. It remains temporary until you decide the transcript belongs in saved history."
          badge={<Badge variant="neutral">Ephemeral first</Badge>}
        />
      </section>

      <section
        id="conversations"
        className="grid scroll-mt-24 grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]"
      >
        <Card id="quick-chat-section" className="scroll-mt-24">
          <CardHeader className="space-y-3">
            <div className="space-y-1">
              <CardTitle>Quick Chat</CardTitle>
              <CardDescription>
                Ephemeral by default. Use selected snapshot, report, or score context when you want
                grounded answers, then explicitly save the transcript if you want it in
                Conversations.
              </CardDescription>
            </div>
            <div className="rounded-[12px] border border-aurum-border bg-aurum-surface px-3 py-3 text-xs text-aurum-text">
              <p className="font-medium">Draft context</p>
              <p className="mt-1 text-aurum-muted">
                {formatConversationContextSummary(activeQuickChatContext)}
              </p>
            </div>
            {entitlementsStatusMessage ? (
              <StatusNote tone="warn">{entitlementsStatusMessage}</StatusNote>
            ) : null}
            {!quickChatEnabled ? (
              <StatusNote tone="error">Quick Chat is currently unavailable for this account.</StatusNote>
            ) : null}
            {!conversationSaveEnabled ? (
              <StatusNote tone="warn">
                Saving is currently unavailable, but historical saved conversations remain readable.
              </StatusNote>
            ) : null}
            <StatusNote>
              Replies use the available AI provider when configured. If a live provider is not
              available, Aurum uses a local fallback so the workflow remains usable.
            </StatusNote>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="aurum-scrollbar max-h-[420px] space-y-3 overflow-auto rounded-[16px] border border-aurum-border bg-[var(--aurum-surface-alt)] p-4">
              {quickChatMessages.length === 0 ? (
                <div className="space-y-2 text-sm text-aurum-muted">
                  <p>Quick Chat starts as a local draft.</p>
                  <p>Select a snapshot, report, or score if you want grounded context.</p>
                </div>
              ) : (
                quickChatMessages.map((message, index) => (
                  <TranscriptBubble
                    key={`${message.createdAt}-${index}`}
                    role={message.role}
                    content={message.content}
                    createdAt={message.createdAt}
                    mode={message.mode}
                  />
                ))
              )}
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-aurum-text">Message</span>
              <textarea
                value={quickChatDraft}
                onChange={(event) => setQuickChatDraft(event.target.value)}
                rows={4}
                placeholder="Ask a question about your selected snapshot, report, or score."
                className="w-full rounded-[16px] border border-aurum-border bg-aurum-surface px-4 py-3 text-sm text-aurum-text outline-none transition focus:border-[var(--aurum-accent)] focus:ring-2 focus:ring-[var(--aurum-accent)]/20"
              />
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="primary"
                onClick={() => void onRunQuickChat()}
                disabled={!quickChatEnabled || isQuickChatRunning}
              >
                {isQuickChatRunning ? 'Replying...' : 'Send Quick Chat'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => void onSaveQuickChat()}
                disabled={
                  !conversationSaveEnabled || quickChatMessages.length === 0 || isSavingConversation
                }
              >
                {isSavingConversation ? 'Saving...' : 'Save to Conversations'}
              </Button>
              <Button
                variant="ghost"
                onClick={onClearQuickChat}
                disabled={quickChatMessages.length === 0 && quickChatDraft.trim().length === 0}
              >
                Clear Draft
              </Button>
              {lastSavedConversationId ? (
                <span className="text-xs text-aurum-muted">
                  Saved as conversation {lastSavedConversationId}
                </span>
              ) : (
                <span className="text-xs text-aurum-muted">Quick Chat is not auto-saved.</span>
              )}
            </div>

            {quickChatStatusMessage ? (
              <StatusNote>{quickChatStatusMessage}</StatusNote>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conversation Flow</CardTitle>
            <CardDescription>
              Quick Chat stays local until you save it. Saved chats then appear in Conversations and
              remain readable later without turning conversations into the source of truth.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-aurum-text">
            <div className="rounded-[12px] border border-aurum-border bg-aurum-surface px-4 py-3">
              <p className="font-medium">1. Start in Quick Chat</p>
              <p className="mt-1 text-aurum-muted">
                Ask a grounded question using the selected snapshot, report, or financial health
                score.
              </p>
            </div>
            <div className="rounded-[12px] border border-aurum-border bg-aurum-surface px-4 py-3">
              <p className="font-medium">2. Save only when it matters</p>
              <p className="mt-1 text-aurum-muted">
                Saving is explicit and writes into your persistent conversation history only when
                you choose to keep it.
              </p>
            </div>
            <div className="rounded-[12px] border border-aurum-border bg-aurum-surface px-4 py-3">
              <p className="font-medium">3. Reopen from Conversations</p>
              <p className="mt-1 text-aurum-muted">
                Saved conversations can be listed, opened, and deleted later from the same AI
                Insights surface.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section
        id="saved-conversations-section"
        className="grid scroll-mt-24 grid-cols-1 gap-6 xl:grid-cols-[360px_1fr]"
      >
        <Card>
          <CardHeader className="space-y-3">
            <div className="space-y-1">
            <CardTitle>Conversations</CardTitle>
            <CardDescription>
                Saved Quick Chat transcripts you explicitly kept.
            </CardDescription>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <Button
                variant="secondary"
                onClick={() => void loadConversations(selectedConversationId ?? undefined)}
                disabled={isConversationsLoading}
                className="w-full"
              >
                {isConversationsLoading ? 'Loading...' : 'Refresh Conversations'}
              </Button>
              <Button
                variant="destructive"
                onClick={() => void onDeleteSelectedConversation()}
                disabled={!selectedConversationId || isDeletingConversation}
                className="w-full"
              >
                {isDeletingConversation ? 'Deleting...' : 'Delete Selected'}
              </Button>
            </div>
            {conversationStatusMessage ? (
              <StatusNote>{conversationStatusMessage}</StatusNote>
            ) : null}
          </CardHeader>
          <CardContent className="aurum-scrollbar max-h-[520px] space-y-2 overflow-auto">
            {isConversationsLoading ? (
              <p className="text-sm text-aurum-muted">Loading saved conversations...</p>
            ) : conversations.length === 0 ? (
              <p className="text-sm text-aurum-muted">
                No saved conversations yet. Save a Quick Chat to start this history.
              </p>
            ) : (
              conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => setSelectedConversationId(conversation.id)}
                  className={`w-full rounded-[12px] border px-3 py-3 text-left text-xs transition ${
                    conversation.id === selectedConversationId
                      ? 'border-[var(--aurum-accent)] bg-[var(--aurum-accent)]/10'
                      : 'border-[var(--aurum-border)] bg-[var(--aurum-surface)] hover:bg-[var(--aurum-surface-alt)]'
                  }`}
                >
                  <p className="font-medium text-aurum-text">{conversation.title}</p>
                  <p className="mt-1 text-aurum-muted">
                    {conversation.messageCount} messages
                    {conversation.lastMessageAt
                      ? ` | last activity ${formatDateTime(conversation.lastMessageAt)}`
                      : ''}
                  </p>
                  <p className="mt-1 text-aurum-muted">
                    {formatConversationContextSummary(conversation.context)}
                  </p>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Saved Conversation Detail</CardTitle>
            <CardDescription>
              Readable transcript history with context kept visible but secondary.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isConversationDetailLoading ? (
              <p className="text-sm text-aurum-muted">Loading conversation...</p>
            ) : !selectedConversation ? (
              <p className="text-sm text-aurum-muted">
                Select a saved conversation to inspect its transcript.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-aurum-muted">Title</p>
                    <p className="text-aurum-text">{selectedConversation.title}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-aurum-muted">Last Updated</p>
                    <p className="text-aurum-text">
                      {formatDateTime(selectedConversation.updatedAt)}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-xs uppercase tracking-wide text-aurum-muted">Context</p>
                    <p className="text-aurum-text">
                      {formatConversationContextSummary(selectedConversation.context)}
                    </p>
                  </div>
                </div>

                <div className="aurum-scrollbar max-h-[560px] space-y-3 overflow-auto pr-1">
                  {selectedConversation.messages.map((message) => (
                    <TranscriptBubble
                      key={message.id}
                      role={message.role}
                      content={message.content}
                      createdAt={message.createdAt}
                    />
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>

        </div>
        <div className="order-1 space-y-6">
      <section id="reports" className="scroll-mt-24 space-y-4">
        <SectionHeading
          eyebrow="Reports"
          title="Durable AI briefings"
          description="Monthly reviews and market briefs are first-class artifacts: generated from selected context, saved to history, and readable later."
          badge={<Badge variant="info">Persisted deliverables</Badge>}
        />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader className="space-y-3">
            <div className="space-y-1">
              <CardTitle>Portfolio Snapshot Context</CardTitle>
              <CardDescription>
                Choose the portfolio snapshot that grounds reports, scores, and Quick Chat. You can
                also return to Portfolio to create or sync a richer asset view.
              </CardDescription>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <Button
                variant="primary"
                onClick={() => void onCreateDemoSnapshot()}
                disabled={isCreatingSnapshot || isSnapshotsLoading}
                className="w-full"
              >
                {isCreatingSnapshot ? 'Creating...' : 'Create Starter Snapshot'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => void loadSnapshots()}
                disabled={isSnapshotsLoading || isCreatingSnapshot}
                className="w-full"
              >
                {isSnapshotsLoading ? 'Loading...' : 'Refresh Snapshots'}
              </Button>
            </div>
            {snapshotsStatusMessage ? (
              <StatusNote>{snapshotsStatusMessage}</StatusNote>
            ) : null}
          </CardHeader>
          <CardContent className="aurum-scrollbar max-h-[520px] space-y-2 overflow-auto">
            {snapshots.length === 0 ? (
              <p className="text-sm text-aurum-muted">
                No snapshots available yet. Create a starter snapshot here or open Portfolio to
                connect accounts and manual assets.
              </p>
            ) : (
              snapshots.map((snapshot) => (
                <button
                  key={snapshot.id ?? `${snapshot.metadata.snapshotDate}-${snapshot.totalValue}`}
                  type="button"
                  onClick={() => setSelectedSnapshotId(snapshot.id ?? null)}
                  className={`w-full rounded-[12px] border px-3 py-2 text-left text-xs transition ${
                    snapshot.id === selectedSnapshotId
                      ? 'border-[var(--aurum-accent)] bg-[var(--aurum-accent)]/10'
                      : 'border-[var(--aurum-border)] bg-[var(--aurum-surface)] hover:bg-[var(--aurum-surface-alt)]'
                  }`}
                >
                  <p className="font-medium text-aurum-text">
                    {snapshot.metadata.portfolioName ?? 'Untitled Portfolio'}
                  </p>
                  <p className="text-aurum-muted">date: {snapshot.metadata.snapshotDate}</p>
                  <p className="text-aurum-muted">positions: {snapshot.positions.length}</p>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card id="reports-monthly-review" className="scroll-mt-24">
          <CardHeader className="space-y-3">
            <div className="space-y-1">
              <CardTitle>Monthly Financial Review</CardTitle>
              <CardDescription>
                Create a persisted review for a finished month, grounded in the selected portfolio
                context when you choose to override the default anchor.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="primary"
                onClick={() => void onGenerateMonthlyFinancialReview()}
                disabled={
                  isGeneratingMonthlyReview ||
                  snapshots.length === 0 ||
                  !monthlyReviewEnabled ||
                  (useSelectedSnapshotOverride && !selectedSnapshot?.id)
                }
              >
                {isGeneratingMonthlyReview ? 'Generating...' : 'Generate Monthly Financial Review'}
              </Button>
              <Badge variant="neutral">History remains readable</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="space-y-2 text-sm">
                <span className="text-xs uppercase tracking-wide text-aurum-muted">
                  Review Year
                </span>
                <input
                  type="number"
                  min={2000}
                  max={9999}
                  value={reviewYear}
                  onChange={(event) => setReviewYear(Number(event.target.value))}
                  className="w-full rounded-[12px] border border-aurum-border bg-aurum-surface px-3 py-2 text-aurum-text outline-none transition focus:border-[var(--aurum-accent)]"
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="text-xs uppercase tracking-wide text-aurum-muted">
                  Review Month
                </span>
                <select
                  value={reviewMonth}
                  onChange={(event) => setReviewMonth(Number(event.target.value))}
                  className="w-full rounded-[12px] border border-aurum-border bg-aurum-surface px-3 py-2 text-aurum-text outline-none transition focus:border-[var(--aurum-accent)]"
                >
                  {Array.from({ length: 12 }, (_, index) => {
                    const monthValue = index + 1;

                    return (
                      <option key={monthValue} value={monthValue}>
                        {formatMonthLabel(reviewYear, monthValue)}
                      </option>
                    );
                  })}
                </select>
              </label>
              <label className="flex items-start gap-3 rounded-[12px] border border-aurum-border bg-aurum-surface px-3 py-3 text-sm md:col-span-2 xl:col-span-2">
                <input
                  type="checkbox"
                  checked={useSelectedSnapshotOverride}
                  onChange={(event) => setUseSelectedSnapshotOverride(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-aurum-border"
                />
                <span className="space-y-1">
                  <span className="block text-sm font-medium text-aurum-text">
                    Use selected snapshot override
                  </span>
                  <span className="block text-xs text-aurum-muted">
                    Leave this off to use the latest snapshot on or before the review month end.
                  </span>
                </span>
              </label>
            </div>

            {!selectedSnapshot ? (
              <p className="text-sm text-aurum-muted">Select a snapshot from the list.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-aurum-muted">Portfolio Name</p>
                  <p className="text-aurum-text">{selectedSnapshotPortfolioName}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-aurum-muted">Snapshot Date</p>
                  <p className="text-aurum-text">{selectedSnapshot.metadata.snapshotDate}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-aurum-muted">Total Value</p>
                  <p className="text-aurum-text">{formatMoney(selectedSnapshot.totalValue)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-aurum-muted">Cash Value</p>
                  <p className="text-aurum-text">
                    {selectedSnapshot.cashValue === undefined
                      ? 'N/A'
                      : formatMoney(selectedSnapshot.cashValue)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-aurum-muted">
                    Positions Count
                  </p>
                  <p className="text-aurum-text">{selectedSnapshot.positions.length}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-aurum-muted">Review Window</p>
                  <p className="text-aurum-text">{effectiveReviewMonthLabel}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {monthlyReviewStatusMessage ? (
        <StatusNote>{monthlyReviewStatusMessage}</StatusNote>
      ) : null}

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card id="reports-daily-market-brief" className="scroll-mt-24">
          <CardHeader className="space-y-3">
            <div className="space-y-1">
              <CardTitle>Daily Market Brief</CardTitle>
              <CardDescription>
                Generate a concise market brief, optionally grounded in the selected portfolio
                snapshot for a more relevant readout.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="primary"
                onClick={() => void onGenerateDailyMarketBrief()}
                disabled={
                  isGeneratingDailyMarketBrief ||
                  snapshots.length === 0 ||
                  !dailyMarketBriefEnabled ||
                  (useSelectedSnapshotForDailyMarketBrief && !selectedSnapshot?.id)
                }
              >
                {isGeneratingDailyMarketBrief ? 'Generating...' : 'Generate Daily Market Brief'}
              </Button>
              <Badge variant="neutral">Saved to report history</Badge>
            </div>
            {dailyMarketBriefStatusMessage ? (
              <StatusNote>{dailyMarketBriefStatusMessage}</StatusNote>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="text-xs uppercase tracking-wide text-aurum-muted">
                  Brief Scope
                </span>
                <select
                  value={dailyMarketBriefScope}
                  onChange={(event) =>
                    setDailyMarketBriefScope(event.target.value as DailyMarketBriefScope)
                  }
                  className="w-full rounded-[12px] border border-aurum-border bg-aurum-surface px-3 py-2 text-aurum-text outline-none transition focus:border-[var(--aurum-accent)]"
                >
                  <option value="portfolio_aware">Portfolio Aware</option>
                  <option value="market_overview">Market Overview</option>
                </select>
              </label>
              <label className="flex items-start gap-3 rounded-[12px] border border-aurum-border bg-aurum-surface px-3 py-3 text-sm">
                <input
                  type="checkbox"
                  checked={useSelectedSnapshotForDailyMarketBrief}
                  onChange={(event) =>
                    setUseSelectedSnapshotForDailyMarketBrief(event.target.checked)
                  }
                  className="mt-1 h-4 w-4 rounded border-aurum-border"
                />
                <span className="space-y-1">
                  <span className="block text-sm font-medium text-aurum-text">
                    Use selected snapshot override
                  </span>
                  <span className="block text-xs text-aurum-muted">
                    Leave this off to anchor the brief to the latest available snapshot.
                  </span>
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-aurum-muted">Current Scope</p>
                <p className="text-aurum-text">
                  {dailyMarketBriefScope === 'portfolio_aware'
                    ? 'Portfolio-aware'
                    : 'Market overview'}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-aurum-muted">Snapshot Anchor</p>
                <p className="text-aurum-text">
                  {useSelectedSnapshotForDailyMarketBrief
                    ? (selectedSnapshot?.metadata.portfolioName ?? 'Select a portfolio snapshot')
                    : 'Latest available snapshot'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-3">
            <div className="space-y-1">
              <CardTitle>Daily Market Brief Delivery</CardTitle>
              <CardDescription>
                Store preferred cadence, time, and scope. Scheduled generation remains a reserved
                capability, so these preferences are supportive rather than automatic delivery.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => void onSaveDailyMarketBriefPreferences()}
                disabled={isDailyMarketBriefPreferencesSaving || !dailyMarketBriefPreferences}
              >
                {isDailyMarketBriefPreferencesSaving ? 'Saving...' : 'Save Delivery Preferences'}
              </Button>
              <Badge variant="warn">Reserved delivery foundation</Badge>
            </div>
            {dailyMarketBriefPreferencesStatusMessage ? (
              <StatusNote>{dailyMarketBriefPreferencesStatusMessage}</StatusNote>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4">
            {!dailyMarketBriefPreferences ? (
              <p className="text-sm text-aurum-muted">
                Loading Daily Market Brief delivery preferences...
              </p>
            ) : (
              <>
                <label className="flex items-start gap-3 rounded-[12px] border border-aurum-border bg-aurum-surface px-3 py-3 text-sm">
                  <input
                    type="checkbox"
                    checked={dailyMarketBriefPreferences.enabled}
                    onChange={(event) =>
                      setDailyMarketBriefPreferences((current) =>
                        current
                          ? {
                              ...current,
                              enabled: event.target.checked,
                            }
                          : current,
                      )
                    }
                    className="mt-1 h-4 w-4 rounded border-aurum-border"
                  />
                  <span className="space-y-1">
                    <span className="block text-sm font-medium text-aurum-text">
                      Enable scheduled delivery foundation
                    </span>
                    <span className="block text-xs text-aurum-muted">
                      Save preferences now; automatic delivery is not presented as live yet.
                    </span>
                  </span>
                </label>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <label className="space-y-2 text-sm">
                    <span className="text-xs uppercase tracking-wide text-aurum-muted">
                      Cadence
                    </span>
                    <select
                      value={dailyMarketBriefPreferences.cadence}
                      onChange={(event) =>
                        setDailyMarketBriefPreferences((current) =>
                          current
                            ? {
                                ...current,
                                cadence: event.target
                                  .value as DailyMarketBriefPreferenceView['cadence'],
                              }
                            : current,
                        )
                      }
                      className="w-full rounded-[12px] border border-aurum-border bg-aurum-surface px-3 py-2 text-aurum-text outline-none transition focus:border-[var(--aurum-accent)]"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekdays">Weekdays</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="text-xs uppercase tracking-wide text-aurum-muted">
                      Delivery Time
                    </span>
                    <input
                      type="time"
                      value={dailyMarketBriefPreferences.deliveryTimeLocal}
                      onChange={(event) =>
                        setDailyMarketBriefPreferences((current) =>
                          current
                            ? {
                                ...current,
                                deliveryTimeLocal: event.target.value,
                              }
                            : current,
                        )
                      }
                      className="w-full rounded-[12px] border border-aurum-border bg-aurum-surface px-3 py-2 text-aurum-text outline-none transition focus:border-[var(--aurum-accent)]"
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="text-xs uppercase tracking-wide text-aurum-muted">
                      Timezone
                    </span>
                    <input
                      type="text"
                      value={dailyMarketBriefPreferences.timezone}
                      onChange={(event) =>
                        setDailyMarketBriefPreferences((current) =>
                          current
                            ? {
                                ...current,
                                timezone: event.target.value,
                              }
                            : current,
                        )
                      }
                      className="w-full rounded-[12px] border border-aurum-border bg-aurum-surface px-3 py-2 text-aurum-text outline-none transition focus:border-[var(--aurum-accent)]"
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="text-xs uppercase tracking-wide text-aurum-muted">
                      Delivery Channel
                    </span>
                    <select
                      value={dailyMarketBriefPreferences.deliveryChannel}
                      onChange={(event) =>
                        setDailyMarketBriefPreferences((current) =>
                          current
                            ? {
                                ...current,
                                deliveryChannel: event.target
                                  .value as DailyMarketBriefPreferenceView['deliveryChannel'],
                              }
                            : current,
                        )
                      }
                      className="w-full rounded-[12px] border border-aurum-border bg-aurum-surface px-3 py-2 text-aurum-text outline-none transition focus:border-[var(--aurum-accent)]"
                    >
                      <option value="in_app">In-app</option>
                      <option value="email_placeholder">Email (future channel)</option>
                    </select>
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="text-xs uppercase tracking-wide text-aurum-muted">
                      Scheduled Scope
                    </span>
                    <select
                      value={dailyMarketBriefPreferences.reportScope}
                      onChange={(event) =>
                        setDailyMarketBriefPreferences((current) =>
                          current
                            ? {
                                ...current,
                                reportScope: event.target
                                  .value as DailyMarketBriefPreferenceView['reportScope'],
                              }
                            : current,
                        )
                      }
                      className="w-full rounded-[12px] border border-aurum-border bg-aurum-surface px-3 py-2 text-aurum-text outline-none transition focus:border-[var(--aurum-accent)]"
                    >
                      <option value="portfolio_aware">Portfolio-aware</option>
                      <option value="market_overview">Market overview</option>
                    </select>
                  </label>
                  <label className="flex items-start gap-3 rounded-[12px] border border-aurum-border bg-aurum-surface px-3 py-3 text-sm">
                    <input
                      type="checkbox"
                      checked={useSelectedSnapshotForDailyMarketBriefDelivery}
                      onChange={(event) =>
                        setUseSelectedSnapshotForDailyMarketBriefDelivery(event.target.checked)
                      }
                      className="mt-1 h-4 w-4 rounded border-aurum-border"
                    />
                    <span className="space-y-1">
                      <span className="block text-sm font-medium text-aurum-text">
                        Use selected snapshot as delivery anchor
                      </span>
                      <span className="block text-xs text-aurum-muted">
                        Current anchor:{' '}
                        {useSelectedSnapshotForDailyMarketBriefDelivery
                          ? (selectedSnapshot?.metadata.portfolioName ??
                            'Select a portfolio snapshot')
                          : 'Latest available snapshot'}
                      </span>
                    </span>
                  </label>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Report History</CardTitle>
            <CardDescription>
              Persisted Monthly Financial Reviews and Daily Market Briefs loaded from the API.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {reportsStatusMessage ? (
              <StatusNote>{reportsStatusMessage}</StatusNote>
            ) : null}
            {isReportsLoading ? (
              <p className="text-sm text-aurum-muted">Loading report history...</p>
            ) : reports.length === 0 ? (
              <p className="text-sm text-aurum-muted">
                No reports yet. Generate a Monthly Financial Review or Daily Market Brief to create
                the first persisted report.
              </p>
            ) : (
              reports.map((report) => (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => {
                    if (report.sourceSnapshotId) {
                      setSelectedSnapshotId(report.sourceSnapshotId);
                    }
                    setSelectedReportId(report.id);
                  }}
                  className={`w-full rounded-[12px] border px-3 py-2 text-left text-xs transition ${
                    report.id === selectedReportId
                      ? 'border-[var(--aurum-accent)] bg-[var(--aurum-accent)]/10'
                      : 'border-[var(--aurum-border)] bg-[var(--aurum-surface)] hover:bg-[var(--aurum-surface-alt)]'
                  }`}
                >
                  <p className="font-medium text-aurum-text">{report.title}</p>
                  <p className="text-aurum-muted">
                    type: {formatReportTypeLabel(report.reportType)}
                  </p>
                  <p className="text-aurum-muted">created: {formatDateTime(report.createdAt)}</p>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Report Detail</CardTitle>
            <CardDescription>
              Selected report content is rendered for reading first, with technical metadata tucked
              away for traceability.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedReport ? (
              <p className="text-sm text-aurum-muted">Select a report from the list.</p>
            ) : (
              <>
                <div className="rounded-[22px] border border-aurum-border bg-aurum-surface-alt p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                      <Badge variant="info">{formatReportTypeLabel(selectedReport.reportType)}</Badge>
                      <h3 className="text-2xl font-semibold tracking-tight text-aurum-text">
                        {selectedReport.title}
                      </h3>
                      <p className="text-sm text-aurum-muted">
                        Created {formatDateTime(selectedReport.createdAt)}
                      </p>
                    </div>
                    {selectedReport.sourceSnapshotId ? (
                      <Badge variant="neutral">Snapshot-linked</Badge>
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                  {selectedPortfolioName ? (
                    <MetadataTile label="Portfolio" value={selectedPortfolioName} />
                  ) : null}
                  {selectedSnapshotDate ? (
                    <MetadataTile label="Snapshot Date" value={selectedSnapshotDate} />
                  ) : null}
                  {selectedReviewMonthLabel ? (
                    <MetadataTile label="Review Window" value={selectedReviewMonthLabel} />
                  ) : null}
                  {selectedBriefDate ? (
                    <MetadataTile label="Brief Date" value={selectedBriefDate} />
                  ) : null}
                  {selectedMarketSessionLabel ? (
                    <MetadataTile label="Market Session" value={selectedMarketSessionLabel} />
                  ) : null}
                  {selectedReportScope ? (
                    <MetadataTile label="Report Scope" value={selectedReportScope} />
                  ) : null}
                </div>

                <div className="rounded-[24px] border border-aurum-border bg-white p-5">
                  <MarkdownReportContent content={selectedReport.contentMarkdown} />
                </div>

                <details className="rounded-[16px] border border-aurum-border bg-aurum-surface-alt px-4 py-3 text-sm text-aurum-text">
                  <summary className="cursor-pointer font-medium">Source metadata</summary>
                  <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <MetadataTile label="Prompt Version" value={selectedReport.promptVersion} />
                    <MetadataTile label="Report Type" value={selectedReport.reportType} />
                    {selectedReport.sourceRunId ? (
                      <MetadataTile label="Source Run" value={selectedReport.sourceRunId} breakAll />
                    ) : null}
                    {selectedSnapshotSelectionStrategy ? (
                      <MetadataTile
                        label="Snapshot Selection"
                        value={selectedSnapshotSelectionStrategy}
                        breakAll
                      />
                    ) : null}
                  </div>
                </details>
              </>
            )}
          </CardContent>
        </Card>
      </section>

        </div>
        <div className="order-2 space-y-6">
      <section id="analysis" className="scroll-mt-24 space-y-4">
        <SectionHeading
          eyebrow="Analysis"
          title="Score the current posture, then decide what deserves attention"
          description="Financial Health Score stays persisted and snapshot-linked. Portfolio Analysis is a guided Quick Chat entry point, not a hidden demo flow."
          badge={<Badge variant="info">Diagnostics</Badge>}
        />
      </section>

      <section className="space-y-6">
        <Card id="analysis-portfolio-analysis" className="scroll-mt-24">
          <CardHeader className="space-y-3">
            <div className="space-y-1">
              <CardTitle>Portfolio Analysis</CardTitle>
              <CardDescription>
                Start a guided analysis prompt from the selected snapshot and optional report or
                score context. The conversation remains temporary until saved.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                onClick={onStartPortfolioAnalysis}
                disabled={!selectedSnapshot?.id || !portfolioAnalysisEnabled}
              >
                Open Guided Quick Chat
              </Button>
              <Badge variant="neutral">Opens Quick Chat draft</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <MetadataTile
                label="Snapshot"
                value={selectedSnapshot?.metadata.portfolioName ?? 'Select a portfolio snapshot'}
              />
              <MetadataTile
                label="Report Context"
                value={selectedReport?.title ?? 'Optional report context'}
              />
              <MetadataTile
                label="Score Context"
                value={selectedScoreInsight?.headline ?? 'Optional score context'}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-3">
            <div className="space-y-1">
              <CardTitle>Financial Health Score</CardTitle>
              <CardDescription>
                Generate and browse score artifacts for the selected snapshot.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="primary"
                onClick={() => void onGenerateDemoScore()}
                disabled={isGeneratingScore || !financialHealthScoreEnabled}
              >
                {isGeneratingScore ? 'Generating...' : 'Generate Score from Selected Snapshot'}
              </Button>
              <Badge variant="neutral">Snapshot-linked history</Badge>
            </div>
            {scoreStatusMessage ? (
              <StatusNote>{scoreStatusMessage}</StatusNote>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-aurum-text">Score History</p>
              {isScoresLoading ? (
                <p className="text-sm text-aurum-muted">Loading snapshot-scoped score history...</p>
              ) : scores.length === 0 ? (
                <p className="text-sm text-aurum-muted">
                  No persisted scores yet. Click &quot;Generate Score from Selected Snapshot&quot;
                  to create one.
                </p>
              ) : (
                <div className="space-y-2">
                  {scores.map((score) => (
                    <button
                      key={score.id}
                      type="button"
                      onClick={() => setSelectedScoreId(score.id)}
                      className={`w-full rounded-[12px] border px-3 py-2 text-left text-xs transition ${
                        score.id === selectedScoreId
                          ? 'border-[var(--aurum-accent)] bg-[var(--aurum-accent)]/10'
                          : 'border-[var(--aurum-border)] bg-[var(--aurum-surface)] hover:bg-[var(--aurum-surface-alt)]'
                      }`}
                    >
                      <p className="font-medium text-aurum-text">
                        {score.result.totalScore}/{score.result.maxScore} -{' '}
                        {score.result.grade.replace('_', ' ')}
                      </p>
                      <p className="text-aurum-muted">created: {formatDateTime(score.createdAt)}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {!selectedScoreResult || !selectedScoreInsight ? (
              <p className="text-sm text-aurum-muted">
                Select a score artifact from history to view details.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 text-sm xl:grid-cols-[260px_1fr]">
                <div className="rounded-[24px] border border-aurum-border bg-aurum-surface-alt p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-aurum-muted">
                    Total Score
                  </p>
                  <div className="mt-3 flex flex-wrap items-end gap-2">
                    <p className="text-4xl font-semibold leading-none text-aurum-text">
                      {selectedScoreResult.totalScore}
                    </p>
                    <p className="pb-1 text-sm text-aurum-muted">
                      / {selectedScoreResult.maxScore}
                    </p>
                  </div>
                  <Badge variant="info" className="mt-4 capitalize">
                    {selectedScoreResult.grade.replace('_', ' ')}
                  </Badge>
                  <div className="mt-4">
                    <ScoreGauge
                      score={selectedScoreResult.totalScore}
                      maxScore={selectedScoreResult.maxScore}
                    />
                  </div>
                </div>
                <div className="rounded-[24px] border border-aurum-border bg-white p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-aurum-muted">
                    Interpretation
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-aurum-text">
                    {selectedScoreInsight.headline}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-aurum-muted">
                    {selectedScoreInsight.summary}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dimension Breakdown</CardTitle>
            <CardDescription>
              Per-dimension scores and explanations, presented as readable diagnostic signals.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!selectedScoreResult ? (
              <p className="text-sm text-aurum-muted">No score result yet.</p>
            ) : (
              selectedScoreResult.breakdown.map((item) => (
                <div
                  key={item.dimension}
                  className="rounded-[12px] border border-aurum-border bg-aurum-surface px-3 py-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-aurum-text">
                      {formatDimensionName(item.dimension)}
                    </p>
                    <p className="text-xs text-aurum-muted">
                      {item.score}/{item.maxScore}
                    </p>
                  </div>
                  <p className="mt-1 text-xs font-medium text-aurum-text">{item.label}</p>
                  <div className="mt-3">
                    <ScoreGauge score={item.score} maxScore={item.maxScore} />
                  </div>
                  <p className="mt-1 text-xs text-aurum-muted">{item.reason}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Strengths</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {!selectedScoreInsight ? (
                <p className="text-sm text-aurum-muted">No insight yet.</p>
              ) : selectedScoreInsight.strengths.length === 0 ? (
                <p className="text-sm text-aurum-muted">No standout strengths identified.</p>
              ) : (
                selectedScoreInsight.strengths.map((item) => (
                  <p
                    key={item}
                    className="rounded-[10px] border border-aurum-border bg-aurum-surface px-3 py-2 text-xs text-aurum-text"
                  >
                    {item}
                  </p>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Concerns</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {!selectedScoreInsight ? (
                <p className="text-sm text-aurum-muted">No insight yet.</p>
              ) : selectedScoreInsight.concerns.length === 0 ? (
                <p className="text-sm text-aurum-muted">No major concerns identified.</p>
              ) : (
                selectedScoreInsight.concerns.map((item) => (
                  <p
                    key={item}
                    className="rounded-[10px] border border-aurum-border bg-aurum-surface px-3 py-2 text-xs text-aurum-text"
                  >
                    {item}
                  </p>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Next Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {!selectedScoreInsight ? (
                <p className="text-sm text-aurum-muted">No insight yet.</p>
              ) : selectedScoreInsight.nextActions.length === 0 ? (
                <p className="text-sm text-aurum-muted">No urgent action required.</p>
              ) : (
                selectedScoreInsight.nextActions.map((item) => (
                  <p
                    key={item}
                    className="rounded-[10px] border border-aurum-border bg-aurum-surface px-3 py-2 text-xs text-aurum-text"
                  >
                    {item}
                  </p>
                ))
              )}
            </CardContent>
          </Card>
        </section>
      </section>

        </div>
        <div className="order-4">
      <section id="planning" className="scroll-mt-24 space-y-4">
        <SectionHeading
          eyebrow="Planning"
          title="Reserved space for future guidance"
          description="Budget and goal workflows stay visible as intentional placeholders, without pretending unbuilt planning automation is live."
          badge={<Badge variant="warn">Reserved</Badge>}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {sectionEntries.planning.map((entry) => {
            const enabled = getEntryEnabled(entry);

            return (
              <Card key={entry.id} id={entry.anchor}>
                <CardHeader className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <CardTitle>{entry.title}</CardTitle>
                      <CardDescription>{entry.description}</CardDescription>
                    </div>
                    <Badge variant={getCatalogEntryStateVariant(entry, enabled)}>
                      {getCatalogEntryStateLabel(entry, enabled)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-aurum-muted">{getEntryHint(entry)}</p>
                  <Button variant="secondary" disabled>
                    {entry.actionLabel}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
        </div>
      </div>
    </PageContainer>
  );
}
