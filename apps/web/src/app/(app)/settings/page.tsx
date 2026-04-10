'use client';

import { useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { useAuthSession } from '@/lib/auth/session';
import { logout } from '@/lib/auth/logout';

export default function SettingsPage() {
  const { userEmail } = useAuthSession();
  const [loggingOut, setLoggingOut] = useState(false);

  const onLogout = async () => {
    setLoggingOut(true);
    await logout();
  };

  return (
    <PageContainer className='space-y-6'>
      <section className='space-y-2'>
        <h1 className='text-3xl font-semibold tracking-tight text-[var(--aurum-text)]'>Settings</h1>
        <p className='max-w-2xl text-sm leading-7 text-[var(--aurum-text-muted)]'>
          Account, session, and preference controls live here as a supportive surface, separate
          from Aurum&apos;s day-to-day product workflows.
        </p>
      </section>

      <div className='grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]'>
        <Card>
          <CardHeader>
            <CardTitle className='text-2xl'>Account</CardTitle>
            <CardDescription>Review the signed-in account currently using Aurum.</CardDescription>
          </CardHeader>
          <CardContent className='space-y-6'>
            <div className='rounded-[var(--aurum-radius-lg)] border border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)] p-4'>
              <p className='text-xs uppercase tracking-[0.16em] text-[var(--aurum-text-muted)]'>Account Email</p>
              <p className='mt-2 text-sm font-medium text-[var(--aurum-text)]'>{userEmail ?? 'Unknown'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
        <CardHeader>
          <CardTitle className='text-2xl'>Session</CardTitle>
          <CardDescription>Manage the current session on this device.</CardDescription>
        </CardHeader>
        <CardContent className='space-y-6'>
          <div className='rounded-[var(--aurum-radius-lg)] border border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)] p-4'>
            <p className='text-sm text-[var(--aurum-text)]'>
              Log out when you want to end the current Aurum session on this machine.
            </p>
          </div>

          <div className='flex items-center justify-end'>
            <Button
              variant='danger'
              size='md'
              onClick={onLogout}
              disabled={loggingOut}
              aria-label='Log out of Aurum'
            >
              {loggingOut ? 'Logging out...' : 'Log out'}
            </Button>
          </div>
        </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
