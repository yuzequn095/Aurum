'use client';

import type {
  PortfolioAttentionCategory,
  PortfolioAttentionItem,
  PortfolioAttentionSeverity,
} from '@aurum/core';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getPortfolioAttentionItems } from '@/lib/api/attention-items';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';

interface PortfolioAttentionItemsProps {
  title?: string;
  description?: string;
  limit?: number;
  refreshKey?: string | number;
}

const categoryLabels: Record<PortfolioAttentionCategory, string> = {
  data_health: 'Data health',
  concentration: 'Concentration',
  allocation: 'Allocation',
  change: 'Portfolio change',
  setup: 'Setup',
  market_brief: 'Portfolio lens',
};

function severityBadgeVariant(severity: PortfolioAttentionSeverity): 'info' | 'warn' | 'error' {
  if (severity === 'critical') return 'error';
  if (severity === 'warning') return 'warn';
  return 'info';
}

function attentionItemClasses(severity: PortfolioAttentionSeverity): string {
  if (severity === 'critical') {
    return 'border-aurum-danger/25 bg-[rgba(210,75,75,0.06)]';
  }
  if (severity === 'warning') {
    return 'border-[var(--aurum-warning)]/20 bg-[rgba(185,133,25,0.06)]';
  }
  return 'border-[var(--aurum-accent)]/15 bg-[var(--aurum-surface-alt)]';
}

export function PortfolioAttentionItems({
  title = 'Portfolio Attention',
  description = 'A short, deterministic list of portfolio states worth reviewing.',
  limit = 6,
  refreshKey,
}: PortfolioAttentionItemsProps) {
  const [items, setItems] = useState<PortfolioAttentionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;

    async function loadItems() {
      setLoading(true);
      setError(undefined);
      try {
        const nextItems = await getPortfolioAttentionItems();
        if (active) setItems(nextItems);
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Portfolio attention is temporarily unavailable.',
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadItems();
    return () => {
      active = false;
    };
  }, [refreshKey]);

  const visibleItems = items.slice(0, limit);

  return (
    <Card id="portfolio-attention" className="scroll-mt-24 overflow-hidden">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {!loading && !error ? (
            <Badge
              variant={visibleItems.some((item) => item.severity === 'warning') ? 'warn' : 'info'}
            >
              {visibleItems.length === 0
                ? 'All clear'
                : `${visibleItems.length} item${visibleItems.length === 1 ? '' : 's'}`}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent aria-live="polite">
        {loading ? (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {[0, 1].map((index) => (
              <div
                key={index}
                className="h-36 animate-pulse rounded-[18px] border border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)]"
              />
            ))}
          </div>
        ) : error ? (
          <p className="rounded-[16px] border border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)] px-4 py-3 text-sm text-[var(--aurum-text-muted)]">
            Portfolio attention is temporarily unavailable. The rest of your workspace remains
            available.
          </p>
        ) : visibleItems.length === 0 ? (
          <p className="rounded-[16px] border border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)] px-4 py-3 text-sm text-[var(--aurum-text-muted)]">
            Nothing needs attention right now. Aurum will surface a product action when the
            deterministic portfolio state calls for one.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {visibleItems.map((item) => (
              <article
                key={item.id}
                className={`flex min-w-0 flex-col justify-between gap-4 rounded-[18px] border px-4 py-4 sm:px-5 ${attentionItemClasses(item.severity)}`}
              >
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={severityBadgeVariant(item.severity)}>
                      {item.severity === 'warning' ? 'Review' : 'For context'}
                    </Badge>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--aurum-text-muted)]">
                      {categoryLabels[item.category]}
                    </span>
                  </div>
                  <h3 className="break-words text-base font-semibold text-[var(--aurum-text)]">
                    {item.title}
                  </h3>
                  <p className="break-words text-sm leading-6 text-[var(--aurum-text-muted)]">
                    {item.description}
                  </p>
                </div>
                {item.action ? (
                  <Link
                    href={item.action.href}
                    className="inline-flex min-h-10 w-fit max-w-full items-center justify-center rounded-[var(--aurum-radius-md)] border border-[var(--aurum-border)] bg-white px-3 text-center text-sm font-medium leading-snug text-[var(--aurum-text)] shadow-[var(--aurum-shadow)] transition hover:border-[var(--aurum-accent)]/35 hover:bg-[var(--aurum-surface-alt)]"
                  >
                    {item.action.label}
                  </Link>
                ) : null}
              </article>
            ))}
          </div>
        )}
        {items.length > visibleItems.length ? (
          <p className="mt-3 text-xs text-[var(--aurum-text-muted)]">
            {items.length - visibleItems.length} more item
            {items.length - visibleItems.length === 1 ? '' : 's'} available on the Portfolio page.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
