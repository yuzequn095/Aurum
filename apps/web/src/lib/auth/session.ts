'use client';

import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { fetchWithFallback } from '@/lib/api-transport';
import {
  authChangeEvent,
  browserCredentialPersistence,
  isAuthStorageEvent,
} from '@/lib/auth/credential-persistence';
import {
  AuthSessionManager,
  SessionRefreshError,
  type AuthSessionSnapshot,
  type LoginSession,
  type RefreshResult,
} from '@/lib/auth/session-manager';

const SERVER_SNAPSHOT: AuthSessionSnapshot = {
  phase: 'checking',
  userEmail: null,
};

async function refreshSession(refreshToken: string): Promise<RefreshResult> {
  let response: Response;
  try {
    response = await fetchWithFallback('/v1/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    throw new SessionRefreshError('temporary', 'Aurum could not verify the session right now.');
  }

  if (!response.ok) {
    if (response.status >= 400 && response.status < 500) {
      throw new SessionRefreshError('invalid', 'The Aurum session is no longer valid.');
    }
    throw new SessionRefreshError('temporary', 'Aurum could not verify the session right now.');
  }

  let payload: Partial<RefreshResult>;
  try {
    payload = (await response.json()) as Partial<RefreshResult>;
  } catch {
    throw new SessionRefreshError('temporary', 'Aurum returned an unreadable session response.');
  }

  if (!payload.accessToken || !payload.refreshToken) {
    throw new SessionRefreshError('temporary', 'Aurum returned an incomplete session response.');
  }

  return {
    accessToken: payload.accessToken,
    refreshToken: payload.refreshToken,
  };
}

const authSessionManager = new AuthSessionManager(
  browserCredentialPersistence,
  refreshSession,
);

if (typeof window !== 'undefined') {
  browserCredentialPersistence.removeUnusedCopies();
}

export function getAuthSessionManager(): AuthSessionManager {
  return authSessionManager;
}

export function establishAuthSession(session: LoginSession): void {
  authSessionManager.establishSession(session);
}

export function retryAuthHydration(): Promise<AuthSessionSnapshot> {
  return authSessionManager.hydrate();
}

type AuthSessionState = AuthSessionSnapshot & {
  isHydrated: boolean;
  isAuthenticated: boolean;
  isUnavailable: boolean;
  retryHydration(): Promise<AuthSessionSnapshot>;
};

function subscribe(listener: () => void): () => void {
  const unsubscribeManager = authSessionManager.subscribe(listener);

  if (typeof window === 'undefined') return unsubscribeManager;

  const onStorage = (event: StorageEvent) => {
    if (isAuthStorageEvent(event)) authSessionManager.synchronizeFromPersistence();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(authChangeEvent, listener);
  return () => {
    unsubscribeManager();
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(authChangeEvent, listener);
  };
}

export function useAuthSession(): AuthSessionState {
  const snapshot = useSyncExternalStore(
    subscribe,
    authSessionManager.getSnapshot,
    () => SERVER_SNAPSHOT,
  );

  useEffect(() => {
    void authSessionManager.hydrate();
  }, []);

  return useMemo(
    () => ({
      ...snapshot,
      isHydrated: snapshot.phase !== 'checking',
      isAuthenticated: snapshot.phase === 'authenticated',
      isUnavailable: snapshot.phase === 'unavailable',
      retryHydration: retryAuthHydration,
    }),
    [snapshot],
  );
}
