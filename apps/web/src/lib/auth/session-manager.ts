import type { CredentialPersistence, PersistedAuthSession } from './credential-persistence';

export type AuthSessionPhase =
  | 'checking'
  | 'authenticated'
  | 'unauthenticated'
  | 'unavailable';

export type AuthSessionSnapshot = {
  phase: AuthSessionPhase;
  userEmail: string | null;
};

export type RefreshResult = {
  accessToken: string;
  refreshToken: string;
};

export type LoginSession = RefreshResult & {
  userEmail: string;
};

export type RefreshTransport = (refreshToken: string) => Promise<RefreshResult>;

export class SessionRefreshError extends Error {
  constructor(
    readonly kind: 'invalid' | 'temporary' | 'superseded',
    message: string,
  ) {
    super(message);
    this.name = 'SessionRefreshError';
  }
}

export function isSessionRefreshError(
  error: unknown,
  kind?: SessionRefreshError['kind'],
): error is SessionRefreshError {
  return error instanceof SessionRefreshError && (!kind || error.kind === kind);
}

type InFlightRefresh = {
  epoch: number;
  promise: Promise<string>;
};

export class AuthSessionManager {
  private accessToken: string | null = null;
  private epoch = 0;
  private hydrationPromise: Promise<AuthSessionSnapshot> | null = null;
  private inFlightRefresh: InFlightRefresh | null = null;
  private listeners = new Set<() => void>();
  private snapshot: AuthSessionSnapshot = {
    phase: 'checking',
    userEmail: null,
  };

  constructor(
    private readonly persistence: CredentialPersistence,
    private readonly refreshTransport: RefreshTransport,
  ) {}

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): AuthSessionSnapshot => this.snapshot;

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getPersistedSession(): PersistedAuthSession | null {
    return this.persistence.read();
  }

  establishSession(session: LoginSession): void {
    this.epoch += 1;
    this.inFlightRefresh = null;
    this.hydrationPromise = null;
    this.accessToken = session.accessToken;
    this.persistence.write({
      refreshToken: session.refreshToken,
      userEmail: session.userEmail,
    });
    this.publish({ phase: 'authenticated', userEmail: session.userEmail });
  }

  hydrate(): Promise<AuthSessionSnapshot> {
    if (this.hydrationPromise) return this.hydrationPromise;
    if (this.snapshot.phase === 'authenticated') {
      return Promise.resolve(this.snapshot);
    }

    const persisted = this.persistence.read();
    if (!persisted) {
      this.accessToken = null;
      this.publish({ phase: 'unauthenticated', userEmail: null });
      return Promise.resolve(this.snapshot);
    }

    this.publish({ phase: 'checking', userEmail: persisted.userEmail });
    const hydrationEpoch = this.epoch;
    const promise = this.refreshAccessToken()
      .then(() => this.snapshot)
      .catch((error: unknown) => {
        if (isSessionRefreshError(error, 'temporary') && hydrationEpoch === this.epoch) {
          this.publish({ phase: 'unavailable', userEmail: persisted.userEmail });
          return this.snapshot;
        }
        if (isSessionRefreshError(error, 'superseded')) {
          return this.snapshot;
        }
        return this.snapshot;
      })
      .finally(() => {
        if (this.hydrationPromise === promise) {
          this.hydrationPromise = null;
        }
      });

    this.hydrationPromise = promise;
    return promise;
  }

  refreshAccessToken(): Promise<string> {
    const refreshEpoch = this.epoch;
    if (this.inFlightRefresh?.epoch === refreshEpoch) {
      return this.inFlightRefresh.promise;
    }

    const promise = this.persistence
      .runExclusiveRefresh(async () => {
        const persisted = this.persistence.read();
        if (!persisted) {
          throw new SessionRefreshError('invalid', 'No refresh credential is available.');
        }

        let result: RefreshResult;
        try {
          result = await this.refreshTransport(persisted.refreshToken);
        } catch (error) {
          if (refreshEpoch !== this.epoch) {
            throw new SessionRefreshError('superseded', 'The session changed during refresh.');
          }

          if (isSessionRefreshError(error, 'invalid')) {
            this.invalidate(refreshEpoch);
          }
          throw error;
        }

        if (refreshEpoch !== this.epoch) {
          throw new SessionRefreshError('superseded', 'The session changed during refresh.');
        }

        this.accessToken = result.accessToken;
        this.persistence.write({
          refreshToken: result.refreshToken,
          userEmail: persisted.userEmail,
        });
        this.publish({ phase: 'authenticated', userEmail: persisted.userEmail });
        return result.accessToken;
      })
      .finally(() => {
        if (this.inFlightRefresh?.promise === promise) {
          this.inFlightRefresh = null;
        }
      });

    this.inFlightRefresh = { epoch: refreshEpoch, promise };
    return promise;
  }

  beginLogout(): { accessToken: string | null; refreshToken: string | null } {
    const persisted = this.persistence.read();
    const credentials = {
      accessToken: this.accessToken,
      refreshToken: persisted?.refreshToken ?? null,
    };

    this.epoch += 1;
    this.inFlightRefresh = null;
    this.hydrationPromise = null;
    this.accessToken = null;
    this.persistence.clear();
    this.publish({ phase: 'unauthenticated', userEmail: null });
    return credentials;
  }

  invalidateSession(): void {
    this.invalidate(this.epoch);
  }

  synchronizeFromPersistence(): void {
    const persisted = this.persistence.read();
    if (!persisted) {
      this.invalidate(this.epoch);
      return;
    }

    if (this.snapshot.phase === 'unauthenticated') {
      this.epoch += 1;
      this.accessToken = null;
      this.publish({ phase: 'checking', userEmail: persisted.userEmail });
      void this.hydrate();
      return;
    }

    if (persisted.userEmail !== this.snapshot.userEmail) {
      this.publish({ ...this.snapshot, userEmail: persisted.userEmail });
    }
  }

  private invalidate(expectedEpoch: number): void {
    if (expectedEpoch !== this.epoch) return;

    this.epoch += 1;
    this.inFlightRefresh = null;
    this.hydrationPromise = null;
    this.accessToken = null;
    this.persistence.clear();
    this.publish({ phase: 'unauthenticated', userEmail: null });
  }

  private publish(snapshot: AuthSessionSnapshot): void {
    if (
      snapshot.phase === this.snapshot.phase &&
      snapshot.userEmail === this.snapshot.userEmail
    ) {
      return;
    }

    this.snapshot = snapshot;
    for (const listener of this.listeners) listener();
  }
}
