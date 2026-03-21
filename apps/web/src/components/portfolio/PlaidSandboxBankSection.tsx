'use client';

import {
  parseProviderNotConfiguredDetails,
  type ConnectedSource,
  type ConnectedSourceAccount,
  type PortfolioSnapshot,
} from '@aurum/core';
import type { PlaidLinkOnSuccessMetadata } from 'react-plaid-link';
import { useEffect, useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { ApiError } from '@/lib/api';
import {
  createPlaidLinkToken,
  exchangePlaidPublicToken,
  listConnectedSourceAccounts,
  listConnectedSourceSnapshots,
  listConnectedSources,
  syncConnectedBankSource,
} from '@/lib/api/connected-finance';

const inputClassName =
  'h-10 w-full rounded-[var(--aurum-radius-md)] border border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)] px-3 text-sm text-[var(--aurum-text)] outline-none transition focus:border-[var(--aurum-accent)]';

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

function mapPlaidMetadata(metadata: PlaidLinkOnSuccessMetadata) {
  return {
    institution: metadata.institution
      ? {
          institutionId: metadata.institution.institution_id ?? undefined,
          institutionName: metadata.institution.name ?? undefined,
        }
      : undefined,
    accounts: metadata.accounts.map((account) => ({
      id: account.id,
      name: account.name ?? undefined,
      mask: account.mask ?? undefined,
      subtype: account.subtype ?? undefined,
      type: account.type ?? undefined,
    })),
    linkSessionId: metadata.link_session_id ?? undefined,
  };
}

type PlaidSandboxBankSectionProps = {
  onSnapshotsChanged?: () => Promise<void> | void;
};

export function PlaidSandboxBankSection({ onSnapshotsChanged }: PlaidSandboxBankSectionProps) {
  const [sources, setSources] = useState<ConnectedSource[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<ConnectedSourceAccount[]>([]);
  const [sourceSnapshots, setSourceSnapshots] = useState<PortfolioSnapshot[]>([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [providerNotice, setProviderNotice] = useState<{
    title: string;
    body: string;
  } | null>(null);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [pendingOpen, setPendingOpen] = useState(false);
  const [isLoadingSources, setIsLoadingSources] = useState(false);
  const [isPreparingLink, setIsPreparingLink] = useState(false);
  const [isExchanging, setIsExchanging] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const selectedSource = sources.find((source) => source.id === selectedSourceId);

  const loadSources = async () => {
    setIsLoadingSources(true);

    try {
      const nextSources = await listConnectedSources('BANK');
      setSources(nextSources);
      setSelectedSourceId((current) => {
        const hasCurrent = current ? nextSources.some((source) => source.id === current) : false;
        return hasCurrent ? current : (nextSources[0]?.id ?? null);
      });
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Failed to load bank sources.');
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
        error instanceof Error ? error.message : 'Failed to load bank source details.',
      );
    }
  };

  useEffect(() => {
    void loadSources();
  }, []);

  useEffect(() => {
    void loadSourceDetails(selectedSourceId);
  }, [selectedSourceId]);

  const onPlaidSuccess = async (publicToken: string, metadata: PlaidLinkOnSuccessMetadata) => {
    setIsExchanging(true);
    setStatusMessage('');
    setProviderNotice(null);

    try {
      const result = await exchangePlaidPublicToken({
        publicToken,
        metadata: mapPlaidMetadata(metadata),
      });
      await loadSources();
      setSelectedSourceId(result.source.id);
      setStatusMessage(
        `Bank source connected: ${result.source.displayName} with ${result.accounts.length} account(s).`,
      );
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Failed to exchange Plaid token.');
    } finally {
      setIsExchanging(false);
      setPendingOpen(false);
      setLinkToken(null);
    }
  };

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: (publicToken, metadata) => {
      void onPlaidSuccess(publicToken, metadata);
    },
  });

  useEffect(() => {
    if (pendingOpen && linkToken && ready) {
      open();
    }
  }, [linkToken, open, pendingOpen, ready]);

  const onPreparePlaidLink = async () => {
    setIsPreparingLink(true);
    setStatusMessage('');
    setProviderNotice(null);

    try {
      const result = await createPlaidLinkToken();
      setLinkToken(result.linkToken);
      setPendingOpen(true);
    } catch (error) {
      setPendingOpen(false);
      const notice =
        error instanceof ApiError
          ? parseProviderNotConfiguredDetails(error.details)
          : null;
      if (notice) {
        setProviderNotice(notice);
        return;
      }
      setStatusMessage(
        error instanceof Error ? error.message : 'Failed to create Plaid link token.',
      );
    } finally {
      setIsPreparingLink(false);
    }
  };

  const onSyncSelectedSource = async () => {
    if (!selectedSourceId) {
      setStatusMessage('Select a bank source before running sync.');
      return;
    }

    setIsSyncing(true);
    setStatusMessage('');
    setProviderNotice(null);

    try {
      const result = await syncConnectedBankSource(selectedSourceId);
      await Promise.all([
        loadSourceDetails(selectedSourceId),
        loadSources(),
        onSnapshotsChanged?.(),
      ]);
      setStatusMessage(
        `Bank snapshot materialized: ${result.snapshot.id} via sync run ${result.syncRun.id}.`,
      );
    } catch (error) {
      const notice =
        error instanceof ApiError
          ? parseProviderNotConfiguredDetails(error.details)
          : null;
      if (notice) {
        setProviderNotice(notice);
        return;
      }
      setStatusMessage(error instanceof Error ? error.message : 'Failed to sync bank source.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <section className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Plaid Sandbox Bank Ingestion</CardTitle>
          <CardDescription>
            Internal validation flow for Milestone 12.3. Connect a Plaid Sandbox bank, inspect
            linked accounts, and materialize a connected snapshot from current balances.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <Button
              onClick={() => void onPreparePlaidLink()}
              disabled={isPreparingLink || isExchanging || Boolean(providerNotice)}
            >
              {isPreparingLink
                ? 'Preparing Link...'
                : isExchanging
                  ? 'Connecting...'
                  : 'Connect Bank (Plaid Sandbox)'}
            </Button>
            <input
              className={inputClassName}
              value={selectedSource?.displayName ?? ''}
              readOnly
              placeholder="Connected source will appear here"
            />
          </div>

          {statusMessage ? (
            <p className="rounded-[10px] border border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)] px-3 py-2 text-sm text-[var(--aurum-text)]">
              {statusMessage}
            </p>
          ) : null}

          {providerNotice ? (
            <div className="rounded-[10px] border border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)] px-3 py-3 text-sm">
              <p className="font-medium text-[var(--aurum-text)]">{providerNotice.title}</p>
              <p className="mt-1 text-[var(--aurum-text-muted)]">{providerNotice.body}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Bank Sources</CardTitle>
            <CardDescription>
              {isLoadingSources ? 'Loading sources...' : `${sources.length} bank source(s) found.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {sources.length === 0 ? (
              <p className="text-sm text-[var(--aurum-text-muted)]">
                No bank sources connected yet.
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
                    {source.institutionName ?? 'Unknown institution'} - {source.status}
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
              <CardTitle>Linked Bank Accounts</CardTitle>
              <CardDescription>
                Plaid-backed accounts are synced into connected source accounts and mapped
                one-to-one into snapshot positions for v1.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedSource ? (
                <p className="text-sm text-[var(--aurum-text-muted)]">
                  Select a bank source to inspect linked accounts.
                </p>
              ) : (
                <>
                  <div className="flex justify-end">
                    <Button onClick={() => void onSyncSelectedSource()} disabled={isSyncing}>
                      {isSyncing ? 'Syncing...' : 'Run Balance Sync'}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    {accounts.length === 0 ? (
                      <p className="text-sm text-[var(--aurum-text-muted)]">
                        No bank accounts have been fetched for this source yet.
                      </p>
                    ) : (
                      accounts.map((account) => {
                        const currentBalance =
                          typeof account.metadata?.availableBalance === 'number'
                            ? account.metadata.availableBalance
                            : typeof account.metadata?.currentBalance === 'number'
                              ? account.metadata.currentBalance
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
                              {account.assetSubType ? ` - ${account.assetSubType}` : ''}
                              {account.maskLast4 ? ` - **** ${account.maskLast4}` : ''}
                            </p>
                            <p className="text-xs text-[var(--aurum-text-muted)]">
                              {account.institutionOrIssuer ??
                                selectedSource.institutionName ??
                                'Plaid'}
                            </p>
                            <p className="mt-2 text-sm text-[var(--aurum-text)]">
                              {currentBalance !== undefined
                                ? formatMoney(currentBalance, account.currency)
                                : 'Balance pending sync'}
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
                Balance syncs write canonical portfolio snapshots with source + sync lineage.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {sourceSnapshots.length === 0 ? (
                <p className="text-sm text-[var(--aurum-text-muted)]">
                  No snapshots have been materialized for this bank source yet.
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
