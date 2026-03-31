'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AppIcon } from '@/components/app/AppIcon';
import { APP_NAV_ITEMS, SETTINGS_HREF, isNavItemActive } from '@/components/app/nav';
import { useAuthSession } from '@/lib/auth/session';
import { cn } from '@/lib/cn';

export function SidebarNav() {
  const pathname = usePathname();
  const { userEmail } = useAuthSession();

  return (
    <aside className='hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:block lg:w-[274px] lg:shrink-0 lg:border-r lg:border-aurum-border/80 lg:bg-white/78 lg:backdrop-blur'>
      <div className='flex h-full flex-col px-5 py-6'>
        <div className='mb-9 px-1'>
          <Image
            src='/aurum_logo_thin_horizontal.svg'
            alt='Aurum'
            width={170}
            height={44}
            className='h-[44px] w-[170px] object-contain'
          />
          <p className='mt-4 text-xs leading-5 text-aurum-muted'>
            Private command center for wealth management.
          </p>
        </div>

        <div className='mb-3 px-1'>
          <p className='text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--aurum-text-muted)]'>
            Primary Areas
          </p>
        </div>

        <nav className='space-y-1'>
          {APP_NAV_ITEMS.map((item) => {
            const active = isNavItemActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group relative flex items-start gap-3 rounded-[18px] px-3 py-3 text-sm transition-colors',
                  active
                    ? 'bg-aurum-primarySoft/80 text-aurum-text shadow-aurumSm'
                    : 'text-aurum-muted hover:bg-white hover:text-aurum-text',
                )}
              >
                <span
                  className={cn(
                    'mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border transition-colors',
                    active
                      ? 'border-aurum-primaryHover/30 bg-white text-aurum-primaryHover'
                      : 'border-transparent bg-white/70 text-aurum-muted group-hover:border-aurum-border group-hover:text-aurum-text',
                  )}
                >
                  <AppIcon name={item.icon} className='h-[18px] w-[18px]' />
                </span>

                <span className='min-w-0 flex-1'>
                  <span className='block font-medium text-[var(--aurum-text)]'>{item.label}</span>
                  <span className='mt-0.5 block text-xs leading-5 text-[var(--aurum-text-muted)]'>
                    {item.description}
                  </span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className='mt-auto border-t border-aurum-border/70 pt-4'>
          <Link
            href={SETTINGS_HREF}
            className={cn(
              'group flex items-center gap-3 rounded-[var(--aurum-radius-lg)] border px-3 py-3 transition',
              isNavItemActive(pathname, SETTINGS_HREF)
                ? 'border-[var(--aurum-accent)]/45 bg-[var(--aurum-surface-alt)]'
                : 'border-[var(--aurum-border)] bg-[var(--aurum-surface)] hover:border-[var(--aurum-accent)]/35 hover:bg-[var(--aurum-surface-alt)]',
            )}
          >
            <div className='flex h-10 w-10 items-center justify-center rounded-full border border-[var(--aurum-border)] bg-white text-xs font-semibold tracking-wide text-[var(--aurum-text)]'>
              AU
            </div>
            <div className='min-w-0 flex-1'>
              <p className='truncate text-sm font-medium text-[var(--aurum-text)]'>Profile</p>
              <p className='truncate text-xs text-[var(--aurum-text-muted)]'>
                {userEmail ?? 'member@aurum.exclusive'}
              </p>
            </div>
            <span className='text-xs font-semibold uppercase tracking-[0.14em] text-[var(--aurum-text-muted)] group-hover:text-[var(--aurum-accent)]'>
              Settings
            </span>
          </Link>
        </div>
      </div>
    </aside>
  );
}
