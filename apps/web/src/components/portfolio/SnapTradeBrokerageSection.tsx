'use client';

import { useEffect, useState } from 'react';
import type { ConnectedSource, ConnectedSourceAccount, PortfolioSnapshot } from '@aurum/core';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  createSnapTradeConnectionPortalUrl,
  importSnapTradeAccounts,
  listConnectedSourceAccounts,
  listConnectedSourceSnapshots,
  listConnectedSources,
  syncConnectedBrokerageSource,
} from '@/lib/api/connected-finance';

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

type SnapTradeBrokerageSectionProps = {
  onSnapshotsChanged?: () => Promise<void> | void;
};

export function SnapTradeBrokerageSection({
  onSnapshotsChanged,
}: SnapTradeBrokerageSectionProps) {
  const [sources, setSources] = useState<ConnectedSource[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<ConnectedSourceAccount[]>([]);
  const [sourceSnapshots, setSourceSnapshots] = useState<PortfolioSnapshot[]>([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [isLoadingSources, setIsLoadingSources] = useState(false);
  const [isCreatingPortal, setIsCreatingPortal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const selectedSource = sources.find((source) => source.id === selectedSourceId);

  const loadSources = async () => {
    setIsLoadingSources(true);

    try {
      const nextSources = await listConnectedSources('BROKERAGE');
      setSources(nextSources);
      setSelectedSourceId((current) => {
        const hasCurrent = current ? nextSources.some((source) => source.id === current) : false;
        return hasCurrent ? current : (nextSources[0]?.id ?? null);
      });
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : 'Failed to load brokerage sources.',
      );
    } finally {
      setIsLoadingSources(false);
    }
  };

  const loadSourceDetails = async (sourceId: string | null) => {
    if (!sourceId) {
      setAccounts([]);
      setSourceSnapshots([]);
      return;
    }

    try {
      const [nextAccounts, nextSnapshots] = await Promise.all([
        listConnectedSourceAccounts(sourceId),
        listConnectedSourceSnapshots(sourceId),
      ]);
      setAccounts(nextAccounts);
      setSourceSnapshots(nextSnapshots);
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : 'Failed to load brokerage source details.',
      );
    }
  };

  useEffect(() => {
    void loadSources();
  }, []);

  useEffect(() => {
    void loadSourceDetails(selectedSourceId);
  }, [selectedSourceId]);

  const onCreateConnectionPortal = async () => {
    setIsCreatingPortal(true);
    setStatusMessage('');

    try {
      const result = await createSnapTradeConnectionPortalUrl();
      window.open(result.connectionPortalUrl, '_blank', 'noopener,noreferrer');
      setStatusMessage(
        `SnapTrade portal opened for provider user ${result.providerUserId}. Complete the connection, then click Import Accounts.`,
      );
    } catch (error) {
      setStatusMessage(
        error instanceof Error
          ? error.message
          : 'Failed to create SnapTrade connection portal URL.',
      );
    } finally {
      setIsCreatingPortal(false);
    }
  };

  const onImportAccounts = async () => {
    setIsImporting(true);
    setStatusMessage('');

    try {
      const result = await importSnapTradeAccounts();
      await loadSources();
      const firstSourceId = result.sources[0]?.source.id ?? null;
      setSelectedSourceId(firstSourceId);
      setStatusMessage(
        `Imported ${result.sources.length} brokerage source(s) for provider user ${result.providerUserId}.`,
      );
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : 'Failed to import SnapTrade accounts.',
      );
    } finally {
      setIsImporting(false);
    }
  };

  const onSyncSelectedSource = async () => {
    if (!selectedSourceId) {
      setStatusMessage('Select a brokerage source before running sync.');
      return;
    }

    setIsSyncing(true);
    setStatusMessage('');

    try {
      const result = await syncConnectedBrokerageSource(selectedSourceId);
      await Promise.all([
        loadSourceDetails(selectedSourceId),
        loadSources(),
        onSnapshotsChanged?.(),
      ]);
      setStatusMessage(
        `Brokerage snapshot materialized: ${result.snapshot.id} via sync run ${result.syncRun.id}.`,
      );
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : 'Failed to sync brokerage source.',
      );
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <section className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>SnapTrade Brokerage Ingestion</CardTitle>
          <CardDescription>
            Internal validation flow for Milestone 12.4A. Open the SnapTrade Connection Portal,
            import brokerage accounts, and materialize a connected snapshot from holdings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <Button onClick={() => void onCreateConnectionPortal()} disabled={isCreatingPortal}>
              {isCreatingPortal ? 'Opening Portal...' : 'Connect Brokerage (SnapTrade)'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => void onImportAccounts()}
              disabled={isImporting}
            >
              {isImporting ? 'Importing...' : 'Import Accounts'}
            </Button>
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
            <CardTitle>Brokerage Sources</CardTitle>
            <CardDescription>
              {isLoadingSources
                ? 'Loading sources...'
                : `${sources.length} brokerage source(s) found.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {sources.length === 0 ? (
              <p className="text-sm text-[var(--aurum-text-muted)]">
                No brokerage sources connected yet.
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
                    {source.institutionName ?? 'Unknown brokerage'} - {source.status}
                  </p>
                  <p className="text-xs text-[var(--aurum-text-muted)]">
                    Last sync: {formatDateTime(source.lastSuccessfulSyncAt)}
                  </p>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Brokerage Accounts</CardTitle>
              <CardDescription>
                One SnapTrade connection maps to one brokerage source, and one brokerage account
                maps to one connected source account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedSource ? (
                <p className="text-sm text-[var(--aurum-text-muted)]">
                  Select a brokerage source to inspect imported accounts.
                </p>
              ) : (
                <>
                  <div className="flex justify-end">
                    <Button onClick={() => void onSyncSelectedSource()} disabled={isSyncing}>
                      {isSyncing ? 'Syncing...' : 'Run Holdings Sync'}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    {accounts.length === 0 ? (
                      <p className="text-sm text-[var(--aurum-text-muted)]">
                        No brokerage accounts imported for this source yet.
                      </p>
                    ) : (
                      accounts.map((account) => {
                        const balanceTotal =
                          typeof account.metadata?.balanceTotalAmount === 'number'
                            ? account.metadata.balanceTotalAmount
                            : undefined;

                        return (
                          <div
                            key={account.id}
                            className="rounded-[12px] border border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)] px-3 py-3 text-sm"
                          >
                            <p className="font-medium text-[var(--aurum-text)]">
                              {account.officialName ?? account.displayName}
                            </p>
                            <p className="text-xs text-[var(--aurum-text-muted)]">
                              {account.accountType}
                              {account.maskLast4 ? ` - **** ${account.maskLast4}` : ''}
                            </p>
                            <p className="text-xs text-[var(--aurum-text-muted)]">
                              {account.institutionOrIssuer ?? selectedSource.institutionName ?? 'SnapTrade'}
                            </p>
                            <p className="mt-2 text-sm text-[var(--aurum-text)]">
                              {balanceTotal !== undefined
                                ? formatMoney(balanceTotal, account.currency)
                                : 'Value will be finalized on sync'}
                            </p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Materialized Snapshots</CardTitle>
              <CardDescription>
                Holdings syncs write canonical portfolio snapshots with source and sync lineage.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {sourceSnapshots.length === 0 ? (
                <p className="text-sm text-[var(--aurum-text-muted)]">
                  No snapshots have been materialized for this brokerage source yet.
                </p>
              ) : (
                sourceSnapshots.map((snapshot) => (
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
            </CardContent>
          </Card>
        </div>
      </section>
    </section>
  );
}
