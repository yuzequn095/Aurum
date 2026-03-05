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
      <Card className='max-w-3xl'>
        <CardHeader>
          <CardTitle className='text-2xl'>Settings</CardTitle>
          <CardDescription>Manage your account session and security settings.</CardDescription>
        </CardHeader>
        <CardContent className='space-y-6'>
          <div className='rounded-[var(--aurum-radius-lg)] border border-[var(--aurum-border)] bg-[var(--aurum-surface-alt)] p-4'>
            <p className='text-xs uppercase tracking-[0.16em] text-[var(--aurum-text-muted)]'>Account Email</p>
            <p className='mt-2 text-sm font-medium text-[var(--aurum-text)]'>{userEmail ?? 'Unknown'}</p>
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
    </PageContainer>
  );
}
