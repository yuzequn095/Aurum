'use client';

import { usePathname } from 'next/navigation';
import { getNavTitle } from '@/components/app/nav';

export function Topbar() {
  const pathname = usePathname();
  const title = getNavTitle(pathname);

  return (
    <header className='sticky top-0 z-20 border-b border-aurum-border bg-white/95 backdrop-blur'>
      <div className='flex h-16 items-center px-4 sm:px-6'>
        <h2 className='text-xl font-semibold tracking-tight text-aurum-text'>{title}</h2>
      </div>
    </header>
  );
}
