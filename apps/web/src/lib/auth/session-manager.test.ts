import assert from 'node:assert/strict';
import test from 'node:test';
import type {
  CredentialPersistence,
  PersistedAuthSession,
} from './credential-persistence';
import {
  AuthSessionManager,
  SessionRefreshError,
  type RefreshResult,
} from './session-manager';

class MemoryPersistence implements CredentialPersistence {
  clearCount = 0;
  writeCount = 0;

  constructor(private session: PersistedAuthSession | null) {}

  read(): PersistedAuthSession | null {
    return this.session ? { ...this.session } : null;
  }

  write(session: PersistedAuthSession): void {
    this.writeCount += 1;
    this.session = { ...session };
  }

  clear(): void {
    this.clearCount += 1;
    this.session = null;
  }

  replace(session: PersistedAuthSession): void {
    this.session = { ...session };
  }

  runExclusiveRefresh<T>(operation: () => Promise<T>): Promise<T> {
    return operation();
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

const persistedSession: PersistedAuthSession = {
  refreshToken: 'refresh-1',
  userEmail: 'demo@aurum.local',
};

const rotatedSession: RefreshResult = {
  accessToken: 'access-2',
  refreshToken: 'refresh-2',
};

test('eight concurrent refresh callers share one rotation and one credential write', async () => {
  const persistence = new MemoryPersistence(persistedSession);
  const pending = deferred<RefreshResult>();
  let refreshCalls = 0;
  const manager = new AuthSessionManager(persistence, async (refreshToken) => {
    refreshCalls += 1;
    assert.equal(refreshToken, 'refresh-1');
    return pending.promise;
  });

  const callers = Array.from({ length: 8 }, () => manager.refreshAccessToken());
  pending.resolve(rotatedSession);

  assert.deepEqual(await Promise.all(callers), Array(8).fill('access-2'));
  assert.equal(refreshCalls, 1);
  assert.equal(persistence.writeCount, 1);
  assert.deepEqual(persistence.read(), {
    refreshToken: 'refresh-2',
    userEmail: 'demo@aurum.local',
  });
});

test('a failed shared refresh rejects every caller and clears once', async () => {
  const persistence = new MemoryPersistence(persistedSession);
  const pending = deferred<RefreshResult>();
  let refreshCalls = 0;
  const manager = new AuthSessionManager(persistence, async () => {
    refreshCalls += 1;
    return pending.promise;
  });

  const callers = Array.from({ length: 5 }, () => manager.refreshAccessToken());
  pending.reject(new SessionRefreshError('invalid', 'revoked'));
  const results = await Promise.allSettled(callers);

  assert.equal(refreshCalls, 1);
  assert.equal(persistence.clearCount, 1);
  assert.ok(results.every((result) => result.status === 'rejected'));
  assert.deepEqual(manager.getSnapshot(), { phase: 'unauthenticated', userEmail: null });
});

test('hydration without a refresh credential becomes unauthenticated without a request', async () => {
  const persistence = new MemoryPersistence(null);
  let refreshCalls = 0;
  const manager = new AuthSessionManager(persistence, async () => {
    refreshCalls += 1;
    return rotatedSession;
  });

  assert.deepEqual(await manager.hydrate(), { phase: 'unauthenticated', userEmail: null });
  assert.equal(refreshCalls, 0);
});

test('hydration validates and rotates a persisted credential before authentication', async () => {
  const persistence = new MemoryPersistence(persistedSession);
  const manager = new AuthSessionManager(persistence, async () => rotatedSession);

  assert.deepEqual(await manager.hydrate(), {
    phase: 'authenticated',
    userEmail: 'demo@aurum.local',
  });
  assert.equal(manager.getAccessToken(), 'access-2');
  assert.equal(persistence.read()?.refreshToken, 'refresh-2');
});

test('invalid hydration clears the persisted session', async () => {
  const persistence = new MemoryPersistence(persistedSession);
  const manager = new AuthSessionManager(persistence, async () => {
    throw new SessionRefreshError('invalid', 'invalid');
  });

  assert.deepEqual(await manager.hydrate(), { phase: 'unauthenticated', userEmail: null });
  assert.equal(persistence.clearCount, 1);
});

test('temporary hydration failure preserves the credential and exposes retryable state', async () => {
  const persistence = new MemoryPersistence(persistedSession);
  const manager = new AuthSessionManager(persistence, async () => {
    throw new SessionRefreshError('temporary', 'offline');
  });

  assert.deepEqual(await manager.hydrate(), {
    phase: 'unavailable',
    userEmail: 'demo@aurum.local',
  });
  assert.deepEqual(persistence.read(), persistedSession);
  assert.equal(persistence.clearCount, 0);
});

test('a refresh response arriving after logout cannot resurrect the session', async () => {
  const persistence = new MemoryPersistence(persistedSession);
  const pending = deferred<RefreshResult>();
  const manager = new AuthSessionManager(persistence, async () => pending.promise);

  const refresh = manager.refreshAccessToken();
  manager.beginLogout();
  pending.resolve(rotatedSession);

  await assert.rejects(refresh, { kind: 'superseded' });
  assert.deepEqual(manager.getSnapshot(), { phase: 'unauthenticated', userEmail: null });
  assert.equal(manager.getAccessToken(), null);
  assert.equal(persistence.read(), null);
});

test('an old refresh cannot overwrite a newer login', async () => {
  const persistence = new MemoryPersistence(persistedSession);
  const pending = deferred<RefreshResult>();
  const manager = new AuthSessionManager(persistence, async () => pending.promise);

  const oldRefresh = manager.refreshAccessToken();
  manager.beginLogout();
  manager.establishSession({
    accessToken: 'access-new-login',
    refreshToken: 'refresh-new-login',
    userEmail: 'new@aurum.local',
  });
  pending.resolve(rotatedSession);

  await assert.rejects(oldRefresh, { kind: 'superseded' });
  assert.equal(manager.getAccessToken(), 'access-new-login');
  assert.deepEqual(persistence.read(), {
    refreshToken: 'refresh-new-login',
    userEmail: 'new@aurum.local',
  });
});

test('an A to B persisted-account change clears A access and rehydrates B', async () => {
  const persistence = new MemoryPersistence(null);
  const pendingA = deferred<RefreshResult>();
  const pendingB = deferred<RefreshResult>();
  const manager = new AuthSessionManager(persistence, async (refreshToken) => {
    if (refreshToken === 'refresh-a') return pendingA.promise;
    if (refreshToken === 'refresh-b') return pendingB.promise;
    return assert.fail(`Unexpected refresh token: ${refreshToken}`);
  });

  manager.establishSession({
    accessToken: 'access-a',
    refreshToken: 'refresh-a',
    userEmail: 'account-a@aurum.local',
  });
  const staleARefresh = assert.rejects(manager.refreshAccessToken(), {
    kind: 'superseded',
  });
  persistence.replace({
    refreshToken: 'refresh-b',
    userEmail: 'account-b@aurum.local',
  });

  manager.synchronizeFromPersistence();

  assert.equal(manager.getAccessToken(), null);
  assert.deepEqual(manager.getSnapshot(), {
    phase: 'checking',
    userEmail: 'account-b@aurum.local',
  });

  pendingA.resolve({
    accessToken: 'access-a-rotated',
    refreshToken: 'refresh-a-rotated',
  });
  await staleARefresh;
  assert.equal(manager.getAccessToken(), null);
  assert.deepEqual(persistence.read(), {
    refreshToken: 'refresh-b',
    userEmail: 'account-b@aurum.local',
  });

  pendingB.resolve({
    accessToken: 'access-b',
    refreshToken: 'refresh-b-rotated',
  });

  assert.deepEqual(await manager.hydrate(), {
    phase: 'authenticated',
    userEmail: 'account-b@aurum.local',
  });
  assert.equal(manager.getAccessToken(), 'access-b');
  assert.deepEqual(persistence.read(), {
    refreshToken: 'refresh-b-rotated',
    userEmail: 'account-b@aurum.local',
  });
});
