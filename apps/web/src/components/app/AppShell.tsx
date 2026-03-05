import { PropsWithChildren } from 'react';
import { SidebarNav } from '@/components/app/SidebarNav';
import { Topbar } from '@/components/app/Topbar';

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className='relative min-h-screen w-full overflow-hidden bg-aurum-bg aurum-noise'>
      <div className='absolute inset-0 aurum-app-bg' />
      <div className='relative flex min-h-screen w-full'>
        <SidebarNav />
        <div className='min-w-0 flex-1'>
          <Topbar />
          <main className='px-4 py-6 sm:px-6 lg:px-8'>
            <div className='mx-auto w-full max-w-[1240px]'>{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
