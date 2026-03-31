'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AppHeaderActions } from '@/components/app/AppHeaderActions';
import { getNavTitle } from '@/components/app/nav';

type TopbarProps = {
  onOpenCommandMenu: () => void;
};

export function Topbar({ onOpenCommandMenu }: TopbarProps) {
  const pathname = usePathname();
  const title = getNavTitle(pathname);

  return (
    <header className='sticky top-0 z-30 border-b border-aurum-border/80 bg-white/78 backdrop-blur'>
      <div className='flex h-[74px] items-center gap-4 px-4 sm:px-6 lg:px-8'>
        <div className='flex min-w-0 flex-1 items-center gap-3'>
          <Link
            href='/dashboard'
            aria-label='Go to dashboard'
            className='flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--aurum-border)] bg-[var(--aurum-surface)] text-[11px] font-semibold tracking-[0.14em] text-[var(--aurum-text)] shadow-[var(--aurum-shadow)] lg:hidden'
          >
            AU
          </Link>

          <div className='min-w-0 space-y-0.5'>
            <p className='text-[10px] font-semibold uppercase tracking-[0.16em] text-aurum-muted'>
              {pathname.startsWith('/settings') ? 'Account' : 'Wealth Command'}
            </p>
            <h2 className='truncate text-[22px] font-semibold tracking-tight text-aurum-text sm:text-[23px]'>
              {title}
            </h2>
          </div>
        </div>

        <AppHeaderActions onOpenCommandMenu={onOpenCommandMenu} />
      </div>
    </header>
  );
}
