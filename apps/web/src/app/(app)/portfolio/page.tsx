'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type {
  ConnectedSource,
  ConnectedSourceAccount,
  ConnectedFinanceOverview,
  ConnectedFinanceHealthStatus,
  ManualStaticValuation,
  PortfolioChangeExplanation,
  PortfolioDiagnostics,
  PortfolioHistorySeries,
  PortfolioAssetCategory,
  PortfolioSnapshot,
} from '@aurum/core';
import { manualInstitutionPresets } from '@aurum/core';
import { CoinbaseCryptoSection } from '@/components/portfolio/CoinbaseCryptoSection';
import { ChangeExplanationPanel } from '@/components/portfolio/ChangeExplanationPanel';
import { PlaidSandboxBankSection } from '@/components/portfolio/PlaidSandboxBankSection';
import { PortfolioHistorySection } from '@/components/portfolio/PortfolioHistorySection';
import { PortfolioAttentionItems } from '@/components/attention/PortfolioAttentionItems';
import { SnapTradeBrokerageSection } from '@/components/portfolio/SnapTradeBrokerageSection';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  createConnectedSource,
  createConnectedSourceAccount,
  createManualInstitution,
  createManualStaticValuation,
  getConnectedFinanceOverview,
  listConnectedSourceAccounts,
  listConnectedSourceSnapshots,
  listConnectedSources,
  listManualStaticValuations,
  materializeManualStaticSnapshot,
} from '@/lib/api/connected-finance';
import {
  getPortfolioSnapshotChangeExplanation,
  getPortfolioSnapshotDiagnostics,
  getPortfolioSnapshotHistory,
  listPortfolioSnapshots,
} from '@/lib/api/portfolio-snapshots';

const assetTypeOptions: PortfolioAssetCategory[] = [
  'cash',
  'equity',
  'etf',
  'crypto',
  'fund',
  'other',
];

const inputClassName =
  'h-10 w-full rounded-[var(--aurum-radius-md)] border border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)] px-3 text-sm text-[var(--aurum-text)] outline-none transition focus:border-[var(--aurum-accent)]';

const textAreaClassName =
  'min-h-[88px] w-full rounded-[var(--aurum-radius-md)] border border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)] px-3 py-2 text-sm text-[var(--aurum-text)] outline-none transition focus:border-[var(--aurum-accent)]';

function formatMoney(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDateTime(value: string | undefined): string {
  if (!value) {
    return 'N/A';
  }

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

function formatAssetCategory(category: PortfolioAssetCategory | undefined): string {
  if (!category) {
    return 'Other';
  }

  if (category === 'etf') {
    return 'ETF';
  }

  return category
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function formatSourceType(value: string | undefined): string {
  if (!value) {
    return 'Portfolio input';
  }

  return value
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function formatHealthStatus(status: ConnectedFinanceHealthStatus): string {
  switch (status) {
    case 'fresh':
      return 'Active';
    case 'stale':
      return 'Stale';
    case 'needs_attention':
      return 'Needs attention';
    case 'never_synced':
      return 'Needs setup';
    case 'disconnected':
      return 'Disconnected';
    default:
      return 'Unknown';
  }
}

function getHealthBadgeVariant(
  status: ConnectedFinanceHealthStatus,
): 'neutral' | 'info' | 'warn' | 'good' | 'error' {
  switch (status) {
    case 'fresh':
      return 'good';
    case 'stale':
    case 'never_synced':
      return 'warn';
    case 'needs_attention':
    case 'disconnected':
      return 'error';
    default:
      return 'neutral';
  }
}

function getAssetAllocation(snapshot: PortfolioSnapshot | null) {
  if (!snapshot) {
    return [];
  }

  const totals = new Map<string, number>();
  snapshot.positions.forEach((position) => {
    const label = formatAssetCategory(position.category);
    totals.set(label, (totals.get(label) ?? 0) + position.marketValue);
  });

  return [...totals.entries()]
    .map(([label, value]) => ({
      label,
      value,
      percent: snapshot.totalValue > 0 ? Math.round((value / snapshot.totalValue) * 1000) / 10 : 0,
    }))
    .sort((left, right) => right.value - left.value);
}

function compareSnapshots(left: PortfolioSnapshot, right: PortfolioSnapshot): number {
  const leftDate = left.metadata.snapshotDate ?? '';
  const rightDate = right.metadata.snapshotDate ?? '';
  const dateComparison = rightDate.localeCompare(leftDate);
  if (dateComparison !== 0) {
    return dateComparison;
  }

  return (right.createdAt ?? '').localeCompare(left.createdAt ?? '');
}

function isConsolidatedSnapshot(snapshot: PortfolioSnapshot): boolean {
  return !snapshot.metadata.sourceId;
}

function getSnapshotScopeLabel(snapshot: PortfolioSnapshot | null): string {
  if (!snapshot) {
    return 'Snapshot unavailable';
  }
  if (isConsolidatedSnapshot(snapshot)) {
    return 'Consolidated portfolio';
  }

  return (
    snapshot.metadata.sourceLabel ??
    snapshot.metadata.portfolioName ??
    formatSourceType(snapshot.metadata.sourceType)
  );
}

function scrollToSection(anchor: string) {
  if (typeof document === 'undefined') {
    return;
  }

  document.getElementById(anchor)?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
}

function defaultDateOnly(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function PortfolioPage() {
  const [sources, setSources] = useState<ConnectedSource[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<ConnectedSourceAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [valuations, setValuations] = useState<ManualStaticValuation[]>([]);
  const [sourceSnapshots, setSourceSnapshots] = useState<PortfolioSnapshot[]>([]);
  const [allSnapshots, setAllSnapshots] = useState<PortfolioSnapshot[]>([]);
  const [overview, setOverview] = useState<ConnectedFinanceOverview | null>(null);
  const [portfolioHistory, setPortfolioHistory] = useState<PortfolioHistorySeries | null>(null);
  const [changeExplanation, setChangeExplanation] = useState<PortfolioChangeExplanation | null>(
    null,
  );
  const [diagnostics, setDiagnostics] = useState<PortfolioDiagnostics | null>(null);
  const [isLoadingPortfolioStory, setIsLoadingPortfolioStory] = useState(false);
  const [portfolioHistoryError, setPortfolioHistoryError] = useState('');
  const [changeExplanationError, setChangeExplanationError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isLoadingSources, setIsLoadingSources] = useState(false);
  const [isCreatingPresetInstitution, setIsCreatingPresetInstitution] = useState(false);
  const [isSubmittingSource, setIsSubmittingSource] = useState(false);
  const [isSubmittingAccount, setIsSubmittingAccount] = useState(false);
  const [isSubmittingValuation, setIsSubmittingValuation] = useState(false);
  const [isMaterializing, setIsMaterializing] = useState(false);
  const [sourceForm, setSourceForm] = useState({
    displayName: '',
    institutionName: '',
    baseCurrency: 'USD',
  });
  const [selectedInstitutionPresetKey, setSelectedInstitutionPresetKey] = useState<string>(
    manualInstitutionPresets[0]?.institutionKey ?? 'fidelity',
  );
  const [accountForm, setAccountForm] = useState({
    displayName: '',
    accountType: 'Shares',
    currency: 'USD',
    assetType: 'equity' as PortfolioAssetCategory,
    assetSubType: '',
    institutionOrIssuer: '',
  });
  const [valuationForm, setValuationForm] = useState({
    valuationDate: defaultDateOnly(),
    marketValue: '',
    quantity: '',
    unitPrice: '',
    symbol: '',
    assetName: '',
    note: '',
  });
  const [materializeSnapshotDate, setMaterializeSnapshotDate] = useState('');

  const selectedSource = sources.find((source) => source.id === selectedSourceId);
  const selectedAccount = accounts.find((account) => account.id === selectedAccountId);
  const snapshotInventory = [...allSnapshots].sort(compareSnapshots);
  const latestSnapshot = snapshotInventory[0] ?? null;
  const preferredPortfolioSnapshot =
    snapshotInventory.find(isConsolidatedSnapshot) ?? latestSnapshot;
  const preferredSnapshotScopeLabel = getSnapshotScopeLabel(preferredPortfolioSnapshot);
  const isPreferredSnapshotConsolidated = preferredPortfolioSnapshot
    ? isConsolidatedSnapshot(preferredPortfolioSnapshot)
    : false;
  const assetAllocation = getAssetAllocation(preferredPortfolioSnapshot);

  const loadSources = async () => {
    setIsLoadingSources(true);

    try {
      const nextSources = await listConnectedSources('MANUAL_STATIC');
      setSources(nextSources);
      setSelectedSourceId((current) => {
        const hasCurrent = current ? nextSources.some((source) => source.id === current) : false;
        return hasCurrent ? current : (nextSources[0]?.id ?? null);
      });
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : 'Failed to load manual institutions.',
      );
    } finally {
      setIsLoadingSources(false);
    }
  };

  const loadAllSnapshots = async () => {
    try {
      setAllSnapshots(await listPortfolioSnapshots());
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : 'Failed to load portfolio snapshots.',
      );
    }
  };

  const loadOverview = async () => {
    try {
      setOverview(await getConnectedFinanceOverview());
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : 'Failed to load institution overview.',
      );
    }
  };

  const loadAccountsForSource = async (sourceId: string | null) => {
    if (!sourceId) {
      setAccounts([]);
      setSelectedAccountId(null);
      setSourceSnapshots([]);
      return;
    }

    try {
      const [nextAccounts, nextSnapshots] = await Promise.all([
        listConnectedSourceAccounts(sourceId),
        listConnectedSourceSnapshots(sourceId),
      ]);
      setAccounts(nextAccounts);
      setSelectedAccountId((current) => {
        const hasCurrent = current ? nextAccounts.some((account) => account.id === current) : false;
        return hasCurrent ? current : (nextAccounts[0]?.id ?? null);
      });
      setSourceSnapshots(nextSnapshots);
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : 'Failed to load accounts and snapshots.',
      );
    }
  };

  const loadValuationsForAccount = async (accountId: string | null) => {
    if (!accountId) {
      setValuations([]);
      return;
    }

    try {
      setValuations(await listManualStaticValuations(accountId));
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : 'Failed to load valuation history.',
      );
    }
  };

  useEffect(() => {
    void Promise.all([loadSources(), loadAllSnapshots(), loadOverview()]);
  }, []);

  useEffect(() => {
    void loadAccountsForSource(selectedSourceId);
  }, [selectedSourceId]);

  useEffect(() => {
    void loadValuationsForAccount(selectedAccountId);
  }, [selectedAccountId]);

  useEffect(() => {
    if (!preferredPortfolioSnapshot?.id) {
      setPortfolioHistory(null);
      setChangeExplanation(null);
      setDiagnostics(null);
      setIsLoadingPortfolioStory(false);
      return;
    }

    let cancelled = false;
    setIsLoadingPortfolioStory(true);
    setPortfolioHistory(null);
    setChangeExplanation(null);
    setDiagnostics(null);
    setPortfolioHistoryError('');
    setChangeExplanationError('');

    const historyRequest = preferredPortfolioSnapshot.metadata.sourceId
      ? getPortfolioSnapshotHistory({
          scope: 'source',
          sourceId: preferredPortfolioSnapshot.metadata.sourceId,
        })
      : getPortfolioSnapshotHistory({ scope: 'consolidated' });

    void Promise.allSettled([
      historyRequest,
      getPortfolioSnapshotChangeExplanation(preferredPortfolioSnapshot.id),
      getPortfolioSnapshotDiagnostics(preferredPortfolioSnapshot.id),
    ]).then(([historyResult, explanationResult, diagnosticsResult]) => {
      if (cancelled) return;

      if (historyResult.status === 'fulfilled') {
        setPortfolioHistory(historyResult.value);
      } else {
        setPortfolioHistoryError(
          historyResult.reason instanceof Error
            ? historyResult.reason.message
            : 'Failed to load portfolio history.',
        );
      }
      if (explanationResult.status === 'fulfilled') {
        setChangeExplanation(explanationResult.value);
      } else {
        setChangeExplanationError(
          explanationResult.reason instanceof Error
            ? explanationResult.reason.message
            : 'Failed to load change explanation.',
        );
      }
      if (diagnosticsResult.status === 'fulfilled') {
        setDiagnostics(diagnosticsResult.value);
      }
      setIsLoadingPortfolioStory(false);
    });

    return () => {
      cancelled = true;
    };
  }, [
    preferredPortfolioSnapshot?.id,
    preferredPortfolioSnapshot?.metadata.sourceId,
  ]);

  const onCreateSource = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmittingSource(true);
    setStatusMessage('');

    try {
      const created = await createConnectedSource({
        kind: 'MANUAL_STATIC',
        displayName: sourceForm.displayName.trim(),
        institutionName: sourceForm.institutionName.trim() || undefined,
        baseCurrency: sourceForm.baseCurrency.trim() || 'USD',
      });
      await Promise.all([loadSources(), loadOverview()]);
      setSelectedSourceId(created.id);
      setSourceForm({
        displayName: '',
        institutionName: '',
        baseCurrency: sourceForm.baseCurrency.trim() || 'USD',
      });
      setStatusMessage(`Manual institution created: ${created.displayName}`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Failed to create institution.');
    } finally {
      setIsSubmittingSource(false);
    }
  };

  const onCreatePresetInstitution = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsCreatingPresetInstitution(true);
    setStatusMessage('');

    try {
      const result = await createManualInstitution({
        institutionKey: selectedInstitutionPresetKey,
      });
      await Promise.all([loadSources(), loadOverview()]);
      setSelectedSourceId(result.source.id);
      setStatusMessage(`Manual institution created: ${result.source.displayName}`);
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : 'Failed to create manual institution.',
      );
    } finally {
      setIsCreatingPresetInstitution(false);
    }
  };

  const onCreateAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedSourceId) {
      setStatusMessage('Select a manual institution before adding an account.');
      return;
    }

    setIsSubmittingAccount(true);
    setStatusMessage('');

    try {
      const created = await createConnectedSourceAccount(selectedSourceId, {
        displayName: accountForm.displayName.trim(),
        accountType: accountForm.accountType.trim(),
        currency: accountForm.currency.trim() || undefined,
        assetType: accountForm.assetType,
        assetSubType: accountForm.assetSubType.trim() || undefined,
        institutionOrIssuer: accountForm.institutionOrIssuer.trim() || undefined,
      });
      await Promise.all([loadAccountsForSource(selectedSourceId), loadOverview()]);
      setSelectedAccountId(created.id);
      setAccountForm({
        displayName: '',
        accountType: 'Shares',
        currency: selectedSource?.baseCurrency ?? 'USD',
        assetType: 'equity',
        assetSubType: '',
        institutionOrIssuer: '',
      });
      setStatusMessage(`Manual holding created: ${created.displayName}`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Failed to create account.');
    } finally {
      setIsSubmittingAccount(false);
    }
  };

  const onAddValuation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedAccountId) {
      setStatusMessage('Select an account before appending a valuation.');
      return;
    }

    setIsSubmittingValuation(true);
    setStatusMessage('');

    try {
      const created = await createManualStaticValuation(selectedAccountId, {
        valuationDate: valuationForm.valuationDate,
        marketValue: Number(valuationForm.marketValue),
        quantity: valuationForm.quantity ? Number(valuationForm.quantity) : undefined,
        unitPrice: valuationForm.unitPrice ? Number(valuationForm.unitPrice) : undefined,
        symbol: valuationForm.symbol.trim() || undefined,
        assetName: valuationForm.assetName.trim() || undefined,
        note: valuationForm.note.trim() || undefined,
        currency: selectedAccount?.currency,
      });
      await loadValuationsForAccount(selectedAccountId);
      setValuationForm({
        valuationDate: defaultDateOnly(),
        marketValue: '',
        quantity: '',
        unitPrice: '',
        symbol: '',
        assetName: '',
        note: '',
      });
      setStatusMessage(`Valuation appended for ${created.valuationDate}.`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Failed to append valuation.');
    } finally {
      setIsSubmittingValuation(false);
    }
  };

  const onMaterializeSnapshot = async () => {
    if (!selectedSourceId) {
      setStatusMessage('Select a manual institution before creating a snapshot.');
      return;
    }

    setIsMaterializing(true);
    setStatusMessage('');

    try {
      await materializeManualStaticSnapshot(
        selectedSourceId,
        materializeSnapshotDate.trim() || undefined,
      );
      await Promise.all([
        loadAccountsForSource(selectedSourceId),
        loadAllSnapshots(),
        loadOverview(),
      ]);
      setStatusMessage('Snapshot created and saved to your portfolio history.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Failed to create snapshot.');
    } finally {
      setIsMaterializing(false);
    }
  };

  return (
    <PageContainer className="space-y-6">
      <Card className="aurum-elevated-surface relative overflow-hidden border-[var(--aurum-border)]">
        <CardContent className="relative space-y-8 px-5 py-6 sm:px-6 sm:py-7 lg:px-8">
          <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)] xl:items-start">
            <div className="space-y-5">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="neutral">Asset Center</Badge>
                  <Badge variant="info">Snapshot-aware</Badge>
                </div>
                <div className="space-y-2">
                  <h1 className="text-3xl font-semibold tracking-tight text-[var(--aurum-text)] sm:text-4xl">
                    Portfolio
                  </h1>
                  <p className="max-w-3xl text-sm leading-7 text-[var(--aurum-text-muted)] sm:text-[15px]">
                    Keep your latest wealth state in view, move through accounts and snapshots with
                    confidence, and drop into connection or manual asset workflows only when you
                    need to maintain the portfolio layer.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button onClick={() => scrollToSection('snapshot-library')}>
                  View Snapshot Library
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => scrollToSection('connections-workspace')}
                >
                  Manage Connections
                </Button>
                <Button variant="secondary" onClick={() => scrollToSection('manual-workspace')}>
                  Add Manual Asset
                </Button>
                <Link
                  href="/ai-insights#analysis-portfolio-analysis"
                  className="inline-flex min-h-11 items-center justify-center rounded-[var(--aurum-radius-md)] border border-[var(--aurum-border)] bg-white px-4 text-sm font-medium text-[var(--aurum-text)] shadow-[var(--aurum-shadow)] transition hover:border-[var(--aurum-accent)]/35 hover:bg-[var(--aurum-surface-alt)]"
                >
                  Run AI Analysis
                </Link>
              </div>
            </div>

            <div className="rounded-[24px] border border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)] p-5 shadow-[var(--aurum-shadow)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aurum-text-muted)]">
                Current Portfolio Posture
              </p>
              {preferredPortfolioSnapshot ? (
                <div className="mt-4 space-y-3">
                  <p className="text-3xl font-semibold text-[var(--aurum-text)]">
                    {formatMoney(
                      preferredPortfolioSnapshot.totalValue,
                      preferredPortfolioSnapshot.metadata.valuationCurrency ?? 'USD',
                    )}
                  </p>
                  <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                    <div className="rounded-[16px] border border-[var(--aurum-border)] bg-white/80 px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-[var(--aurum-text-muted)]">
                        Snapshot
                      </p>
                      <p className="mt-1 font-medium text-[var(--aurum-text)]">
                        {preferredPortfolioSnapshot.metadata.portfolioName ?? 'Portfolio snapshot'}
                      </p>
                    </div>
                    <div className="rounded-[16px] border border-[var(--aurum-border)] bg-white/80 px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-[var(--aurum-text-muted)]">
                        Positions
                      </p>
                      <p className="mt-1 font-medium text-[var(--aurum-text)]">
                        {preferredPortfolioSnapshot.positions.length}
                      </p>
                    </div>
                    <div className="rounded-[16px] border border-[var(--aurum-border)] bg-white/80 px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-[var(--aurum-text-muted)]">
                        Cash
                      </p>
                      <p className="mt-1 font-medium text-[var(--aurum-text)]">
                        {preferredPortfolioSnapshot.cashValue == null
                          ? 'Not tracked'
                          : formatMoney(
                              preferredPortfolioSnapshot.cashValue,
                              preferredPortfolioSnapshot.metadata.valuationCurrency ?? 'USD',
                            )}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-[var(--aurum-text-muted)]">
                    Based on snapshot:{' '}
                    {preferredPortfolioSnapshot.metadata.portfolioName ?? 'Portfolio snapshot'}.
                    Scope: {preferredSnapshotScopeLabel}. Snapshot date:{' '}
                    {preferredPortfolioSnapshot.metadata.snapshotDate ?? 'Unavailable'}.
                  </p>
                  {!isPreferredSnapshotConsolidated ? (
                    <p className="rounded-[12px] border border-[var(--aurum-border)] bg-white/80 px-3 py-2 text-xs text-[var(--aurum-text-muted)]">
                      This view is based on a single-institution snapshot because no consolidated
                      snapshot exists yet.
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-4 text-sm leading-7 text-[var(--aurum-text-muted)]">
                  No portfolio snapshot yet. Connect an institution or use the manual workspace to
                  create the first portfolio state for Aurum Home and AI workflows.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="space-y-1">
            <CardDescription>Current Posture Snapshot</CardDescription>
            <CardTitle className="text-xl">
              {preferredPortfolioSnapshot
                ? formatMoney(
                    preferredPortfolioSnapshot.totalValue,
                    preferredPortfolioSnapshot.metadata.valuationCurrency ?? 'USD',
                  )
                : 'Not available'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm text-[var(--aurum-text-muted)]">
            {preferredPortfolioSnapshot
              ? `${preferredSnapshotScopeLabel} | ${
                  preferredPortfolioSnapshot.metadata.snapshotDate ?? 'Snapshot date unavailable'
                }`
              : 'Create or sync a first snapshot to activate the portfolio layer.'}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-1">
            <CardDescription>Snapshot Library</CardDescription>
            <CardTitle className="text-xl">{snapshotInventory.length}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm text-[var(--aurum-text-muted)]">
            Saved snapshots available across connected and manual institutions.
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-1">
            <CardDescription>Manual Institutions</CardDescription>
            <CardTitle className="text-xl">{sources.length}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm text-[var(--aurum-text-muted)]">
            {selectedSource
              ? `Current institution: ${selectedSource.displayName}`
              : 'Manual institutions stay available when a live connection is not the right fit.'}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-1">
            <CardDescription>Selected Asset Context</CardDescription>
            <CardTitle className="text-xl">
              {selectedAccount ? valuations.length : accounts.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-sm text-[var(--aurum-text-muted)]">
            {selectedAccount
              ? `Valuation entries on ${selectedAccount.displayName}`
              : selectedSource
                ? `Accounts under ${selectedSource.displayName}`
                : 'Pick a manual institution or account when you need to maintain private assets.'}
          </CardContent>
        </Card>
      </section>

      <PortfolioAttentionItems
        title="Portfolio Attention"
        description="Current product actions derived from source freshness, snapshot changes, allocation, and concentration diagnostics."
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle>Institution Overview</CardTitle>
              <CardDescription>
                Account coverage, last synced state, and next action for each institution.
              </CardDescription>
            </div>
            {overview ? (
              <div className="flex flex-wrap gap-2">
                <Badge variant="info">{overview.summary.sourceCount} institutions</Badge>
                <Badge variant="neutral">{overview.summary.accountCount} accounts</Badge>
                {overview.summary.needsAttentionCount > 0 ? (
                  <Badge variant="error">
                    {overview.summary.needsAttentionCount} need attention
                  </Badge>
                ) : null}
                {overview.summary.staleSourceCount > 0 ? (
                  <Badge variant="warn">{overview.summary.staleSourceCount} stale</Badge>
                ) : null}
              </div>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {!overview ? (
            <p className="text-sm text-[var(--aurum-text-muted)]">Institution health is loading.</p>
          ) : overview.sources.length === 0 ? (
            <p className="text-sm text-[var(--aurum-text-muted)]">
              No institutions connected yet. Add a manual institution or connect a read-only
              provider connection below.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {overview.sources.map((item) => (
                <div
                  key={item.source.id}
                  className="rounded-[16px] border border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)] px-4 py-4 text-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-[var(--aurum-text)]">
                        {item.source.institutionName ?? item.source.displayName}
                      </p>
                      <p className="mt-1 text-xs text-[var(--aurum-text-muted)]">
                        {item.accounts.length} account{item.accounts.length === 1 ? '' : 's'}
                      </p>
                    </div>
                    <Badge variant={getHealthBadgeVariant(item.health.status)}>
                      {formatHealthStatus(item.health.status)}
                    </Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-[var(--aurum-text-muted)] sm:grid-cols-2">
                    <p>Last synced: {formatDateTime(item.health.lastSuccessfulSyncAt)}</p>
                    <p>
                      Latest snapshot: {item.latestSnapshot?.metadata.snapshotDate ?? 'Not created'}
                    </p>
                  </div>
                  {item.health.recommendedAction ? (
                    <p className="mt-3 text-xs text-[var(--aurum-text)]">
                      {item.health.recommendedAction}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <PortfolioHistorySection
        snapshot={preferredPortfolioSnapshot}
        history={portfolioHistory}
        isLoading={isLoadingPortfolioStory}
        error={portfolioHistoryError}
      />

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card id="snapshot-library" className="scroll-mt-24">
          <CardHeader>
            <CardTitle>Snapshot Library</CardTitle>
            <CardDescription>
              Portfolio snapshots stay near the top because they anchor Home, AI Insights, and the
              broader wealth state.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {snapshotInventory.length === 0 ? (
              <p className="text-sm text-[var(--aurum-text-muted)]">
                No portfolio snapshots found yet. Connect an institution or create one from the
                manual workspace below.
              </p>
            ) : (
              snapshotInventory.slice(0, 6).map((snapshot) => (
                <div
                  key={snapshot.id}
                  className="rounded-[16px] border border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)] px-4 py-4 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-[var(--aurum-text)]">
                      {snapshot.metadata.portfolioName ?? 'Untitled Snapshot'}
                    </p>
                    <p className="text-[var(--aurum-text)]">
                      {formatMoney(
                        snapshot.totalValue,
                        snapshot.metadata.valuationCurrency ?? 'USD',
                      )}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-[var(--aurum-text-muted)]">
                    {snapshot.metadata.snapshotDate} | {snapshot.positions.length} positions
                  </p>
                  <p className="mt-1 text-xs text-[var(--aurum-text-muted)]">
                    Institution:{' '}
                    {snapshot.metadata.sourceLabel ??
                      formatSourceType(snapshot.metadata.sourceType)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Asset Overview</CardTitle>
              <CardDescription>
                Allocation is calculated from the preferred portfolio snapshot. Consolidated
                snapshots are used first when available.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-[var(--aurum-text)]">
              {preferredPortfolioSnapshot ? (
                <div className="rounded-[12px] border border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)] px-3 py-3 text-xs text-[var(--aurum-text-muted)]">
                  <p>
                    Based on snapshot:{' '}
                    {preferredPortfolioSnapshot.metadata.portfolioName ?? 'Portfolio snapshot'}
                  </p>
                  <p>Scope: {preferredSnapshotScopeLabel}</p>
                  {!isPreferredSnapshotConsolidated ? (
                    <p className="mt-2 text-[var(--aurum-text)]">
                      This view is based on a single-institution snapshot because no consolidated
                      snapshot exists yet.
                    </p>
                  ) : null}
                </div>
              ) : null}
              {!preferredPortfolioSnapshot ? (
                <p className="text-sm text-[var(--aurum-text-muted)]">
                  Create or sync a snapshot to see asset mix, liquidity, and position coverage.
                </p>
              ) : assetAllocation.length === 0 ? (
                <p className="text-sm text-[var(--aurum-text-muted)]">
                  This snapshot has no categorized positions yet.
                </p>
              ) : (
                assetAllocation.slice(0, 6).map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[16px] border border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)] px-4 py-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-[var(--aurum-text)]">{item.label}</p>
                      <p className="text-sm text-[var(--aurum-text)]">
                        {formatMoney(
                          item.value,
                          preferredPortfolioSnapshot.metadata.valuationCurrency ?? 'USD',
                        )}
                      </p>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-[rgba(212,175,55,0.14)]">
                      <div
                        className="h-full rounded-full bg-[var(--aurum-accent)]"
                        style={{ width: `${Math.min(100, Math.max(0, item.percent))}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-[var(--aurum-text-muted)]">
                      {item.percent.toFixed(1)}% of selected snapshot value
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Diagnostics</CardTitle>
              <CardDescription>
                Deterministic allocation, concentration, and data health signals from the preferred
                snapshot.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {!preferredPortfolioSnapshot ? (
                <p className="text-[var(--aurum-text-muted)]">
                  Create a snapshot to calculate diagnostics.
                </p>
              ) : !diagnostics ? (
                <p className="text-[var(--aurum-text-muted)]">Diagnostics are loading.</p>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-[16px] border border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)] px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-[var(--aurum-text-muted)]">
                        Cash
                      </p>
                      <p className="mt-1 font-semibold text-[var(--aurum-text)]">
                        {(diagnostics.postureSummary.cashRatio * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="rounded-[16px] border border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)] px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-[var(--aurum-text-muted)]">
                        Crypto
                      </p>
                      <p className="mt-1 font-semibold text-[var(--aurum-text)]">
                        {(diagnostics.postureSummary.cryptoRatio * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="rounded-[16px] border border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)] px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-[var(--aurum-text-muted)]">
                        Health
                      </p>
                      <p className="mt-1 font-semibold capitalize text-[var(--aurum-text)]">
                        {diagnostics.dataHealth.status}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--aurum-text-muted)]">
                      Top Holdings
                    </p>
                    {diagnostics.topHoldings.slice(0, 3).map((holding) => (
                      <div
                        key={`${holding.sourceAccountId ?? 'unknown'}-${holding.assetKey}`}
                        className="rounded-[12px] border border-[var(--aurum-border)] bg-white px-3 py-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium text-[var(--aurum-text)]">
                            {holding.symbol ?? holding.name ?? holding.assetKey}
                          </p>
                          <p className="text-xs text-[var(--aurum-text-muted)]">
                            {(holding.weight * 100).toFixed(1)}%
                          </p>
                        </div>
                        <p className="mt-1 text-xs text-[var(--aurum-text-muted)]">
                          {holding.sourceAccountName ?? 'Unknown account'} |{' '}
                          {formatMoney(
                            holding.marketValue,
                            preferredPortfolioSnapshot.metadata.valuationCurrency ?? 'USD',
                          )}
                        </p>
                      </div>
                    ))}
                  </div>

                  {diagnostics.flags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {diagnostics.flags.slice(0, 5).map((flag) => (
                        <Badge
                          key={flag.code}
                          variant={flag.severity === 'warning' ? 'warn' : 'info'}
                        >
                          {flag.label}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <Badge variant="good">No diagnostic flags</Badge>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <ChangeExplanationPanel
            snapshot={preferredPortfolioSnapshot}
            explanation={changeExplanation}
            isLoading={isLoadingPortfolioStory}
            error={changeExplanationError}
          />

          <Card>
            <CardHeader>
              <CardTitle>Portfolio Workflows</CardTitle>
              <CardDescription>
                Start with snapshot truth, then maintain institutions only when the asset layer
                needs attention.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-[var(--aurum-text)]">
              <div className="rounded-[16px] border border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)] px-4 py-4">
                <p className="font-medium">Review snapshots</p>
                <p className="mt-1 text-[var(--aurum-text-muted)]">
                  Latest portfolio state feeds Home and AI Insights.
                </p>
              </div>
              <div className="rounded-[16px] border border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)] px-4 py-4">
                <p className="font-medium">Maintain accounts</p>
                <p className="mt-1 text-[var(--aurum-text-muted)]">
                  Bank, brokerage, crypto, and manual assets stay available below.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="connections-workspace" className="scroll-mt-24 space-y-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-[var(--aurum-text)]">
              Connections & Institutions
            </h2>
            <Badge variant="neutral">Supporting workflows</Badge>
          </div>
          <p className="text-sm text-[var(--aurum-text-muted)]">
            Keep provider-specific setup, import, and sync flows accessible here without letting
            them define the first impression of Portfolio.
          </p>
        </div>

        <div className="space-y-6 rounded-[24px] border border-[var(--aurum-border)] bg-white p-4 sm:p-5">
          <PlaidSandboxBankSection onSnapshotsChanged={loadAllSnapshots} />
          <SnapTradeBrokerageSection onSnapshotsChanged={loadAllSnapshots} />
          <CoinbaseCryptoSection onSnapshotsChanged={loadAllSnapshots} />
        </div>
      </section>

      <section id="manual-workspace" className="scroll-mt-24 space-y-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-[var(--aurum-text)]">
              Manual Asset Workspace
            </h2>
            <Badge variant="neutral">Fallback asset maintenance</Badge>
          </div>
          <p className="text-sm text-[var(--aurum-text-muted)]">
            Use manual institutions and accounts for assets that should be represented in Aurum even
            when they are not synced from a provider connection.
          </p>
        </div>

        <div className="space-y-6 rounded-[24px] border border-[var(--aurum-border)] bg-white p-4 sm:p-5">
          <div className="rounded-[18px] border border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)] px-4 py-4 text-sm text-[var(--aurum-text)]">
            <p className="font-medium">Manual asset flow</p>
            <p className="mt-1 text-[var(--aurum-text-muted)]">
              Start by creating an institution, then maintain accounts and valuations, and create
              snapshots when manual assets are ready to feed the broader product.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Create Manual Institution</CardTitle>
              <CardDescription>
                Start from common institutions, or add a custom manual institution below.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form
                onSubmit={onCreatePresetInstitution}
                className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto]"
              >
                <select
                  className={inputClassName}
                  value={selectedInstitutionPresetKey}
                  onChange={(event) => setSelectedInstitutionPresetKey(event.target.value)}
                >
                  {manualInstitutionPresets.map((preset) => (
                    <option key={preset.institutionKey} value={preset.institutionKey}>
                      {preset.displayName}
                    </option>
                  ))}
                </select>
                <Button type="submit" disabled={isCreatingPresetInstitution}>
                  {isCreatingPresetInstitution ? 'Creating...' : 'Create Institution'}
                </Button>
              </form>

              <div className="border-t border-[var(--aurum-border)] pt-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--aurum-text-muted)]">
                  Custom manual institution
                </p>
                <form onSubmit={onCreateSource} className="grid grid-cols-1 gap-3 md:grid-cols-4">
                  <input
                    className={inputClassName}
                    placeholder="Institution name"
                    value={sourceForm.displayName}
                    onChange={(event) =>
                      setSourceForm((current) => ({
                        ...current,
                        displayName: event.target.value,
                      }))
                    }
                    required
                  />
                  <input
                    className={inputClassName}
                    placeholder="Issuer / institution"
                    value={sourceForm.institutionName}
                    onChange={(event) =>
                      setSourceForm((current) => ({
                        ...current,
                        institutionName: event.target.value,
                      }))
                    }
                  />
                  <input
                    className={inputClassName}
                    placeholder="Base currency"
                    value={sourceForm.baseCurrency}
                    onChange={(event) =>
                      setSourceForm((current) => ({
                        ...current,
                        baseCurrency: event.target.value.toUpperCase(),
                      }))
                    }
                    maxLength={10}
                  />
                  <Button type="submit" disabled={isSubmittingSource}>
                    {isSubmittingSource ? 'Creating...' : 'Create Custom Institution'}
                  </Button>
                </form>
              </div>

              {statusMessage ? (
                <p className="rounded-[10px] border border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)] px-3 py-2 text-sm text-[var(--aurum-text)]">
                  {statusMessage}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Manual Institutions</CardTitle>
                <CardDescription>
                  {isLoadingSources
                    ? 'Loading institutions...'
                    : `${sources.length} manual institution(s) available.`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {sources.length === 0 ? (
                  <p className="text-sm text-[var(--aurum-text-muted)]">
                    No manual institutions yet.
                  </p>
                ) : (
                  sources.map((source) => (
                    <button
                      key={source.id}
                      type="button"
                      onClick={() => setSelectedSourceId(source.id)}
                      className={`w-full rounded-[12px] border px-3 py-3 text-left text-sm transition ${
                        source.id === selectedSourceId
                          ? 'border-[var(--aurum-accent)] bg-[var(--aurum-accent)]/10'
                          : 'border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)] hover:bg-[var(--aurum-surface)]'
                      }`}
                    >
                      <p className="font-medium text-[var(--aurum-text)]">{source.displayName}</p>
                      <p className="text-xs text-[var(--aurum-text-muted)]">
                        {source.institutionName ?? 'No issuer'} - {source.baseCurrency}
                      </p>
                      <p className="text-xs text-[var(--aurum-text-muted)]">
                        Last synced: {formatDateTime(source.lastSuccessfulSyncAt)}
                      </p>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Manual Holdings</CardTitle>
                  <CardDescription>
                    Create manually maintained asset records that can later contribute to portfolio
                    snapshots.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!selectedSource ? (
                    <p className="text-sm text-[var(--aurum-text-muted)]">
                      Select a manual institution to manage accounts.
                    </p>
                  ) : (
                    <>
                      <form
                        onSubmit={onCreateAccount}
                        className="grid grid-cols-1 gap-3 md:grid-cols-3"
                      >
                        <input
                          className={inputClassName}
                          placeholder="Account display name"
                          value={accountForm.displayName}
                          onChange={(event) =>
                            setAccountForm((current) => ({
                              ...current,
                              displayName: event.target.value,
                            }))
                          }
                          required
                        />
                        <input
                          className={inputClassName}
                          placeholder="Account type"
                          value={accountForm.accountType}
                          onChange={(event) =>
                            setAccountForm((current) => ({
                              ...current,
                              accountType: event.target.value,
                            }))
                          }
                          required
                        />
                        <select
                          className={inputClassName}
                          value={accountForm.assetType}
                          onChange={(event) =>
                            setAccountForm((current) => ({
                              ...current,
                              assetType: event.target.value as PortfolioAssetCategory,
                            }))
                          }
                        >
                          {assetTypeOptions.map((assetType) => (
                            <option key={assetType} value={assetType}>
                              {formatAssetCategory(assetType)}
                            </option>
                          ))}
                        </select>
                        <input
                          className={inputClassName}
                          placeholder="Asset subtype"
                          value={accountForm.assetSubType}
                          onChange={(event) =>
                            setAccountForm((current) => ({
                              ...current,
                              assetSubType: event.target.value,
                            }))
                          }
                        />
                        <input
                          className={inputClassName}
                          placeholder="Institution / issuer"
                          value={accountForm.institutionOrIssuer}
                          onChange={(event) =>
                            setAccountForm((current) => ({
                              ...current,
                              institutionOrIssuer: event.target.value,
                            }))
                          }
                        />
                        <div className="flex gap-3">
                          <input
                            className={inputClassName}
                            placeholder="Currency"
                            value={accountForm.currency}
                            onChange={(event) =>
                              setAccountForm((current) => ({
                                ...current,
                                currency: event.target.value.toUpperCase(),
                              }))
                            }
                            maxLength={10}
                          />
                          <Button type="submit" disabled={isSubmittingAccount}>
                            {isSubmittingAccount ? 'Creating...' : 'Add Holding'}
                          </Button>
                        </div>
                      </form>

                      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                        {accounts.length === 0 ? (
                          <p className="text-sm text-[var(--aurum-text-muted)]">
                            No accounts under this institution yet.
                          </p>
                        ) : (
                          accounts.map((account) => (
                            <button
                              key={account.id}
                              type="button"
                              onClick={() => setSelectedAccountId(account.id)}
                              className={`rounded-[12px] border px-3 py-3 text-left text-sm transition ${
                                account.id === selectedAccountId
                                  ? 'border-[var(--aurum-accent)] bg-[var(--aurum-accent)]/10'
                                  : 'border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)] hover:bg-[var(--aurum-surface)]'
                              }`}
                            >
                              <p className="font-medium text-[var(--aurum-text)]">
                                {account.displayName}
                              </p>
                              <p className="text-xs text-[var(--aurum-text-muted)]">
                                {account.accountType} -{' '}
                                {account.assetType
                                  ? formatAssetCategory(account.assetType)
                                  : 'Unspecified'}{' '}
                                - {account.currency}
                              </p>
                              <p className="text-xs text-[var(--aurum-text-muted)]">
                                {account.institutionOrIssuer ?? 'No issuer'}
                              </p>
                            </button>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Valuation History</CardTitle>
                  <CardDescription>
                    Append valuation history for the selected manual holding so it can later roll
                    into a portfolio snapshot.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!selectedAccount ? (
                    <p className="text-sm text-[var(--aurum-text-muted)]">
                      Select a holding to append valuations.
                    </p>
                  ) : (
                    <>
                      <form
                        onSubmit={onAddValuation}
                        className="grid grid-cols-1 gap-3 md:grid-cols-3"
                      >
                        <input
                          className={inputClassName}
                          type="date"
                          value={valuationForm.valuationDate}
                          onChange={(event) =>
                            setValuationForm((current) => ({
                              ...current,
                              valuationDate: event.target.value,
                            }))
                          }
                          required
                        />
                        <input
                          className={inputClassName}
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Market value"
                          value={valuationForm.marketValue}
                          onChange={(event) =>
                            setValuationForm((current) => ({
                              ...current,
                              marketValue: event.target.value,
                            }))
                          }
                          required
                        />
                        <input
                          className={inputClassName}
                          type="number"
                          min="0"
                          step="0.0001"
                          placeholder="Quantity (optional)"
                          value={valuationForm.quantity}
                          onChange={(event) =>
                            setValuationForm((current) => ({
                              ...current,
                              quantity: event.target.value,
                            }))
                          }
                        />
                        <input
                          className={inputClassName}
                          type="number"
                          min="0"
                          step="0.0001"
                          placeholder="Unit price (optional)"
                          value={valuationForm.unitPrice}
                          onChange={(event) =>
                            setValuationForm((current) => ({
                              ...current,
                              unitPrice: event.target.value,
                            }))
                          }
                        />
                        <input
                          className={inputClassName}
                          placeholder="Symbol (optional)"
                          value={valuationForm.symbol}
                          onChange={(event) =>
                            setValuationForm((current) => ({
                              ...current,
                              symbol: event.target.value.toUpperCase(),
                            }))
                          }
                        />
                        <input
                          className={inputClassName}
                          placeholder="Asset name (optional)"
                          value={valuationForm.assetName}
                          onChange={(event) =>
                            setValuationForm((current) => ({
                              ...current,
                              assetName: event.target.value,
                            }))
                          }
                        />
                        <div className="md:col-span-2">
                          <textarea
                            className={textAreaClassName}
                            placeholder="Notes"
                            value={valuationForm.note}
                            onChange={(event) =>
                              setValuationForm((current) => ({
                                ...current,
                                note: event.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="flex items-start justify-end">
                          <Button type="submit" disabled={isSubmittingValuation}>
                            {isSubmittingValuation ? 'Saving...' : 'Append Valuation'}
                          </Button>
                        </div>
                      </form>

                      <div className="space-y-2">
                        {valuations.length === 0 ? (
                          <p className="text-sm text-[var(--aurum-text-muted)]">
                            No valuations recorded yet.
                          </p>
                        ) : (
                          valuations.map((valuation) => (
                            <div
                              key={valuation.id}
                              className="rounded-[12px] border border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)] px-3 py-3 text-sm"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="font-medium text-[var(--aurum-text)]">
                                  {valuation.assetName ?? selectedAccount.displayName}
                                </p>
                                <p className="text-[var(--aurum-text)]">
                                  {formatMoney(valuation.marketValue, valuation.currency)}
                                </p>
                              </div>
                              <p className="text-xs text-[var(--aurum-text-muted)]">
                                {valuation.valuationDate}
                                {valuation.symbol ? ` - ${valuation.symbol}` : ''}
                                {valuation.quantity !== undefined
                                  ? ` - qty ${valuation.quantity}`
                                  : ''}
                                {valuation.unitPrice !== undefined
                                  ? ` - unit ${valuation.unitPrice}`
                                  : ''}
                              </p>
                              {valuation.note ? (
                                <p className="mt-1 text-xs text-[var(--aurum-text-muted)]">
                                  {valuation.note}
                                </p>
                              ) : null}
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Create Snapshot</CardTitle>
                  <CardDescription>
                    Create a portfolio snapshot from the latest manual valuations when you want
                    manual assets reflected across Home and AI.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-3 md:flex-row">
                    <input
                      className={inputClassName}
                      type="date"
                      value={materializeSnapshotDate}
                      onChange={(event) => setMaterializeSnapshotDate(event.target.value)}
                      placeholder="Optional snapshot date override"
                    />
                    <Button onClick={() => void onMaterializeSnapshot()} disabled={isMaterializing}>
                      {isMaterializing ? 'Creating...' : 'Create Snapshot'}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-[var(--aurum-text)]">
                        Snapshots for Selected Institution
                      </p>
                      {sourceSnapshots.length === 0 ? (
                        <p className="text-sm text-[var(--aurum-text-muted)]">
                          No snapshots created for this institution yet.
                        </p>
                      ) : (
                        [...sourceSnapshots].sort(compareSnapshots).map((snapshot) => (
                          <div
                            key={snapshot.id}
                            className="rounded-[12px] border border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)] px-3 py-3 text-sm"
                          >
                            <p className="font-medium text-[var(--aurum-text)]">
                              {snapshot.metadata.portfolioName ?? 'Untitled Snapshot'}
                            </p>
                            <p className="text-xs text-[var(--aurum-text-muted)]">
                              {snapshot.id} - {snapshot.metadata.snapshotDate}
                            </p>
                            <p className="text-xs text-[var(--aurum-text-muted)]">
                              {snapshot.positions.length} positions -{' '}
                              {formatMoney(
                                snapshot.totalValue,
                                snapshot.metadata.valuationCurrency ?? 'USD',
                              )}
                            </p>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-medium text-[var(--aurum-text)]">
                        Existing Snapshot Inventory
                      </p>
                      {snapshotInventory.length === 0 ? (
                        <p className="text-sm text-[var(--aurum-text-muted)]">
                          No portfolio snapshots found yet.
                        </p>
                      ) : (
                        snapshotInventory.slice(0, 6).map((snapshot) => (
                          <div
                            key={snapshot.id}
                            className="rounded-[12px] border border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)] px-3 py-3 text-sm"
                          >
                            <p className="font-medium text-[var(--aurum-text)]">
                              {snapshot.metadata.portfolioName ?? 'Untitled Snapshot'}
                            </p>
                            <p className="text-xs text-[var(--aurum-text-muted)]">
                              {snapshot.id} - {snapshot.metadata.snapshotDate}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        </div>
      </section>
    </PageContainer>
  );
}
