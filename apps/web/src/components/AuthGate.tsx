'use client';

import { usePathname, useRouter } from 'next/navigation';
import { PropsWithChildren, useEffect } from 'react';
import { AuthSpinner } from '@/components/auth/AuthSpinner';
import { useAuthSession } from '@/lib/auth/session';

export function AuthGate({ children }: PropsWithChildren) {
  const router = useRouter();
  const pathname = usePathname();
  const { isHydrated, isAuthenticated, isUnavailable, retryHydration } = useAuthSession();

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
    if (isUnavailable) {
      return (
        <div className='relative flex min-h-screen items-center justify-center overflow-hidden bg-aurum-bg px-5'>
          <div className='absolute inset-0 aurum-app-bg' />
          <div className='relative max-w-md rounded-aurum border border-aurum-border bg-white/90 p-6 text-center shadow-aurum'>
            <h1 className='text-lg font-semibold text-aurum-text'>Session check unavailable</h1>
            <p className='mt-2 text-sm leading-6 text-aurum-muted'>
              Aurum kept your saved session. Check your connection and try again.
            </p>
            <button
              type='button'
              className='mt-5 rounded-full bg-aurum-text px-5 py-2 text-sm font-medium text-white'
              onClick={() => void retryHydration()}
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className='relative flex min-h-screen items-center justify-center overflow-hidden bg-aurum-bg'>
        <div className='absolute inset-0 aurum-app-bg' />
        <AuthSpinner size='md' className='relative' />
      </div>
    );
  }

  return <>{children}</>;
}
