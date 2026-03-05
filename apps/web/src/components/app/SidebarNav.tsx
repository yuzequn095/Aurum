'use client';

import Image from 'next/image';
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
    <aside className='hidden w-[274px] shrink-0 border-r border-aurum-border/80 bg-white/78 backdrop-blur lg:block'>
      <div className='sticky top-0 flex h-screen flex-col px-5 py-6'>
        <div className='mb-9 px-1'>
          <div className='flex items-center gap-3'>
            <Image
              src='/brand/aurum-mark.png'
              alt='Aurum mark'
              width={34}
              height={34}
              className='h-[34px] w-[34px] object-contain'
            />
            <div>
              <p className='text-[10px] font-semibold uppercase tracking-[0.16em] text-aurum-muted'>
                AURUM
              </p>
              <h1 className='mt-0.5 text-[17px] font-semibold tracking-tight text-aurum-text'>
                Wealth OS
              </h1>
            </div>
          </div>
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
      </div>
    </aside>
  );
}
