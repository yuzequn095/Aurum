'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { ConnectedFinanceOverview } from '@aurum/core';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { useAuthSession } from '@/lib/auth/session';
import { logout } from '@/lib/auth/logout';
import { getConnectedFinanceOverview } from '@/lib/api/connected-finance';

export default function SettingsPage() {
  const { userEmail } = useAuthSession();
  const [loggingOut, setLoggingOut] = useState(false);
  const [overview, setOverview] = useState<ConnectedFinanceOverview | null>(null);

  useEffect(() => {
    getConnectedFinanceOverview()
      .then(setOverview)
      .catch(() => setOverview(null));
  }, []);

  const onLogout = async () => {
    setLoggingOut(true);
    await logout();
  };

  return (
    <PageContainer className="space-y-6 pb-8 md:pb-10">
      <section className="aurum-elevated-surface relative overflow-hidden rounded-[28px] border border-[var(--aurum-border)] p-5 shadow-[var(--aurum-shadow)] sm:p-6 lg:p-7">
        <div className="relative grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="neutral">Account</Badge>
              <Badge variant="info">Preferences</Badge>
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-[var(--aurum-text)] sm:text-4xl">
                Settings
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-[var(--aurum-text-muted)]">
                Keep account identity, session controls, and product preference entry points in one
                quiet support surface.
              </p>
            </div>
          </div>

          <Card className="bg-[var(--aurum-surface-alt)]">
            <CardHeader>
              <CardTitle className="text-xl">Current Session</CardTitle>
              <CardDescription>Signed-in identity for this browser session.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[var(--aurum-radius-lg)] border border-[var(--aurum-border)] bg-white p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--aurum-text-muted)]">
                  Signed In As
                </p>
                <p className="mt-2 text-sm font-medium text-[var(--aurum-text)]">
                  {userEmail ?? 'Unknown'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Account</CardTitle>
            <CardDescription>Review the identity currently using Aurum.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-[var(--aurum-radius-lg)] border border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)] p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--aurum-text-muted)]">
                Account Email
              </p>
              <p className="mt-2 text-sm font-medium text-[var(--aurum-text)]">
                {userEmail ?? 'Unknown'}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-[var(--aurum-radius-lg)] border border-[var(--aurum-border)] bg-white p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--aurum-text-muted)]">
                  AI Delivery
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--aurum-text-muted)]">
                  Portfolio Market Lens preferences live with AI Insights so report context stays
                  nearby.
                </p>
                <Link
                  href="/ai-insights#reports-daily-market-brief"
                  className="mt-3 inline-flex text-sm font-medium text-[var(--aurum-accent)]"
                >
                  Manage in AI Insights
                </Link>
              </div>
              <div className="rounded-[var(--aurum-radius-lg)] border border-dashed border-[var(--aurum-border)] bg-white p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--aurum-text-muted)]">
                  Product Preferences
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--aurum-text-muted)]">
                  Appearance and notification preferences are reserved until real behavior exists.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Session</CardTitle>
            <CardDescription>Manage the current session on this device.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-[var(--aurum-radius-lg)] border border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)] p-4">
              <p className="text-sm text-[var(--aurum-text)]">
                Log out when you want to end the current Aurum session on this machine.
              </p>
            </div>

            <div className="flex items-center justify-end">
              <Button
                variant="danger"
                size="md"
                onClick={onLogout}
                disabled={loggingOut}
                aria-label="Log out of Aurum"
              >
                {loggingOut ? 'Logging out...' : 'Log out'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Institutions</CardTitle>
            <CardDescription>Connection health and account coverage.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[var(--aurum-radius-lg)] border border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)] p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--aurum-text-muted)]">
                  Institutions
                </p>
                <p className="mt-2 text-lg font-semibold text-[var(--aurum-text)]">
                  {overview?.summary.sourceCount ?? '...'}
                </p>
              </div>
              <div className="rounded-[var(--aurum-radius-lg)] border border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)] p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--aurum-text-muted)]">
                  Needs Attention
                </p>
                <p className="mt-2 text-lg font-semibold text-[var(--aurum-text)]">
                  {overview?.summary.needsAttentionCount ?? '...'}
                </p>
              </div>
            </div>
            <Link
              href="/portfolio#connections-workspace"
              className="inline-flex text-sm font-medium text-[var(--aurum-accent)]"
            >
              Manage in Portfolio
            </Link>
          </CardContent>
        </Card>
      </section>
    </PageContainer>
  );
}
