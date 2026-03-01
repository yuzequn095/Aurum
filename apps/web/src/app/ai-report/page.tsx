'use client';

import { useEffect, useMemo, useState } from 'react';
import { CategoryBreakdownPieChart } from '@/components/charts/DashboardCharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Container, Section } from '@/components/ui/layout';
import {
  AiInsight,
  AiMonthlyReportResponse,
  getMonthlyAiReport,
} from '@/lib/api';

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

function formatCents(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

function insightClasses(severity: AiInsight['severity']) {
  if (severity === 'error') {
    return 'border-aurum-danger/40 bg-aurum-card text-aurum-danger';
  }
  if (severity === 'warn') {
    return 'border-aurum-primaryHover/40 bg-aurum-primarySoft/35 text-aurum-text';
  }
  if (severity === 'good') {
    return 'border-aurum-success/30 bg-aurum-card text-aurum-success';
  }
  return 'border-aurum-border bg-aurum-card text-aurum-text';
}

export default function AiReportPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [report, setReport] = useState<AiMonthlyReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const yearOptions = useMemo(() => [year, year - 1, year - 2], [year]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getMonthlyAiReport(year, month);
        if (!cancelled) setReport(data);
      } catch (e) {
        if (!cancelled) {
          setReport(null);
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
  }, [year, month, retryCount]);

  const totals = report?.summary.totals ?? {
    incomeCents: 0,
    expenseCents: 0,
    netCents: 0,
  };
  const categoryTotals = useMemo(
    () =>
      [...(report?.categoryBreakdown.totals ?? [])].sort(
        (a, b) => b.expenseCents - a.expenseCents,
      ),
    [report],
  );
  const categoryChartData = useMemo(
    () =>
      categoryTotals.map((item) => ({
        name: item.categoryName || 'Uncategorized',
        value: item.expenseCents / 100,
      })),
    [categoryTotals],
  );
  const insights = report?.insights ?? [];
  const isCategoryEmptyState =
    !loading &&
    totals.incomeCents === 0 &&
    totals.expenseCents === 0 &&
    totals.netCents === 0 &&
    categoryTotals.length === 0;
  const isReportEmpty =
    !loading &&
    totals.incomeCents === 0 &&
    totals.expenseCents === 0 &&
    totals.netCents === 0 &&
    insights.length === 0;

  return (
    <Container className='py-8 space-y-10'>
      <header className='space-y-2'>
        <h1 className='text-3xl font-semibold tracking-tight text-aurum-text'>AI Report</h1>
        <p className='text-sm text-aurum-muted'>Monthly insights generated from your transactions.</p>
      </header>

      {error ? (
        <div className='flex items-center justify-between gap-4 rounded-[14px] border border-aurum-danger/30 bg-aurum-card px-3 py-2 text-xs text-aurum-danger'>
          <span>Failed to load AI report: {error}</span>
          <Button
            type='button'
            variant='secondary'
            className='h-8 px-2 py-1 text-xs'
            onClick={() => setRetryCount((prev) => prev + 1)}
          >
            Retry
          </Button>
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

      {isReportEmpty ? (
        <Card className='rounded-[14px] shadow-aurumSm'>
          <CardContent className='pt-6'>
            <div className='rounded-[12px] border border-aurum-border bg-gradient-to-br from-white to-aurum-primarySoft/20 p-4 text-sm text-aurum-muted'>
              No transactions or insights available for this month yet.
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Section title='Overview'>
        <Card className='rounded-[14px] shadow-aurumSm'>
          <CardContent className='pt-6'>
            {loading ? (
              <div className='space-y-4'>
                <div className='h-12 w-56 animate-pulse rounded bg-aurum-primarySoft/50' />
                <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
                  <div className='h-16 animate-pulse rounded bg-aurum-primarySoft/50' />
                  <div className='h-16 animate-pulse rounded bg-aurum-primarySoft/50' />
                  <div className='h-16 animate-pulse rounded bg-aurum-primarySoft/50' />
                </div>
              </div>
            ) : (
              <div className='space-y-5'>
                <div>
                  <p className='text-sm text-aurum-muted'>Net Cashflow</p>
                  <p
                    className={`text-4xl font-semibold ${
                      totals.netCents > 0
                        ? 'text-aurum-success'
                        : totals.netCents < 0
                          ? 'text-aurum-danger/80'
                          : 'text-aurum-muted'
                    }`}
                  >
                    {formatCents(totals.netCents)}
                  </p>
                </div>

                <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
                  <div className='rounded-[12px] border border-aurum-border bg-aurum-card p-4'>
                    <p className='text-xs text-aurum-muted'>Income</p>
                    <p className='text-lg font-semibold text-aurum-success'>{formatCents(totals.incomeCents)}</p>
                  </div>
                  <div className='rounded-[12px] border border-aurum-border bg-aurum-card p-4'>
                    <p className='text-xs text-aurum-muted'>Expense</p>
                    <p className='text-lg font-semibold text-aurum-danger/80'>{formatCents(totals.expenseCents)}</p>
                  </div>
                  <div className='rounded-[12px] border border-aurum-border bg-aurum-card p-4'>
                    <p className='text-xs text-aurum-muted'>Net</p>
                    <p className='text-lg font-semibold text-aurum-text'>{formatCents(totals.netCents)}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </Section>

      <Section title='Insights'>
        <Card className='rounded-[14px] shadow-aurumSm'>
          <CardContent className='pt-6'>
            {loading ? (
              <div className='space-y-3'>
                <div className='h-20 animate-pulse rounded bg-aurum-primarySoft/50' />
                <div className='h-20 animate-pulse rounded bg-aurum-primarySoft/50' />
              </div>
            ) : insights.length === 0 ? (
              <div className='rounded-[12px] border border-aurum-border bg-aurum-card p-4 text-sm text-aurum-muted'>
                No insights available for this month.
              </div>
            ) : (
              <div className='space-y-3'>
                {insights.map((insight) => (
                  <div key={insight.id} className={`rounded-[12px] border p-4 ${insightClasses(insight.severity)}`}>
                    <p className='text-sm font-semibold'>{insight.title}</p>
                    <p className='mt-1 text-sm'>{insight.body}</p>
                  </div>
                ))}
                <p className='pt-1 text-xs text-aurum-muted'>
                  Insights are currently rule-based. LLM-based insights will be added in a later milestone.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </Section>

      <Section title='Category Breakdown'>
        <Card className='rounded-[14px] shadow-aurumSm'>
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className='h-[220px] animate-pulse rounded-[16px] border border-aurum-border bg-gradient-to-br from-white to-aurum-primarySoft/20 shadow-inner' />
            ) : isCategoryEmptyState ? (
              <div className='h-[220px] rounded-[16px] border border-aurum-border bg-gradient-to-br from-white to-aurum-primarySoft/20 shadow-inner text-sm text-aurum-muted flex items-center justify-center'>
                No expenses this month
              </div>
            ) : (
              <div className='rounded-[16px] border border-aurum-border bg-gradient-to-br from-white to-aurum-primarySoft/20 shadow-inner p-4 space-y-4'>
                <div className='h-[220px]'>
                  <CategoryBreakdownPieChart data={categoryChartData} />
                </div>
                <div className='max-h-[220px] space-y-2 overflow-auto'>
                  {categoryTotals.map((item) => (
                    <div
                      key={item.categoryId ?? item.categoryName ?? 'uncategorized'}
                      className='flex items-center justify-between rounded-[10px] bg-aurum-card/80 px-3 py-2'
                    >
                      <span className='text-sm text-aurum-text'>
                        {item.categoryName || 'Uncategorized'}
                      </span>
                      <span className='text-sm font-medium text-aurum-text'>
                        {formatCents(item.expenseCents)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </Section>
    </Container>
  );
}
