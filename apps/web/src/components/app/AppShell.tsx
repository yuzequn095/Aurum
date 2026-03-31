'use client';

import { PropsWithChildren, useState } from 'react';
import { AppCommandMenu } from '@/components/app/AppCommandMenu';
import { MobileBottomNav } from '@/components/app/MobileBottomNav';
import { SidebarNav } from '@/components/app/SidebarNav';
import { Topbar } from '@/components/app/Topbar';

export function AppShell({ children }: PropsWithChildren) {
  const [commandMenuOpen, setCommandMenuOpen] = useState(false);

  return (
    <div className='relative min-h-screen w-full overflow-hidden aurum-noise'>
      <div className='absolute inset-0 aurum-app-bg' />
      <div className='relative flex min-h-screen w-full'>
        <SidebarNav />
        <div className='flex min-h-screen min-w-0 flex-1 flex-col lg:pl-[274px]'>
          <Topbar onOpenCommandMenu={() => setCommandMenuOpen(true)} />
          <main className='aurum-mobile-shell-main min-h-[calc(100vh-74px)] w-full flex-1'>
            {children}
          </main>
        </div>
      </div>
      <MobileBottomNav onOpenCommandMenu={() => setCommandMenuOpen(true)} />
      <AppCommandMenu open={commandMenuOpen} onClose={() => setCommandMenuOpen(false)} />
    </div>
  );
}
