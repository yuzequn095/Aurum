'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import type { ConnectedSource, ConnectedSourceAccount, PortfolioSnapshot } from '@aurum/core';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  connectCoinbaseCrypto,
  listConnectedSourceAccounts,
  listConnectedSourceSnapshots,
  listConnectedSources,
  syncConnectedCryptoSource,
} from '@/lib/api/connected-finance';

const inputClassName =
  'h-10 w-full rounded-[var(--aurum-radius-md)] border border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)] px-3 text-sm text-[var(--aurum-text)] outline-none transition focus:border-[var(--aurum-accent)]';

const textAreaClassName =
  'min-h-[120px] w-full rounded-[var(--aurum-radius-md)] border border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)] px-3 py-2 text-sm text-[var(--aurum-text)] outline-none transition focus:border-[var(--aurum-accent)]';

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

type CoinbaseCryptoSectionProps = {
  onSnapshotsChanged?: () => Promise<void> | void;
};

export function CoinbaseCryptoSection({ onSnapshotsChanged }: CoinbaseCryptoSectionProps) {
  const [sources, setSources] = useState<ConnectedSource[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<ConnectedSourceAccount[]>([]);
  const [sourceSnapshots, setSourceSnapshots] = useState<PortfolioSnapshot[]>([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [isLoadingSources, setIsLoadingSources] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [formState, setFormState] = useState({
    displayName: 'Coinbase Crypto',
    apiKeyName: '',
    apiPrivateKey: '',
    baseCurrency: 'USD',
  });

  const selectedSource = sources.find((source) => source.id === selectedSourceId);

  const loadSources = async () => {
    setIsLoadingSources(true);

    try {
      const nextSources = await listConnectedSources('CRYPTO');
      setSources(nextSources);
      setSelectedSourceId((current) => {
        const hasCurrent = current ? nextSources.some((source) => source.id === current) : false;
        return hasCurrent ? current : (nextSources[0]?.id ?? null);
      });
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Failed to load crypto sources.');
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
        error instanceof Error ? error.message : 'Failed to load crypto source details.',
      );
    }
  };

  useEffect(() => {
    void loadSources();
  }, []);

  useEffect(() => {
    void loadSourceDetails(selectedSourceId);
  }, [selectedSourceId]);

  const onConnect = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsConnecting(true);
    setStatusMessage('');

    try {
      const result = await connectCoinbaseCrypto({
        displayName: formState.displayName.trim() || undefined,
        apiKeyName: formState.apiKeyName.trim(),
        apiPrivateKey: formState.apiPrivateKey,
        baseCurrency: formState.baseCurrency.trim() || undefined,
      });
      await loadSources();
      setSelectedSourceId(result.source.id);
      setFormState((current) => ({
        ...current,
        apiKeyName: '',
        apiPrivateKey: '',
      }));
      setStatusMessage(
        `Crypto source connected: ${result.source.displayName} with ${result.accounts.length} account(s).`,
      );
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Failed to connect Coinbase.');
    } finally {
      setIsConnecting(false);
    }
  };

  const onSyncSelectedSource = async () => {
    if (!selectedSourceId) {
      setStatusMessage('Select a crypto source before running sync.');
      return;
    }

    setIsSyncing(true);
    setStatusMessage('');

    try {
      const result = await syncConnectedCryptoSource(selectedSourceId);
      await Promise.all([
        loadSourceDetails(selectedSourceId),
        loadSources(),
        onSnapshotsChanged?.(),
      ]);
      setStatusMessage(
        `Crypto snapshot materialized: ${result.snapshot.id} via sync run ${result.syncRun.id}.`,
      );
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Failed to sync crypto source.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <section className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Coinbase Crypto Foundation</CardTitle>
          <CardDescription>
            Internal validation flow for Milestone 12.5A. Self-connect a read-only Coinbase API key,
            inspect imported balances, and materialize a connected portfolio snapshot.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={onConnect} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <input
                className={inputClassName}
                placeholder="Source name"
                value={formState.displayName}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    displayName: event.target.value,
                  }))
                }
              />
              <input
                className={inputClassName}
                placeholder="Coinbase API key name"
                value={formState.apiKeyName}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    apiKeyName: event.target.value,
                  }))
                }
                required
              />
              <input
                className={inputClassName}
                placeholder="Valuation currency"
                value={formState.baseCurrency}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    baseCurrency: event.target.value.toUpperCase(),
                  }))
                }
                maxLength={10}
              />
            </div>
            <textarea
              className={textAreaClassName}
              placeholder="Coinbase EC private key"
              value={formState.apiPrivateKey}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  apiPrivateKey: event.target.value,
                }))
              }
              required
            />
            <div className="flex justify-end">
              <Button type="submit" disabled={isConnecting}>
                {isConnecting ? 'Connecting...' : 'Connect Crypto (Coinbase)'}
              </Button>
            </div>
          </form>

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
            <CardTitle>Crypto Sources</CardTitle>
            <CardDescription>
              {isLoadingSources
                ? 'Loading sources...'
                : `${sources.length} crypto source(s) found.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {sources.length === 0 ? (
              <p className="text-sm text-[var(--aurum-text-muted)]">
                No crypto sources connected yet.
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
                    {source.institutionName ?? 'Coinbase'} - {source.baseCurrency}
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
              <CardTitle>Imported Coinbase Accounts</CardTitle>
              <CardDescription>
                Each Coinbase account or balance bucket maps into one connected source account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedSource ? (
                <p className="text-sm text-[var(--aurum-text-muted)]">
                  Select a crypto source to inspect imported accounts.
                </p>
              ) : (
                <>
                  <div className="flex justify-end">
                    <Button onClick={() => void onSyncSelectedSource()} disabled={isSyncing}>
                      {isSyncing ? 'Syncing...' : 'Run Crypto Sync'}
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    {accounts.length === 0 ? (
                      <p className="text-sm text-[var(--aurum-text-muted)]">
                        No Coinbase accounts are imported for this source yet.
                      </p>
                    ) : (
                      accounts.map((account) => (
                        <div
                          key={account.id}
                          className="rounded-[12px] border border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)] px-3 py-3 text-sm"
                        >
                          <p className="font-medium text-[var(--aurum-text)]">
                            {account.displayName}
                          </p>
                          <p className="text-xs text-[var(--aurum-text-muted)]">
                            {account.accountType} - {account.currency}
                          </p>
                          <p className="text-xs text-[var(--aurum-text-muted)]">
                            {account.assetType ?? 'unspecified'} -{' '}
                            {account.institutionOrIssuer ?? 'Coinbase'}
                          </p>
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
              <CardTitle>Materialized Snapshots</CardTitle>
              <CardDescription>
                Coinbase balance syncs write canonical portfolio snapshots with source and sync
                lineage.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {sourceSnapshots.length === 0 ? (
                <p className="text-sm text-[var(--aurum-text-muted)]">
                  No snapshots have been materialized for this crypto source yet.
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
