'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { APP_NAV_ITEMS, SETTINGS_HREF } from '@/components/app/nav';
import { useAuthSession } from '@/lib/auth/session';
import { cn } from '@/lib/cn';

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

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

        <nav className='space-y-1'>
          {APP_NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group relative flex items-center rounded-aurum px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-aurum-primarySoft/80 text-aurum-text'
                    : 'text-aurum-muted hover:bg-white hover:text-aurum-text',
                )}
              >
                <span
                  className={cn(
                    'mr-3 h-5 w-1 rounded-full bg-transparent transition-colors',
                    active ? 'bg-aurum-primaryHover' : 'group-hover:bg-aurum-border',
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className='mt-auto border-t border-aurum-border/70 pt-4'>
          <Link
            href={SETTINGS_HREF}
            className={cn(
              'group flex items-center gap-3 rounded-[var(--aurum-radius-lg)] border px-3 py-3 transition',
              isActive(pathname, SETTINGS_HREF)
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
