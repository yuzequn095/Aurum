'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import type {
  ConnectedSource,
  ConnectedSourceAccount,
  ManualStaticValuation,
  PortfolioAssetCategory,
  PortfolioSnapshot,
} from '@aurum/core';
import { PlaidSandboxBankSection } from '@/components/portfolio/PlaidSandboxBankSection';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  createConnectedSource,
  createConnectedSourceAccount,
  createManualStaticValuation,
  listConnectedSourceAccounts,
  listConnectedSourceSnapshots,
  listConnectedSources,
  listManualStaticValuations,
  materializeManualStaticSnapshot,
} from '@/lib/api/connected-finance';
import { listPortfolioSnapshots } from '@/lib/api/portfolio-snapshots';

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
  const [statusMessage, setStatusMessage] = useState('');
  const [isLoadingSources, setIsLoadingSources] = useState(false);
  const [isSubmittingSource, setIsSubmittingSource] = useState(false);
  const [isSubmittingAccount, setIsSubmittingAccount] = useState(false);
  const [isSubmittingValuation, setIsSubmittingValuation] = useState(false);
  const [isMaterializing, setIsMaterializing] = useState(false);
  const [sourceForm, setSourceForm] = useState({
    displayName: '',
    institutionName: '',
    baseCurrency: 'USD',
  });
  const [accountForm, setAccountForm] = useState({
    displayName: '',
    accountType: 'RSU',
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
        error instanceof Error ? error.message : 'Failed to load manual static sources.',
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
        error instanceof Error ? error.message : 'Failed to load source accounts and snapshots.',
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
    void Promise.all([loadSources(), loadAllSnapshots()]);
  }, []);

  useEffect(() => {
    void loadAccountsForSource(selectedSourceId);
  }, [selectedSourceId]);

  useEffect(() => {
    void loadValuationsForAccount(selectedAccountId);
  }, [selectedAccountId]);

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
      await loadSources();
      setSelectedSourceId(created.id);
      setSourceForm({
        displayName: '',
        institutionName: '',
        baseCurrency: sourceForm.baseCurrency.trim() || 'USD',
      });
      setStatusMessage(`Manual static source created: ${created.displayName}`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Failed to create source.');
    } finally {
      setIsSubmittingSource(false);
    }
  };

  const onCreateAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedSourceId) {
      setStatusMessage('Select a manual static source before adding an account.');
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
      await loadAccountsForSource(selectedSourceId);
      setSelectedAccountId(created.id);
      setAccountForm({
        displayName: '',
        accountType: 'RSU',
        currency: selectedSource?.baseCurrency ?? 'USD',
        assetType: 'equity',
        assetSubType: '',
        institutionOrIssuer: '',
      });
      setStatusMessage(`Manual static account created: ${created.displayName}`);
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
      setStatusMessage('Select a manual static source before materializing a snapshot.');
      return;
    }

    setIsMaterializing(true);
    setStatusMessage('');

    try {
      const result = await materializeManualStaticSnapshot(
        selectedSourceId,
        materializeSnapshotDate.trim() || undefined,
      );
      await Promise.all([loadAccountsForSource(selectedSourceId), loadAllSnapshots()]);
      setStatusMessage(
        `Snapshot materialized: ${result.snapshot.id} via sync run ${result.syncRun.id}.`,
      );
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Failed to materialize snapshot.');
    } finally {
      setIsMaterializing(false);
    }
  };

  return (
    <PageContainer className="space-y-6">
      <PlaidSandboxBankSection onSnapshotsChanged={loadAllSnapshots} />

      <Card>
        <CardHeader>
          <CardTitle>Manual Static Accounts</CardTitle>
          <CardDescription>
            Internal admin flow for Milestone 12.2. Create manual static sources, append valuation
            history, and materialize canonical portfolio snapshots.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={onCreateSource} className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <input
              className={inputClassName}
              placeholder="Source name"
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
              {isSubmittingSource ? 'Creating...' : 'Create MANUAL_STATIC Source'}
            </Button>
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
            <CardTitle>Manual Sources</CardTitle>
            <CardDescription>
              {isLoadingSources
                ? 'Loading sources...'
                : `${sources.length} manual static source(s) available.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {sources.length === 0 ? (
              <p className="text-sm text-[var(--aurum-text-muted)]">
                No manual static sources yet.
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
              <CardTitle>Source Accounts</CardTitle>
              <CardDescription>
                One manual source account becomes one portfolio position during v1 materialization.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedSource ? (
                <p className="text-sm text-[var(--aurum-text-muted)]">
                  Select a manual source to manage accounts.
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
                          {assetType}
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
                        {isSubmittingAccount ? 'Creating...' : 'Add Account'}
                      </Button>
                    </div>
                  </form>

                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    {accounts.length === 0 ? (
                      <p className="text-sm text-[var(--aurum-text-muted)]">
                        No accounts under this source yet.
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
                            {account.accountType} - {account.assetType ?? 'unspecified'} -{' '}
                            {account.currency}
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
                Append-only history for the selected manual source account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!selectedAccount ? (
                <p className="text-sm text-[var(--aurum-text-muted)]">
                  Select an account to append valuations.
                </p>
              ) : (
                <>
                  <form onSubmit={onAddValuation} className="grid grid-cols-1 gap-3 md:grid-cols-3">
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
                            {valuation.quantity !== undefined ? ` - qty ${valuation.quantity}` : ''}
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
              <CardTitle>Snapshot Materialization</CardTitle>
              <CardDescription>
                Uses the latest valuation per active account and writes a canonical portfolio
                snapshot.
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
                  {isMaterializing ? 'Materializing...' : 'Materialize Snapshot'}
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-[var(--aurum-text)]">
                    Snapshots for Selected Source
                  </p>
                  {sourceSnapshots.length === 0 ? (
                    <p className="text-sm text-[var(--aurum-text-muted)]">
                      No materialized snapshots for this source yet.
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
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-[var(--aurum-text)]">
                    Existing Snapshot Inventory
                  </p>
                  {allSnapshots.length === 0 ? (
                    <p className="text-sm text-[var(--aurum-text-muted)]">
                      No portfolio snapshots found yet.
                    </p>
                  ) : (
                    allSnapshots.slice(0, 6).map((snapshot) => (
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
    </PageContainer>
  );
}
