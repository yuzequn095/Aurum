import { PropsWithChildren } from 'react';
import { SidebarNav } from '@/components/app/SidebarNav';
import { Topbar } from '@/components/app/Topbar';

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className='min-h-screen bg-aurum-bg'>
      <div className='mx-auto flex max-w-[1600px]'>
        <SidebarNav />
        <div className='min-w-0 flex-1'>
          <Topbar />
          <main className='px-4 py-6 sm:px-6'>{children}</main>
        </div>
      </div>
    </div>
  );
}
