'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { APP_NAV_ITEMS } from '@/components/app/nav';
import { cn } from '@/lib/cn';

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className='hidden w-64 shrink-0 border-r border-aurum-border bg-white lg:block'>
      <div className='sticky top-0 flex h-screen flex-col px-4 py-6'>
        <div className='mb-8 px-2'>
          <p className='text-xs font-semibold uppercase tracking-[0.12em] text-aurum-muted'>
            Aurum
          </p>
          <h1 className='mt-1 text-lg font-semibold text-aurum-text'>Wealth OS</h1>
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
                    ? 'bg-aurum-primarySoft text-aurum-text'
                    : 'text-aurum-muted hover:bg-aurum-bg hover:text-aurum-text',
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
      </div>
    </aside>
  );
}
