'use client';

import { usePathname, useRouter } from 'next/navigation';
import { PropsWithChildren, useEffect } from 'react';
import { useAuthSession } from '@/lib/auth/session';

export function AuthGate({ children }: PropsWithChildren) {
  const router = useRouter();
  const pathname = usePathname();
  const { isHydrated, isAuthenticated } = useAuthSession();

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      const next = pathname ? `?next=${encodeURIComponent(pathname)}` : '';
      router.replace(`/login${next}`);
    }
  }, [isAuthenticated, isHydrated, pathname, router]);

  if (!isHydrated) {
    return (
      <div className='relative flex min-h-screen items-center justify-center overflow-hidden bg-aurum-bg'>
        <div className='absolute inset-0 aurum-app-bg' />
        <div className='relative rounded-aurum border border-aurum-border bg-white/90 px-6 py-4 shadow-aurum'>
          <p className='text-sm text-aurum-muted'>Loading your suite...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className='relative flex min-h-screen items-center justify-center overflow-hidden bg-aurum-bg'>
        <div className='absolute inset-0 aurum-app-bg' />
        <div className='relative h-8 w-8 animate-spin rounded-full border-2 border-aurum-primary border-t-aurum-primaryHover' />
      </div>
    );
  }

  return <>{children}</>;
}
