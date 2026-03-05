'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { getRefreshToken, getUserEmail } from '@/lib/auth/tokens';

type AuthSessionState = {
  isHydrated: boolean;
  isAuthenticated: boolean;
  refreshToken: string | null;
  userEmail: string | null;
};

function subscribe(onStoreChange: () => void) {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  window.addEventListener('storage', onStoreChange);
  window.addEventListener('aurum-auth-change', onStoreChange);
  return () => {
    window.removeEventListener('storage', onStoreChange);
    window.removeEventListener('aurum-auth-change', onStoreChange);
  };
}

export function useAuthSession(): AuthSessionState {
  const refreshToken = useSyncExternalStore(subscribe, getRefreshToken, () => null);
  const userEmail = useSyncExternalStore(subscribe, getUserEmail, () => null);
  const isHydrated = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  return useMemo(
    () => ({
      isHydrated,
      refreshToken,
      userEmail,
      isAuthenticated: Boolean(refreshToken),
    }),
    [isHydrated, refreshToken, userEmail],
  );
}
