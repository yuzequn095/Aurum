import Link from 'next/link';
import type { AIReportArtifact, FinancialHealthScoreArtifact } from '@aurum/core';
import type { CurrentUserEntitlementsView } from '@/lib/api/entitlements';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  formatDateLabel,
  getHealthVariant,
  getReportPreview,
} from '@/components/home/format';

type HomeAiBriefCardProps = {
  latestReport: AIReportArtifact | null;
  latestScore: FinancialHealthScoreArtifact | null;
  entitlements: CurrentUserEntitlementsView | null;
  loading?: boolean;
};

function getPlanBadge(entitlements: CurrentUserEntitlementsView | null) {
  if (!entitlements) {
    return {
      label: 'AI status unknown',
      variant: 'neutral' as const,
    };
  }

  if (entitlements.status === 'active') {
    return {
      label: 'AI active',
      variant: 'good' as const,
    };
  }

  return {
    label: 'Historical read only',
    variant: 'warn' as const,
  };
}

export function HomeAiBriefCard({
  latestReport,
  latestScore,
  entitlements,
  loading,
}: HomeAiBriefCardProps) {
  const planBadge = getPlanBadge(entitlements);

  return (
    <Card className='bg-[rgba(255,255,255,0.9)]'>
      <CardHeader className='space-y-3'>
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <div className='space-y-1'>
            <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--aurum-text-muted)]'>
              Intelligence Layer
            </p>
            <CardTitle>Executive brief and AI posture</CardTitle>
            <CardDescription>
              Your report history, score posture, and next AI entry points live together here.
            </CardDescription>
          </div>
          <Badge variant={planBadge.variant}>{planBadge.label}</Badge>
        </div>
      </CardHeader>

      <CardContent className='space-y-5'>
        {loading ? (
          <>
            <Skeleton className='h-28 rounded-[24px]' />
            <Skeleton className='h-24 rounded-[24px]' />
          </>
        ) : (
          <>
            <div className='rounded-[24px] border border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)] p-5'>
              {latestReport ? (
                <div className='space-y-3'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <Badge variant='info'>
                      {latestReport.reportType.replaceAll('_', ' ')}
                    </Badge>
                    <p className='text-xs text-[var(--aurum-text-muted)]'>
                      {formatDateLabel(latestReport.createdAt)}
                    </p>
                  </div>
                  <div className='space-y-2'>
                    <h3 className='text-xl font-semibold text-[var(--aurum-text)]'>
                      {latestReport.title}
                    </h3>
                    <p className='text-sm leading-7 text-[var(--aurum-text-muted)]'>
                      {getReportPreview(latestReport)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className='space-y-3'>
                  <Badge variant='neutral'>No persisted brief yet</Badge>
                  <p className='text-lg font-semibold text-[var(--aurum-text)]'>
                    AI Insights is ready when you need it
                  </p>
                  <p className='text-sm leading-7 text-[var(--aurum-text-muted)]'>
                    Generate a Monthly Financial Review, Daily Market Brief, or start a Quick Chat
                    when you want Home to surface a richer executive layer.
                  </p>
                </div>
              )}
            </div>

            <div className='rounded-[24px] border border-[var(--aurum-border)] bg-white p-5'>
              {latestScore ? (
                <div className='space-y-3'>
                  <div className='flex flex-wrap items-center justify-between gap-3'>
                    <div>
                      <p className='text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--aurum-text-muted)]'>
                        Latest Health Score
                      </p>
                      <p className='mt-2 text-2xl font-semibold text-[var(--aurum-text)]'>
                        {latestScore.result.totalScore}/{latestScore.result.maxScore}
                      </p>
                    </div>
                    <Badge variant={getHealthVariant(latestScore.result.grade)}>
                      {latestScore.result.grade.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className='text-sm font-medium text-[var(--aurum-text)]'>
                    {latestScore.insight.headline}
                  </p>
                  <p className='text-sm leading-7 text-[var(--aurum-text-muted)]'>
                    {latestScore.insight.summary}
                  </p>
                </div>
              ) : (
                <div className='space-y-2'>
                  <p className='text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--aurum-text-muted)]'>
                    Financial Health Score
                  </p>
                  <p className='text-sm leading-7 text-[var(--aurum-text-muted)]'>
                    No score artifact yet. Home will surface your latest grade and summary here once
                    AI analysis has been generated from a portfolio snapshot.
                  </p>
                </div>
              )}
            </div>

            <div className='flex flex-wrap gap-3'>
              <Link
                href='/ai-insights'
                className='inline-flex h-10 items-center justify-center rounded-full border border-transparent bg-[var(--aurum-accent)] px-4 text-sm font-medium text-white transition hover:brightness-95'
              >
                Open AI Insights
              </Link>
              <Link
                href='/ai-insights#quick-chat-section'
                className='inline-flex h-10 items-center justify-center rounded-full border border-[var(--aurum-border)] bg-[var(--aurum-surface)] px-4 text-sm font-medium text-[var(--aurum-text)] transition hover:border-[var(--aurum-accent)]/35 hover:bg-[var(--aurum-surface-alt)]'
              >
                Quick Chat
              </Link>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
