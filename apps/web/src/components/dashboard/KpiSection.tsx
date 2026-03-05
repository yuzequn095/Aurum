import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { DashboardDeltaMap } from '@/lib/api/analytics';
import { formatMoney, formatPercent } from '@/lib/format';

type KpiSectionProps = {
  loading: boolean;
  incomeCents: number;
  expenseCents: number;
  netCents: number;
  prevIncomeCents?: number;
  prevExpenseCents?: number;
  prevNetCents?: number;
  delta: DashboardDeltaMap;
};

function getTone(value: number | null | undefined): 'good' | 'error' | 'neutral' {
  if (value == null || Number.isNaN(value) || value === 0) return 'neutral';
  return value > 0 ? 'good' : 'error';
}

function getDeltaLabel(
  deltaPercent: number | null | undefined,
  currentCents: number,
  previousCents: number | null | undefined,
): string {
  if ((previousCents ?? null) === 0 && currentCents > 0) {
    return 'New this month';
  }
  const formatted = formatPercent(deltaPercent);
  return `${formatted} vs last month`;
}

function toneBadgeVariant(
  tone: 'good' | 'error' | 'neutral',
): 'good' | 'error' | 'neutral' {
  return tone;
}

export function KpiSection({
  loading,
  incomeCents,
  expenseCents,
  netCents,
  prevIncomeCents,
  prevExpenseCents,
  prevNetCents,
  delta,
}: KpiSectionProps) {
  const heroMessage =
    netCents > 0
      ? 'Strong inflow momentum this month.'
      : netCents < 0
        ? 'Spending exceeded income this month.'
        : 'Balanced month.';

  return (
    <section className='space-y-6'>
      <Card className='relative overflow-hidden border-0'>
        <div className='absolute inset-0 bg-gradient-to-r from-aurum-primarySoft/70 via-white to-white' />
        <CardContent className='relative py-14'>
          <div className='flex flex-col gap-6 md:flex-row md:items-end md:justify-between'>
            <div className='space-y-2'>
              <p className='text-sm font-medium text-aurum-muted'>Monthly Net Cashflow</p>
              {loading ? (
                <div className='h-14 w-64 animate-pulse rounded-[12px] bg-aurum-primarySoft/60' />
              ) : (
                <p
                  className={`text-[52px] leading-tight font-semibold ${
                    netCents > 0
                      ? 'text-aurum-success'
                      : netCents < 0
                        ? 'text-aurum-danger/80'
                        : 'text-aurum-muted'
                  }`}
                >
                  {formatMoney(netCents)}
                </p>
              )}
              <Badge
                variant={toneBadgeVariant(getTone(delta.net))}
                className='mt-1 rounded-full px-3 py-1 text-xs'
              >
                {loading ? 'Loading...' : getDeltaLabel(delta.net, netCents, prevNetCents)}
              </Badge>
            </div>
            <p className='max-w-xs text-sm text-aurum-muted'>{heroMessage}</p>
          </div>
        </CardContent>
      </Card>

      <div className='grid grid-cols-1 gap-6 md:grid-cols-3'>
        {loading ? (
          <>
            <Card>
              <CardContent className='pt-6'>
                <div className='space-y-3'>
                  <div className='h-4 w-24 animate-pulse rounded bg-aurum-primarySoft/50' />
                  <div className='h-9 w-40 animate-pulse rounded bg-aurum-primarySoft/50' />
                  <div className='h-4 w-28 animate-pulse rounded bg-aurum-primarySoft/50' />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className='pt-6'>
                <div className='space-y-3'>
                  <div className='h-4 w-24 animate-pulse rounded bg-aurum-primarySoft/50' />
                  <div className='h-9 w-40 animate-pulse rounded bg-aurum-primarySoft/50' />
                  <div className='h-4 w-28 animate-pulse rounded bg-aurum-primarySoft/50' />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className='pt-6'>
                <div className='space-y-3'>
                  <div className='h-4 w-24 animate-pulse rounded bg-aurum-primarySoft/50' />
                  <div className='h-9 w-40 animate-pulse rounded bg-aurum-primarySoft/50' />
                  <div className='h-4 w-28 animate-pulse rounded bg-aurum-primarySoft/50' />
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className='text-base'>Income</CardTitle>
                <CardDescription>Incoming cash</CardDescription>
              </CardHeader>
              <CardContent className='space-y-3'>
                <p className='text-3xl font-semibold text-aurum-text'>{formatMoney(incomeCents)}</p>
                <Badge variant={toneBadgeVariant(getTone(delta.income))}>
                  {getDeltaLabel(delta.income, incomeCents, prevIncomeCents)}
                </Badge>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className='text-base'>Expense</CardTitle>
                <CardDescription>Outgoing cash</CardDescription>
              </CardHeader>
              <CardContent className='space-y-3'>
                <p className='text-3xl font-semibold text-aurum-text'>{formatMoney(expenseCents)}</p>
                <Badge variant={toneBadgeVariant(getTone(delta.expense))}>
                  {getDeltaLabel(delta.expense, expenseCents, prevExpenseCents)}
                </Badge>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className='text-base'>Net</CardTitle>
                <CardDescription>Income minus expense</CardDescription>
              </CardHeader>
              <CardContent className='space-y-3'>
                <p className='text-3xl font-semibold text-aurum-text'>{formatMoney(netCents)}</p>
                <Badge variant={toneBadgeVariant(getTone(delta.net))}>
                  {getDeltaLabel(delta.net, netCents, prevNetCents)}
                </Badge>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </section>
  );
}
