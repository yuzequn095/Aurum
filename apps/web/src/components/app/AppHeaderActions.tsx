'use client';

import Link from 'next/link';
import { AppIcon } from '@/components/app/AppIcon';
import { SETTINGS_HREF } from '@/components/app/nav';
import { useAuthSession } from '@/lib/auth/session';
import { cn } from '@/lib/cn';

type AppHeaderActionsProps = {
  onOpenCommandMenu: () => void;
};

function getUserInitials(userEmail: string | null): string {
  if (!userEmail) {
    return 'AU';
  }

  const localPart = userEmail.split('@')[0] ?? '';
  const initials = localPart
    .split(/[._-]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase() ?? '')
    .join('');

  return initials || userEmail.slice(0, 2).toUpperCase();
}

export function AppHeaderActions({ onOpenCommandMenu }: AppHeaderActionsProps) {
  const { userEmail } = useAuthSession();

  return (
    <div className='flex items-center gap-2'>
      <button
        type='button'
        onClick={onOpenCommandMenu}
        className={cn(
          'hidden h-10 items-center gap-2 rounded-full border border-[var(--aurum-border)] bg-[var(--aurum-surface)] px-4 text-sm font-medium text-[var(--aurum-text)] shadow-[var(--aurum-shadow)] transition hover:border-[var(--aurum-accent)]/35 hover:bg-[var(--aurum-surface-alt)] md:inline-flex',
        )}
        aria-label='Open command menu'
      >
        <AppIcon name='command' className='h-[18px] w-[18px] text-[var(--aurum-accent)]' />
        Command
      </button>

      <Link
        href={SETTINGS_HREF}
        aria-label='Open settings'
        className='group flex h-10 items-center gap-3 rounded-full border border-[var(--aurum-border)] bg-[var(--aurum-surface)] px-2.5 pr-3 shadow-[var(--aurum-shadow)] transition hover:border-[var(--aurum-accent)]/35 hover:bg-[var(--aurum-surface-alt)]'
      >
        <span className='flex h-7 w-7 items-center justify-center rounded-full bg-[var(--aurum-surface-alt)] text-[11px] font-semibold tracking-[0.12em] text-[var(--aurum-text)]'>
          {getUserInitials(userEmail)}
        </span>
        <span className='hidden min-w-0 text-left xl:block'>
          <span className='block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aurum-text-muted)] group-hover:text-[var(--aurum-accent)]'>
            Settings
          </span>
          <span className='block max-w-[180px] truncate text-sm text-[var(--aurum-text)]'>
            {userEmail ?? 'Account'}
          </span>
        </span>
        <AppIcon name='settings' className='h-[18px] w-[18px] text-[var(--aurum-text-muted)]' />
      </Link>
    </div>
  );
}
