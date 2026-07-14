import type { PortfolioHistorySeries, PortfolioSnapshot } from '@aurum/core';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';

interface PortfolioHistorySectionProps {
  snapshot: PortfolioSnapshot | null;
  history: PortfolioHistorySeries | null;
  isLoading: boolean;
  error?: string;
}

function formatMoney(value: number | undefined, currency: string): string {
  if (value === undefined) return 'Not available';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number | undefined): string {
  if (value === undefined) return 'No baseline';
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    maximumFractionDigits: 1,
    signDisplay: 'always',
  }).format(value);
}

function scopeLabel(history: PortfolioHistorySeries): string {
  switch (history.scope) {
    case 'consolidated':
      return 'Consolidated portfolio';
    case 'source':
      return history.sourceLabel ?? 'Institution source';
    case 'account':
      return history.sourceAccountLabel ?? 'Account';
    case 'asset_category':
      return `${history.assetCategory ?? 'Asset'} allocation`;
  }
}

export function PortfolioHistorySection({
  snapshot,
  history,
  isLoading,
  error,
}: PortfolioHistorySectionProps) {
  const currency = history?.valuationCurrency ?? snapshot?.metadata.valuationCurrency ?? 'USD';

  return (
    <Card id="portfolio-history" className="scroll-mt-24 overflow-hidden">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <CardTitle>Portfolio History</CardTitle>
            <CardDescription>
              A reusable value timeline kept within one snapshot scope.
            </CardDescription>
          </div>
          {history ? <Badge variant="info">{scopeLabel(history)}</Badge> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!snapshot ? (
          <p className="text-sm text-[var(--aurum-text-muted)]">
            Create or sync a portfolio snapshot to start history.
          </p>
        ) : isLoading ? (
          <p className="text-sm text-[var(--aurum-text-muted)]">Loading portfolio history...</p>
        ) : error ? (
          <p className="text-sm text-[var(--aurum-danger)]">{error}</p>
        ) : !history || history.points.length === 0 ? (
          <p className="text-sm text-[var(--aurum-text-muted)]">
            No history points are available in this snapshot scope yet.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="min-w-0 rounded-[16px] border border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)] px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-[var(--aurum-text-muted)]">
                  Latest scoped value
                </p>
                <p className="mt-1 break-words font-semibold text-[var(--aurum-text)]">
                  {formatMoney(history.summary.latestValue, currency)}
                </p>
              </div>
              <div className="min-w-0 rounded-[16px] border border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)] px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-[var(--aurum-text-muted)]">
                  Latest change
                </p>
                <p className="mt-1 break-words font-semibold text-[var(--aurum-text)]">
                  {history.summary.deltaFromPrevious === undefined
                    ? 'No baseline'
                    : formatMoney(history.summary.deltaFromPrevious, currency)}
                </p>
                <p className="mt-1 text-xs text-[var(--aurum-text-muted)]">
                  {formatPercent(history.summary.percentDeltaFromPrevious)}
                </p>
              </div>
              <div className="min-w-0 rounded-[16px] border border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)] px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-[var(--aurum-text-muted)]">
                  History coverage
                </p>
                <p className="mt-1 font-semibold text-[var(--aurum-text)]">
                  {history.summary.pointCount} snapshot
                  {history.summary.pointCount === 1 ? '' : 's'}
                </p>
                <p className="mt-1 text-xs text-[var(--aurum-text-muted)]">
                  {history.summary.oldestSnapshotDate ?? 'Not available'} to{' '}
                  {history.summary.latestSnapshotDate ?? 'Not available'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {history.points.slice(0, 6).map((point, index) => (
                <div
                  key={point.snapshotId}
                  className="min-w-0 rounded-[16px] border border-[var(--aurum-border)] bg-white px-4 py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-[var(--aurum-text-muted)]">{point.snapshotDate}</p>
                      <p className="mt-1 break-words font-medium text-[var(--aurum-text)]">
                        {formatMoney(point.value, currency)}
                      </p>
                    </div>
                    {index === 0 ? <Badge variant="good">Latest</Badge> : null}
                  </div>
                  <p className="mt-2 text-xs text-[var(--aurum-text-muted)]">
                    {point.deltaFromPrevious === undefined
                      ? 'First point in this history scope'
                      : `${formatMoney(point.deltaFromPrevious, currency)} from prior snapshot`}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
