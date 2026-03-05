'use client';

import { usePathname } from 'next/navigation';
import { getNavTitle } from '@/components/app/nav';

export function Topbar() {
  const pathname = usePathname();
  const title = getNavTitle(pathname);

  return (
    <header className='sticky top-0 z-20 border-b border-aurum-border/80 bg-white/75 backdrop-blur'>
      <div className='flex h-[74px] items-center px-4 sm:px-6 lg:px-8'>
        <div className='space-y-0.5'>
          <p className='text-[10px] font-semibold uppercase tracking-[0.14em] text-aurum-muted'>
            Wealth Command
          </p>
          <h2 className='text-[23px] font-semibold tracking-tight text-aurum-text'>{title}</h2>
        </div>
      </div>
    </header>
  );
}
