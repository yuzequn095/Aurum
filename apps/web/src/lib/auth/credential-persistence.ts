export type PersistedAuthSession = {
  refreshToken: string;
  userEmail: string;
};

export interface CredentialPersistence {
  read(): PersistedAuthSession | null;
  write(session: PersistedAuthSession): void;
  clear(): void;
  runExclusiveRefresh<T>(operation: () => Promise<T>): Promise<T>;
}

const SESSION_KEY = 'aurum.authSession';
const LEGACY_REFRESH_TOKEN_KEY = 'aurum.refreshToken';
const LEGACY_USER_EMAIL_KEY = 'aurum.userEmail';
const LEGACY_ACCESS_TOKEN_KEY = 'aurum.accessToken';
const AUTH_CHANGE_EVENT = 'aurum-auth-change';
const REFRESH_LOCK_NAME = 'aurum-auth-refresh';

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function notifyAuthChanged(): void {
  if (isBrowser()) {
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  }
}

function removeLegacyCookie(name: string): void {
  if (typeof document !== 'undefined') {
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
  }
}

export class BrowserCredentialPersistence implements CredentialPersistence {
  read(): PersistedAuthSession | null {
    if (!isBrowser()) return null;

    const serialized = window.localStorage.getItem(SESSION_KEY);
    if (serialized) {
      try {
        const parsed = JSON.parse(serialized) as Partial<PersistedAuthSession>;
        if (parsed.refreshToken && parsed.userEmail) {
          return { refreshToken: parsed.refreshToken, userEmail: parsed.userEmail };
        }
      } catch {
        // A malformed entry is treated as absent and cleared by invalidation/logout.
      }
    }

    const refreshToken = window.localStorage.getItem(LEGACY_REFRESH_TOKEN_KEY);
    const userEmail = window.localStorage.getItem(LEGACY_USER_EMAIL_KEY);
    if (!refreshToken || !userEmail) return null;

    return { refreshToken, userEmail };
  }

  write(session: PersistedAuthSession): void {
    if (!isBrowser()) return;

    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    this.removeLegacySessionCopies();
    this.removeUnusedCopies();
    notifyAuthChanged();
  }

  clear(): void {
    if (!isBrowser()) return;

    window.localStorage.removeItem(SESSION_KEY);
    this.removeLegacySessionCopies();
    this.removeUnusedCopies();
    notifyAuthChanged();
  }

  async runExclusiveRefresh<T>(operation: () => Promise<T>): Promise<T> {
    if (typeof navigator !== 'undefined' && navigator.locks) {
      return navigator.locks.request(REFRESH_LOCK_NAME, operation);
    }

    return operation();
  }

  removeUnusedCopies(): void {
    if (isBrowser()) {
      window.localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
    }
    removeLegacyCookie('aurum_access_token');
    removeLegacyCookie('aurum_refresh_token');
  }

  private removeLegacySessionCopies(): void {
    if (!isBrowser()) return;
    window.localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
    window.localStorage.removeItem(LEGACY_USER_EMAIL_KEY);
  }
}

export const browserCredentialPersistence = new BrowserCredentialPersistence();
export const authChangeEvent = AUTH_CHANGE_EVENT;

export function isAuthStorageEvent(event: StorageEvent): boolean {
  return event.key === null || event.key === SESSION_KEY;
}
