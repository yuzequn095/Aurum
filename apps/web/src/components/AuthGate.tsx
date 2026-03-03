'use client';

import { usePathname, useRouter } from 'next/navigation';
import { PropsWithChildren, useEffect } from 'react';
import { getRefreshToken } from '@/lib/auth/tokens';

export function AuthGate({ children }: PropsWithChildren) {
  const router = useRouter();
  const pathname = usePathname();
  const refreshToken = getRefreshToken();

  useEffect(() => {
    if (!refreshToken) {
      const next = pathname ? `?next=${encodeURIComponent(pathname)}` : '';
      router.replace(`/login${next}`);
    }
  }, [pathname, refreshToken, router]);

  if (!refreshToken) {
    return null;
  }

  return <>{children}</>;
}
