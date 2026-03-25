'use client';

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

  return labels.join(' · ');
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
      setSnapshotsStatusMessage(`Demo snapshot created: ${created.id}`);
    } catch (error) {
      setSnapshotsStatusMessage(
        error instanceof Error ? error.message : 'Failed to create demo snapshot.',
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

  const getEntryActionDisabled = (entry: AIInsightsCatalogEntry): boolean => {
    const enabled = getEntryEnabled(entry);
    if (!enabled || entry.state === 'coming-soon') {
      return true;
    }

    switch (entry.id) {
      case 'monthly-financial-review':
        return (
          isGeneratingMonthlyReview ||
          snapshots.length === 0 ||
          (useSelectedSnapshotOverride && !selectedSnapshot?.id)
        );
      case 'daily-market-brief':
        return (
          isGeneratingDailyMarketBrief ||
          snapshots.length === 0 ||
          (useSelectedSnapshotForDailyMarketBrief && !selectedSnapshot?.id)
        );
      case 'financial-health-score':
        return !selectedSnapshot?.id || isGeneratingScore;
      case 'quick-chat':
        return !quickChatEnabled;
      case 'portfolio-analysis':
        return !selectedSnapshot?.id;
      case 'saved-conversations':
        return false;
      default:
        return true;
    }
  };

  const getEntryActionLabel = (entry: AIInsightsCatalogEntry): string => {
    switch (entry.id) {
      case 'monthly-financial-review':
        return isGeneratingMonthlyReview ? 'Generating...' : entry.actionLabel;
      case 'daily-market-brief':
        return isGeneratingDailyMarketBrief ? 'Generating...' : entry.actionLabel;
      case 'financial-health-score':
        return isGeneratingScore ? 'Generating...' : entry.actionLabel;
      default:
        return entry.actionLabel;
    }
  };

  const getEntryHint = (entry: AIInsightsCatalogEntry): string => {
    const enabled = getEntryEnabled(entry);
    if (!enabled) {
      return 'Current entitlement does not enable this action yet.';
    }

    switch (entry.id) {
      case 'monthly-financial-review':
        if (snapshots.length === 0) {
          return 'Create or import a portfolio snapshot first so Reports can stay grounded in the current artifact ownership model.';
        }
        return useSelectedSnapshotOverride
          ? selectedSnapshot?.id
            ? `Creates a server-backed ${effectiveReviewMonthLabel} review using the selected snapshot override.`
            : 'Select a portfolio snapshot before using the snapshot override.'
          : `Creates a server-backed ${effectiveReviewMonthLabel} review using deterministic snapshot anchoring.`;
      case 'daily-market-brief':
        if (snapshots.length === 0) {
          return 'Create or import a portfolio snapshot first so the Daily Market Brief can be persisted through the existing report artifact model.';
        }
        return useSelectedSnapshotForDailyMarketBrief
          ? selectedSnapshot?.id
            ? 'Creates a server-backed Daily Market Brief using the selected snapshot override and the current market context template.'
            : 'Select a portfolio snapshot before using the Daily Market Brief snapshot override.'
          : 'Creates a server-backed Daily Market Brief using the latest available snapshot and current market context template.';
      case 'financial-health-score':
        return selectedSnapshot?.id
          ? 'Generates and stores a snapshot-linked analysis artifact.'
          : 'Select a portfolio snapshot to activate score generation.';
      case 'portfolio-analysis':
        return selectedSnapshot?.id
          ? 'Prepares an entitlement-aware Quick Chat draft grounded in the selected snapshot, report, and score context.'
          : 'Select a portfolio snapshot to prepare a portfolio analysis draft.';
      case 'budget-planning':
      case 'goals-planning':
        return 'Planning workflows are intentionally reserved for the next milestone.';
      case 'quick-chat':
        return 'Ephemeral by default. Save only when the transcript deserves a place in history.';
      case 'saved-conversations':
        return 'Historical saved conversation reads remain available after subscription changes.';
      default:
        return '';
    }
  };

  const onCatalogEntryAction = (entry: AIInsightsCatalogEntry) => {
    switch (entry.id) {
      case 'monthly-financial-review':
        void onGenerateMonthlyFinancialReview();
        return;
      case 'daily-market-brief':
        void onGenerateDailyMarketBrief();
        return;
      case 'financial-health-score':
        void onGenerateDemoScore();
        return;
      case 'portfolio-analysis':
        onStartPortfolioAnalysis();
        return;
      case 'quick-chat':
        scrollToAnchor('quick-chat-section');
        return;
      case 'saved-conversations':
        scrollToAnchor('saved-conversations-section');
        return;
      default:
        return;
    }
  };

  return (
    <PageContainer className="space-y-6">
      <Card>
        <CardHeader className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="info">AI Product Layer</Badge>
                <Badge variant="neutral">Milestone 13.5</Badge>
              </div>
              <div className="space-y-1">
                <CardTitle>AI Insights</CardTitle>
                <CardDescription>
                  Aurum&apos;s AI financial intelligence center, organized into Reports, Analysis,
                  Planning, and Conversations while keeping PortfolioSnapshot as the canonical
                  upstream truth.
                </CardDescription>
              </div>
            </div>
            <div className="rounded-[16px] border border-aurum-border bg-[var(--aurum-surface-alt)] px-4 py-3 text-sm text-aurum-text">
              <p className="font-medium">Access status</p>
              <p className="mt-1 text-aurum-muted">
                {entitlements?.status === 'active'
                  ? 'Premium creation actions are available where enabled.'
                  : 'Historical artifacts and saved conversations remain readable.'}
              </p>
            </div>
          </div>
          {entitlementsStatusMessage ? (
            <p className="rounded-[10px] border border-aurum-border bg-aurum-surface px-3 py-2 text-xs text-aurum-text">
              {entitlementsStatusMessage}
            </p>
          ) : null}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {aiInsightsCatalogSections.map((section) => (
              <button
                key={section.key}
                type="button"
                onClick={() => scrollToAnchor(section.anchor)}
                className="rounded-[18px] border border-aurum-border bg-[var(--aurum-surface-alt)] px-4 py-4 text-left transition hover:border-[var(--aurum-accent)]/35 hover:bg-[var(--aurum-accent)]/5"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-aurum-text">{section.title}</p>
                  <Badge variant="neutral">{sectionCounts[section.key]}</Badge>
                </div>
                <p className="mt-2 text-sm text-aurum-muted">{section.description}</p>
              </button>
            ))}
          </div>
        </CardHeader>
      </Card>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {aiInsightsCatalogEntries.map((entry) => {
          const enabled = getEntryEnabled(entry);
          const actionDisabled = getEntryActionDisabled(entry);

          return (
            <Card key={entry.id} id={entry.anchor}>
              <CardHeader className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="text-base">{entry.title}</CardTitle>
                    <CardDescription>{entry.description}</CardDescription>
                  </div>
                  <Badge variant={getCatalogEntryStateVariant(entry, enabled)}>
                    {getCatalogEntryStateLabel(entry, enabled)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-aurum-muted">{getEntryHint(entry)}</p>
                <Button
                  variant={
                    entry.section === 'reports' || entry.id === 'quick-chat'
                      ? 'primary'
                      : 'secondary'
                  }
                  onClick={() => onCatalogEntryAction(entry)}
                  disabled={actionDisabled}
                >
                  {getEntryActionLabel(entry)}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-aurum-text">Conversations</h2>
            <Badge variant="info">Ephemeral + Saved</Badge>
          </div>
          <p className="text-sm text-aurum-muted">
            Quick Chat remains ephemeral by default, and persistent history mainly enters through
            Quick Chat -&gt; Save -&gt; Conversations.
          </p>
        </div>
      </section>

      <section id="conversations" className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card id="quick-chat-section">
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
              <p className="rounded-[10px] border border-aurum-border bg-aurum-surface px-3 py-2 text-xs text-aurum-text">
                {entitlementsStatusMessage}
              </p>
            ) : null}
            {!quickChatEnabled ? (
              <p className="rounded-[10px] border border-[var(--aurum-danger)]/30 bg-[var(--aurum-danger)]/10 px-3 py-2 text-xs text-aurum-text">
                Quick Chat is currently unavailable for this account.
              </p>
            ) : null}
            {!conversationSaveEnabled ? (
              <p className="rounded-[10px] border border-aurum-border bg-aurum-surface px-3 py-2 text-xs text-aurum-text">
                Saving is currently unavailable, but historical saved conversations remain readable.
              </p>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-h-[420px] space-y-3 overflow-auto rounded-[16px] border border-aurum-border bg-[var(--aurum-surface-alt)] p-4">
              {quickChatMessages.length === 0 ? (
                <div className="space-y-2 text-sm text-aurum-muted">
                  <p>Quick Chat starts as a local draft.</p>
                  <p>Select a snapshot, report, or score if you want grounded context.</p>
                </div>
              ) : (
                quickChatMessages.map((message, index) => (
                  <div
                    key={`${message.createdAt}-${index}`}
                    className={`rounded-[14px] border px-3 py-3 text-sm ${
                      message.role === 'assistant'
                        ? 'border-[var(--aurum-accent)]/25 bg-[var(--aurum-accent)]/10'
                        : 'border-aurum-border bg-aurum-surface'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-aurum-muted">
                        {message.role === 'assistant' ? 'Aurum' : 'You'}
                      </p>
                      <p className="text-[11px] text-aurum-muted">
                        {formatDateTime(message.createdAt)}
                      </p>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-aurum-text">{message.content}</p>
                    {message.mode ? (
                      <p className="mt-2 text-[11px] text-aurum-muted">
                        Reply mode: {message.mode === 'llm' ? 'provider-backed' : 'fallback'}
                      </p>
                    ) : null}
                  </div>
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
              <p className="rounded-[10px] border border-aurum-border bg-aurum-surface px-3 py-2 text-xs text-aurum-text">
                {quickChatStatusMessage}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conversation Flow</CardTitle>
            <CardDescription>
              Quick Chat stays local until you save it. Saved chats then appear in Conversations and
              remain readable later without changing the snapshot-first architecture.
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
                Saving is explicit and writes into the persistent conversation foundation from
                Milestone 13.1C.
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
        className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr]"
      >
        <Card>
          <CardHeader className="space-y-3">
            <div className="space-y-1">
              <CardTitle>Conversations</CardTitle>
              <CardDescription>
                Saved Quick Chat transcripts that belong to the current user.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => void loadConversations(selectedConversationId ?? undefined)}
                disabled={isConversationsLoading}
              >
                {isConversationsLoading ? 'Loading...' : 'Refresh Conversations'}
              </Button>
              <Button
                variant="destructive"
                onClick={() => void onDeleteSelectedConversation()}
                disabled={!selectedConversationId || isDeletingConversation}
              >
                {isDeletingConversation ? 'Deleting...' : 'Delete Selected'}
              </Button>
            </div>
            {conversationStatusMessage ? (
              <p className="rounded-[10px] border border-aurum-border bg-aurum-surface px-3 py-2 text-xs text-aurum-text">
                {conversationStatusMessage}
              </p>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-2">
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
                      ? ` · last activity ${formatDateTime(conversation.lastMessageAt)}`
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
              Persistent transcript detail loaded from the conversation API.
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

                <div className="space-y-3">
                  {selectedConversation.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`rounded-[14px] border px-3 py-3 text-sm ${
                        message.role === 'assistant'
                          ? 'border-[var(--aurum-accent)]/25 bg-[var(--aurum-accent)]/10'
                          : message.role === 'system'
                            ? 'border-dashed border-aurum-border bg-aurum-surface'
                            : 'border-aurum-border bg-aurum-surface'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-aurum-muted">
                          {message.role}
                        </p>
                        <p className="text-[11px] text-aurum-muted">
                          {formatDateTime(message.createdAt)}
                        </p>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-aurum-text">{message.content}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      <section id="reports" className="space-y-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-aurum-text">Reports</h2>
            <Badge variant="info">Monthly Financial Review</Badge>
          </div>
          <p className="text-sm text-aurum-muted">
            Formal AI deliverables linked to canonical snapshots and persisted as report artifacts.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader className="space-y-3">
            <div className="space-y-1">
              <CardTitle>Portfolio Snapshot Context</CardTitle>
              <CardDescription>
                Canonical snapshot selection used to ground Reports, Analysis, and Quick Chat.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                onClick={() => void onCreateDemoSnapshot()}
                disabled={isCreatingSnapshot || isSnapshotsLoading}
              >
                {isCreatingSnapshot ? 'Creating...' : 'Create Demo Snapshot'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => void loadSnapshots()}
                disabled={isSnapshotsLoading || isCreatingSnapshot}
              >
                {isSnapshotsLoading ? 'Loading...' : 'Refresh Snapshots'}
              </Button>
            </div>
            {snapshotsStatusMessage ? (
              <p className="rounded-[10px] border border-aurum-border bg-aurum-surface px-3 py-2 text-xs text-aurum-text">
                {snapshotsStatusMessage}
              </p>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-2">
            {snapshots.length === 0 ? (
              <p className="text-sm text-aurum-muted">No snapshots available.</p>
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

        <Card>
          <CardHeader className="space-y-3">
            <div className="space-y-1">
              <CardTitle>Monthly Financial Review Workflow</CardTitle>
              <CardDescription>
                Choose a review window, then let the server anchor the report to a deterministic
                snapshot strategy or your explicit snapshot override.
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
              <span className="text-xs text-aurum-muted">
                Historical report reads remain available after subscription changes.
              </span>
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
        <p className="rounded-[10px] border border-aurum-border bg-aurum-surface px-3 py-2 text-xs text-aurum-text">
          {monthlyReviewStatusMessage}
        </p>
      ) : null}

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card id="reports-daily-market-brief">
          <CardHeader className="space-y-3">
            <div className="space-y-1">
              <CardTitle>Daily Market Brief Workflow</CardTitle>
              <CardDescription>
                Generate a server-backed Daily Market Brief now using the internal market context
                assembler, with room for richer prompts and external context later.
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
              <span className="text-xs text-aurum-muted">
                V1 uses a lightweight internal market template and persists the result as a report
                artifact.
              </span>
            </div>
            {dailyMarketBriefStatusMessage ? (
              <p className="rounded-[10px] border border-aurum-border bg-aurum-surface px-3 py-2 text-xs text-aurum-text">
                {dailyMarketBriefStatusMessage}
              </p>
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
                Current-user delivery preferences foundation for future scheduled generation and
                subscription-aware delivery.
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
              <span className="text-xs text-aurum-muted">
                Scheduling preferences are stored now; full scheduled execution and notifications
                can layer in later.
              </span>
            </div>
            {dailyMarketBriefPreferencesStatusMessage ? (
              <p className="rounded-[10px] border border-aurum-border bg-aurum-surface px-3 py-2 text-xs text-aurum-text">
                {dailyMarketBriefPreferencesStatusMessage}
              </p>
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
                      Future scheduled generation can respect these preferences and entitlement
                      checks.
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
                      <option value="email_placeholder">Email placeholder</option>
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
              <p className="rounded-[10px] border border-aurum-border bg-aurum-surface px-3 py-2 text-xs text-aurum-text">
                {reportsStatusMessage}
              </p>
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
              Selected persisted report artifact from the Reports workflow.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedReport ? (
              <p className="text-sm text-aurum-muted">Select a report from the list.</p>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-aurum-muted">Title</p>
                    <p className="text-aurum-text">{selectedReport.title}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-aurum-muted">Report Type</p>
                    <p className="text-aurum-text">{selectedReport.reportType}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-aurum-muted">
                      Prompt Version
                    </p>
                    <p className="text-aurum-text">{selectedReport.promptVersion}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-aurum-muted">
                      Source Run ID
                    </p>
                    <p className="break-all text-aurum-text">{selectedReport.sourceRunId}</p>
                  </div>
                  {selectedPortfolioName ? (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-aurum-muted">
                        Portfolio Name
                      </p>
                      <p className="text-aurum-text">{selectedPortfolioName}</p>
                    </div>
                  ) : null}
                  {selectedSnapshotDate ? (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-aurum-muted">
                        Snapshot Date
                      </p>
                      <p className="text-aurum-text">{selectedSnapshotDate}</p>
                    </div>
                  ) : null}
                  {selectedReviewMonthLabel ? (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-aurum-muted">
                        Review Window
                      </p>
                      <p className="text-aurum-text">{selectedReviewMonthLabel}</p>
                    </div>
                  ) : null}
                  {selectedBriefDate ? (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-aurum-muted">Brief Date</p>
                      <p className="text-aurum-text">{selectedBriefDate}</p>
                    </div>
                  ) : null}
                  {selectedMarketSessionLabel ? (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-aurum-muted">
                        Market Session
                      </p>
                      <p className="text-aurum-text">{selectedMarketSessionLabel}</p>
                    </div>
                  ) : null}
                  {selectedReportScope ? (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-aurum-muted">
                        Report Scope
                      </p>
                      <p className="text-aurum-text">{selectedReportScope}</p>
                    </div>
                  ) : null}
                  {selectedSnapshotSelectionStrategy ? (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-aurum-muted">
                        Snapshot Selection
                      </p>
                      <p className="break-all text-aurum-text">
                        {selectedSnapshotSelectionStrategy}
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-aurum-text">Content (Markdown)</p>
                  <pre className="max-h-[560px] overflow-auto rounded-[12px] border border-aurum-border bg-aurum-surface p-3 text-xs whitespace-pre-wrap text-aurum-text">
                    {selectedReport.contentMarkdown}
                  </pre>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      <section id="analysis" className="space-y-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-aurum-text">Analysis</h2>
            <Badge variant="info">Diagnostics</Badge>
          </div>
          <p className="text-sm text-aurum-muted">
            Scores and diagnostic views that help explain portfolio and financial health.
          </p>
        </div>
      </section>

      <section className="space-y-6">
        <Card id="analysis-portfolio-analysis">
          <CardHeader className="space-y-3">
            <div className="space-y-1">
              <CardTitle>Portfolio Analysis Preview</CardTitle>
              <CardDescription>
                Prepare a guided Quick Chat prompt from the selected snapshot, report, and score
                context while richer structured portfolio analysis continues to evolve.
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
              <span className="text-xs text-aurum-muted">
                Uses the current snapshot selection and keeps Quick Chat ephemeral unless you save
                it.
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-[12px] border border-aurum-border bg-aurum-surface px-3 py-3">
                <p className="text-xs uppercase tracking-wide text-aurum-muted">Snapshot</p>
                <p className="mt-1 text-aurum-text">
                  {selectedSnapshot?.metadata.portfolioName ?? 'Select a portfolio snapshot'}
                </p>
              </div>
              <div className="rounded-[12px] border border-aurum-border bg-aurum-surface px-3 py-3">
                <p className="text-xs uppercase tracking-wide text-aurum-muted">Report Context</p>
                <p className="mt-1 text-aurum-text">
                  {selectedReport?.title ?? 'Optional monthly review context'}
                </p>
              </div>
              <div className="rounded-[12px] border border-aurum-border bg-aurum-surface px-3 py-3">
                <p className="text-xs uppercase tracking-wide text-aurum-muted">Score Context</p>
                <p className="mt-1 text-aurum-text">
                  {selectedScoreInsight?.headline ?? 'Optional Financial Health Score context'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-3">
            <div className="space-y-1">
              <CardTitle>Financial Health Score v1</CardTitle>
              <CardDescription>
                Server-backed score artifact history scoped by selected snapshot.
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
              <span className="text-xs text-aurum-muted">
                Score creation and history are loaded from API, scoped by selected snapshot.
              </span>
            </div>
            {scoreStatusMessage ? (
              <p className="rounded-[10px] border border-aurum-border bg-aurum-surface px-3 py-2 text-xs text-aurum-text">
                {scoreStatusMessage}
              </p>
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
              <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-aurum-muted">Total Score</p>
                  <p className="text-lg font-semibold text-aurum-text">
                    {selectedScoreResult.totalScore}/{selectedScoreResult.maxScore}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-aurum-muted">Grade</p>
                  <p className="text-lg font-semibold capitalize text-aurum-text">
                    {selectedScoreResult.grade.replace('_', ' ')}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs uppercase tracking-wide text-aurum-muted">Headline</p>
                  <p className="text-aurum-text">{selectedScoreInsight.headline}</p>
                </div>
                <div className="md:col-span-2 xl:col-span-4">
                  <p className="text-xs uppercase tracking-wide text-aurum-muted">Summary</p>
                  <p className="text-aurum-text">{selectedScoreInsight.summary}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dimension Breakdown</CardTitle>
            <CardDescription>
              Per-dimension deterministic scores, labels, and reasoning from the score engine.
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

      <section id="planning" className="space-y-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-aurum-text">Planning</h2>
            <Badge variant="warn">Reserved Slots</Badge>
          </div>
          <p className="text-sm text-aurum-muted">
            System-owned planning entries are visible now so budget and goals workflows can land in
            a clear place without another IA rewrite.
          </p>
        </div>

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
    </PageContainer>
  );
}
