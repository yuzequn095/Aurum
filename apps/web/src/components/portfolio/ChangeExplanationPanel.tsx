import type {
  PortfolioChangeDriver,
  PortfolioChangeExplanation,
  PortfolioSnapshot,
} from '@aurum/core';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';

interface ChangeExplanationPanelProps {
  snapshot: PortfolioSnapshot | null;
  explanation: PortfolioChangeExplanation | null;
  isLoading: boolean;
  error?: string;
}

function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
    signDisplay: 'exceptZero',
  }).format(value);
}

function dimensionLabel(driver: PortfolioChangeDriver): string {
  switch (driver.dimension) {
    case 'asset_category':
      return 'Asset class';
    case 'employer_equity':
      return 'Employer equity / RSU';
    case 'data_health':
      return 'Data health';
    default:
      return driver.dimension.charAt(0).toUpperCase() + driver.dimension.slice(1);
  }
}

export function ChangeDriverCard({
  driver,
  currency,
}: {
  driver: PortfolioChangeDriver;
  currency: string;
}) {
  return (
    <div className="min-w-0 rounded-[16px] border border-[var(--aurum-border)] bg-white px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words font-medium text-[var(--aurum-text)]">{driver.label}</p>
          <p className="mt-1 text-xs text-[var(--aurum-text-muted)]">{dimensionLabel(driver)}</p>
        </div>
        {driver.changeType ? (
          <Badge
            variant={
              driver.changeType === 'added' || driver.changeType === 'increased'
                ? 'good'
                : driver.changeType === 'removed' || driver.changeType === 'decreased'
                  ? 'warn'
                  : 'neutral'
            }
          >
            {driver.changeType}
          </Badge>
        ) : null}
      </div>
      <p className="mt-3 break-words text-lg font-semibold text-[var(--aurum-text)]">
        {formatMoney(driver.delta, currency)}
      </p>
      <p className="mt-2 text-xs leading-5 text-[var(--aurum-text-muted)]">{driver.description}</p>
    </div>
  );
}

export function ChangeExplanationPanel({
  snapshot,
  explanation,
  isLoading,
  error,
}: ChangeExplanationPanelProps) {
  const currency = snapshot?.metadata.valuationCurrency ?? 'USD';
  const topDrivers =
    explanation?.drivers
      .filter(
        (driver) =>
          driver.dimension !== 'total' && driver.dimension !== 'cash' && driver.delta !== 0,
      )
      .slice(0, 8) ?? [];

  return (
    <Card id="what-changed" className="scroll-mt-24 overflow-hidden">
      <CardHeader>
        <CardTitle>What Changed</CardTitle>
        <CardDescription>
          Snapshot-to-snapshot change, not realized P&amp;L. Drivers describe observed state deltas
          without inferring a transaction or market cause.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {!snapshot ? (
          <p className="text-[var(--aurum-text-muted)]">
            Create a snapshot to compare portfolio changes.
          </p>
        ) : isLoading ? (
          <p className="text-[var(--aurum-text-muted)]">Building deterministic change drivers...</p>
        ) : error ? (
          <p className="text-[var(--aurum-danger)]">{error}</p>
        ) : !explanation ? (
          <p className="text-[var(--aurum-text-muted)]">
            Change explanation is not available for this snapshot.
          </p>
        ) : explanation.baselineStatus === 'no_baseline' ? (
          <div className="space-y-3">
            <Badge variant="info">No baseline</Badge>
            <p className="leading-6 text-[var(--aurum-text-muted)]">{explanation.summary}</p>
          </div>
        ) : (
          <>
            <p className="leading-6 text-[var(--aurum-text-muted)]">{explanation.summary}</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="min-w-0 rounded-[16px] border border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)] px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-[var(--aurum-text-muted)]">
                  Total change
                </p>
                <p className="mt-1 break-words font-semibold text-[var(--aurum-text)]">
                  {formatMoney(explanation.totalValueDelta, currency)}
                </p>
              </div>
              <div className="min-w-0 rounded-[16px] border border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)] px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-[var(--aurum-text-muted)]">
                  Cash change
                </p>
                <p className="mt-1 break-words font-semibold text-[var(--aurum-text)]">
                  {formatMoney(explanation.cashValueDelta, currency)}
                </p>
              </div>
            </div>

            {topDrivers.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {topDrivers.map((driver) => (
                  <ChangeDriverCard key={driver.id} driver={driver} currency={currency} />
                ))}
              </div>
            ) : (
              <p className="text-[var(--aurum-text-muted)]">
                No material account, holding, institution, or asset-class drivers were found.
              </p>
            )}

            <div className="rounded-[16px] border border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)] px-4 py-4">
              <p className="font-medium text-[var(--aurum-text)]">Data limitations</p>
              <ul className="mt-2 space-y-1 text-xs leading-5 text-[var(--aurum-text-muted)]">
                {explanation.dataLimitations.map((limitation) => (
                  <li key={limitation}>• {limitation}</li>
                ))}
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
