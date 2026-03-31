'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AppIcon } from '@/components/app/AppIcon';
import { APP_NAV_ITEMS, isNavItemActive } from '@/components/app/nav';
import { cn } from '@/lib/cn';

type MobileBottomNavProps = {
  onOpenCommandMenu: () => void;
};

export function MobileBottomNav({ onOpenCommandMenu }: MobileBottomNavProps) {
  const pathname = usePathname();
  const [leftOne, leftTwo, rightOne, rightTwo] = APP_NAV_ITEMS;

  if (!leftOne || !leftTwo || !rightOne || !rightTwo) {
    return null;
  }

  return (
    <nav
      aria-label='Primary'
      className='aurum-mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 lg:hidden'
    >
      <div className='mx-3 rounded-[28px] border border-[var(--aurum-border)] bg-white/92 px-2 pb-2 pt-2 shadow-[0_24px_50px_-26px_rgba(17,24,39,0.5)] backdrop-blur'>
        <div className='grid grid-cols-5 items-end gap-1'>
          {[leftOne, leftTwo].map((item) => {
            const active = isNavItemActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-[20px] px-1 pb-1 pt-2 text-center transition',
                  active
                    ? 'bg-aurum-primarySoft text-[var(--aurum-text)]'
                    : 'text-[var(--aurum-text-muted)] hover:bg-[var(--aurum-surface-alt)] hover:text-[var(--aurum-text)]',
                )}
              >
                <AppIcon
                  name={item.icon}
                  className={cn(
                    'h-[18px] w-[18px]',
                    active ? 'text-[var(--aurum-accent)]' : 'text-current',
                  )}
                />
                <span className='text-[11px] font-medium leading-4'>{item.mobileLabel}</span>
              </Link>
            );
          })}

          <button
            type='button'
            onClick={onOpenCommandMenu}
            aria-label='Open command menu'
            className='flex min-h-[64px] flex-col items-center justify-end pb-1'
          >
            <span className='flex h-14 w-14 items-center justify-center rounded-full border border-[var(--aurum-accent)]/30 bg-[var(--aurum-accent)] text-white shadow-[0_18px_30px_-20px_rgba(17,24,39,0.7)]'>
              <AppIcon name='plus' className='h-6 w-6' />
            </span>
          </button>

          {[rightOne, rightTwo].map((item) => {
            const active = isNavItemActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-[20px] px-1 pb-1 pt-2 text-center transition',
                  active
                    ? 'bg-aurum-primarySoft text-[var(--aurum-text)]'
                    : 'text-[var(--aurum-text-muted)] hover:bg-[var(--aurum-surface-alt)] hover:text-[var(--aurum-text)]',
                )}
              >
                <AppIcon
                  name={item.icon}
                  className={cn(
                    'h-[18px] w-[18px]',
                    active ? 'text-[var(--aurum-accent)]' : 'text-current',
                  )}
                />
                <span className='text-[11px] font-medium leading-4'>{item.mobileLabel}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
