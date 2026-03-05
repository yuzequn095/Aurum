import { PropsWithChildren } from 'react';
import { SidebarNav } from '@/components/app/SidebarNav';
import { Topbar } from '@/components/app/Topbar';

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className='relative min-h-screen w-full overflow-hidden aurum-noise'>
      <div className='absolute inset-0 aurum-app-bg' />
      <div className='relative flex min-h-screen w-full'>
        <SidebarNav />
        <div className='min-w-0 flex-1'>
          <Topbar />
          <main className='min-h-[calc(100vh-74px)] w-full'>{children}</main>
        </div>
      </div>
    </div>
  );
}
