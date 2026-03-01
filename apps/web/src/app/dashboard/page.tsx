'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Container, Section } from '@/components/ui/layout';
import { fetchMonthlySummary } from '@/lib/api';
import { KpiCard } from './components/kpi-card';

type DeltaMap = {
  income?: number | null;
  expense?: number | null;
  net?: number | null;
};

type MonthlySummaryResponse = {
  totals: {
    incomeCents: number;
    expenseCents: number;
    netCents: number;
  };
  previousMonth?: {
    totals?: {
      incomeCents: number;
      expenseCents: number;
      netCents: number;
    };
  };
  deltaPercent?: DeltaMap;
  delta?: DeltaMap;
};

function formatCents(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

function formatPct(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

function toneFromPct(value: number | null | undefined): 'positive' | 'negative' | 'neutral' {
  if (value == null || Number.isNaN(value) || value === 0) return 'neutral';
  return value > 0 ? 'positive' : 'negative';
}

function getDeltaLabel(
  deltaPercent: number | null | undefined,
  currentCents: number,
  previousCents: number | null | undefined,
) {
  if ((previousCents ?? null) === 0 && currentCents > 0) {
    return 'New this month';
  }
  if (deltaPercent == null || Number.isNaN(deltaPercent)) {
    return '— vs last month';
  }
  return `${formatPct(deltaPercent)} vs last month`;
}

const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export default function DashboardPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [summary, setSummary] = useState<MonthlySummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const yearOptions = useMemo(() => [year, year - 1, year - 2], [year]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = (await fetchMonthlySummary(year, month)) as MonthlySummaryResponse;
        if (!cancelled) setSummary(data);
      } catch (e) {
        if (!cancelled) {
          setSummary(null);
          setError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [year, month]);

  const delta = summary?.deltaPercent ?? summary?.delta ?? {};
  const incomeCents = summary?.totals.incomeCents ?? 0;
  const expenseCents = summary?.totals.expenseCents ?? 0;
  const netCents = summary?.totals.netCents ?? 0;
  const prevIncomeCents = summary?.previousMonth?.totals?.incomeCents;
  const prevExpenseCents = summary?.previousMonth?.totals?.expenseCents;
  const prevNetCents = summary?.previousMonth?.totals?.netCents;

  return (
    <Container className='py-8 space-y-10'>
      <header className='space-y-2'>
        <h1 className='text-3xl font-semibold tracking-tight text-aurum-text'>Dashboard</h1>
        <p className='text-sm text-aurum-muted'>Monitor cashflow trends and monthly performance at a glance.</p>
      </header>

      {error ? (
        <div className='rounded-[14px] border border-aurum-danger/30 bg-aurum-card px-3 py-2 text-xs text-aurum-danger'>
          Failed to load monthly summary: {error}
        </div>
      ) : null}

      <Section title='Period'>
        <Card className='rounded-[14px] shadow-aurumSm'>
          <CardContent className='pt-4'>
            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
              <label className='space-y-2 text-sm text-aurum-muted'>
                Year
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className='w-full rounded-[14px] border border-aurum-border bg-aurum-card px-3 py-2 text-aurum-text'
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </label>

              <label className='space-y-2 text-sm text-aurum-muted'>
                Month
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className='w-full rounded-[14px] border border-aurum-border bg-aurum-card px-3 py-2 text-aurum-text'
                >
                  {monthNames.map((name, index) => (
                    <option key={name} value={index + 1}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </CardContent>
        </Card>
      </Section>

      <Card className='relative overflow-hidden rounded-[14px] border-0 shadow-aurumSm'>
        <div className='absolute inset-0 bg-gradient-to-r from-aurum-primarySoft via-white to-white' />
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
                        ? 'text-aurum-danger'
                        : 'text-aurum-muted'
                  }`}
                >
                  {formatCents(netCents)}
                </p>
              )}
              <p
                className={`text-sm font-medium ${
                  toneFromPct(delta.net) === 'positive'
                    ? 'text-aurum-success'
                    : toneFromPct(delta.net) === 'negative'
                      ? 'text-aurum-danger'
                      : 'text-aurum-muted'
                }`}
              >
                {loading ? 'Loading...' : getDeltaLabel(delta.net, netCents, prevNetCents)}
              </p>
            </div>
            <p className='max-w-xs text-xs text-aurum-muted'>
              Strong inflow momentum this month. Keep monitoring discretionary expense categories.
            </p>
          </div>
        </CardContent>
      </Card>

      <section className='grid grid-cols-1 gap-6 md:grid-cols-3'>
        {loading ? (
          <>
            <Card className='rounded-[14px] shadow-aurumSm'>
              <CardContent className='pt-6'>
                <div className='space-y-3'>
                  <div className='h-4 w-24 animate-pulse rounded bg-aurum-primarySoft/50' />
                  <div className='h-9 w-40 animate-pulse rounded bg-aurum-primarySoft/50' />
                  <div className='h-4 w-28 animate-pulse rounded bg-aurum-primarySoft/50' />
                </div>
              </CardContent>
            </Card>
            <Card className='rounded-[14px] shadow-aurumSm'>
              <CardContent className='pt-6'>
                <div className='space-y-3'>
                  <div className='h-4 w-24 animate-pulse rounded bg-aurum-primarySoft/50' />
                  <div className='h-9 w-40 animate-pulse rounded bg-aurum-primarySoft/50' />
                  <div className='h-4 w-28 animate-pulse rounded bg-aurum-primarySoft/50' />
                </div>
              </CardContent>
            </Card>
            <Card className='rounded-[14px] shadow-aurumSm'>
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
            <KpiCard
              title='Income'
              value={formatCents(incomeCents)}
              deltaText={getDeltaLabel(delta.income, incomeCents, prevIncomeCents)}
              tone={toneFromPct(delta.income)}
            />
            <KpiCard
              title='Expense'
              value={formatCents(expenseCents)}
              deltaText={getDeltaLabel(delta.expense, expenseCents, prevExpenseCents)}
              tone={toneFromPct(delta.expense)}
            />
            <KpiCard
              title='Net Cashflow'
              value={formatCents(netCents)}
              deltaText={getDeltaLabel(delta.net, netCents, prevNetCents)}
              tone={toneFromPct(delta.net)}
              emphasized
            />
          </>
        )}
      </section>

      <section className='grid grid-cols-1 gap-6 md:grid-cols-2'>
        <Card className='rounded-[14px] shadow-aurumSm'>
          <CardHeader>
            <CardTitle>Income vs Expense</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='h-[200px] rounded-[16px] border border-aurum-border bg-gradient-to-br from-white to-aurum-primarySoft/20 shadow-inner' />
          </CardContent>
        </Card>

        <Card className='rounded-[14px] shadow-aurumSm'>
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='h-[200px] rounded-[16px] border border-aurum-border bg-gradient-to-br from-white to-aurum-primarySoft/20 shadow-inner' />
          </CardContent>
        </Card>
      </section>
    </Container>
  );
}
