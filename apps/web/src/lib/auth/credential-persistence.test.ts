import assert from 'node:assert/strict';
import test from 'node:test';
import { BrowserCredentialPersistence } from './credential-persistence';

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

test('legacy sessions migrate without retaining access-token or cookie duplication', () => {
  const storage = new MemoryStorage();
  storage.setItem('aurum.accessToken', 'legacy-access');
  storage.setItem('aurum.refreshToken', 'legacy-refresh');
  storage.setItem('aurum.userEmail', 'demo@aurum.local');
  const cookieWrites: string[] = [];

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      localStorage: storage,
      dispatchEvent: () => true,
    },
  });
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      set cookie(value: string) {
        cookieWrites.push(value);
      },
    },
  });

  try {
    const persistence = new BrowserCredentialPersistence();
    persistence.removeUnusedCopies();

    assert.equal(storage.getItem('aurum.accessToken'), null);
    assert.deepEqual(persistence.read(), {
      refreshToken: 'legacy-refresh',
      userEmail: 'demo@aurum.local',
    });

    persistence.write({
      refreshToken: 'rotated-refresh',
      userEmail: 'demo@aurum.local',
    });

    assert.equal(storage.getItem('aurum.refreshToken'), null);
    assert.equal(storage.getItem('aurum.userEmail'), null);
    assert.deepEqual(JSON.parse(storage.getItem('aurum.authSession') ?? '{}'), {
      refreshToken: 'rotated-refresh',
      userEmail: 'demo@aurum.local',
    });
    assert.ok(cookieWrites.every((cookie) => cookie.includes('Max-Age=0')));
  } finally {
    Reflect.deleteProperty(globalThis, 'window');
    Reflect.deleteProperty(globalThis, 'document');
  }
});
