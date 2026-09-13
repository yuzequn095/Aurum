import assert from 'node:assert/strict';
import test from 'node:test';
import { authenticatedFetch } from './authenticated-fetch';
import type { CredentialPersistence, PersistedAuthSession } from './credential-persistence';
import { AuthSessionManager, SessionRefreshError } from './session-manager';

function response(status: number): Response {
  return new Response(null, { status });
}

class MemoryPersistence implements CredentialPersistence {
  clearCount = 0;

  constructor(private session: PersistedAuthSession | null) {}

  read(): PersistedAuthSession | null {
    return this.session ? { ...this.session } : null;
  }

  write(session: PersistedAuthSession): void {
    this.session = { ...session };
  }

  clear(): void {
    this.clearCount += 1;
    this.session = null;
  }

  runExclusiveRefresh<T>(operation: () => Promise<T>): Promise<T> {
    return operation();
  }
}

test('six concurrent protected requests share one refresh and retry with its access token', async () => {
  const persistence = new MemoryPersistence({
    refreshToken: 'refresh-1',
    userEmail: 'demo@aurum.local',
  });
  let refreshes = 0;
  const refreshCredentials: string[] = [];
  const manager = new AuthSessionManager(persistence, async (refreshToken) => {
    refreshes += 1;
    refreshCredentials.push(refreshToken);
    return { accessToken: 'access-2', refreshToken: 'refresh-2' };
  });
  manager.establishSession({
    accessToken: 'access-1',
    refreshToken: 'refresh-1',
    userEmail: 'demo@aurum.local',
  });

  const request = () =>
    authenticatedFetch(
      async (_path, init) =>
        response(
          new Headers(init?.headers).get('Authorization') === 'Bearer access-2' ? 200 : 401,
        ),
      manager,
      '/v1/accounts',
    );
  const results = await Promise.all(Array.from({ length: 6 }, request));

  assert.ok(results.every((result) => result.status === 200));
  assert.equal(refreshes, 1);
  assert.deepEqual(refreshCredentials, ['refresh-1']);
  assert.equal(persistence.read()?.refreshToken, 'refresh-2');
});

test('a protected request retries once with the rotated access token', async () => {
  const authorizations: Array<string | null> = [];
  let requests = 0;
  let refreshes = 0;
  const session = {
    getAccessToken: () => (refreshes === 0 ? 'access-1' : 'access-2'),
    refreshAccessToken: async () => {
      refreshes += 1;
      return 'access-2';
    },
    invalidateSession: () => assert.fail('session should remain valid'),
  };

  const result = await authenticatedFetch(
    async (_path, init) => {
      requests += 1;
      authorizations.push(new Headers(init?.headers).get('Authorization'));
      return response(requests === 1 ? 401 : 200);
    },
    session,
    '/v1/accounts',
  );

  assert.equal(result.status, 200);
  assert.equal(refreshes, 1);
  assert.equal(requests, 2);
  assert.deepEqual(authorizations, ['Bearer access-1', 'Bearer access-2']);
});

test('a request retries at most once and invalidates after a second 401', async () => {
  let requests = 0;
  let invalidations = 0;
  let redirects = 0;
  const result = await authenticatedFetch(
    async () => {
      requests += 1;
      return response(401);
    },
    {
      getAccessToken: () => 'expired-access',
      refreshAccessToken: async () => 'new-access',
      invalidateSession: () => {
        invalidations += 1;
      },
    },
    '/v1/accounts',
    {},
    () => {
      redirects += 1;
    },
  );

  assert.equal(result.status, 401);
  assert.equal(requests, 2);
  assert.equal(invalidations, 1);
  assert.equal(redirects, 1);
});

test('the refresh endpoint never recursively starts refresh', async () => {
  let refreshes = 0;
  const result = await authenticatedFetch(
    async () => response(401),
    {
      getAccessToken: () => null,
      refreshAccessToken: async () => {
        refreshes += 1;
        return 'unused';
      },
      invalidateSession: () => undefined,
    },
    '/v1/auth/refresh',
  );

  assert.equal(result.status, 401);
  assert.equal(refreshes, 0);
});

test('temporary refresh failure preserves session and propagates retryable failure', async () => {
  let invalidations = 0;
  await assert.rejects(
    authenticatedFetch(
      async () => response(401),
      {
        getAccessToken: () => 'expired-access',
        refreshAccessToken: async () => {
          throw new SessionRefreshError('temporary', 'offline');
        },
        invalidateSession: () => {
          invalidations += 1;
        },
      },
      '/v1/accounts',
    ),
    { kind: 'temporary' },
  );
  assert.equal(invalidations, 0);
});
