import assert from 'node:assert/strict';
import test from 'node:test';

import { optionalMobileRuntimeConfig, requireMobileRuntimeConfig } from './runtime-url.mjs';

test('accepts an HTTPS debug endpoint, including loopback', () => {
  const config = requireMobileRuntimeConfig({
    AURUM_MOBILE_MODE: 'debug',
    AURUM_MOBILE_WEB_URL: 'https://localhost:3000/mobile',
  });

  assert.equal(config.mode, 'debug');
  assert.equal(config.url, 'https://localhost:3000/mobile');
  assert.equal(config.origin, 'https://localhost:3000');
});

test('accepts a public release URL only with its exact trusted origin', () => {
  const config = requireMobileRuntimeConfig({
    AURUM_MOBILE_MODE: 'release',
    AURUM_MOBILE_WEB_URL: 'https://app.aurum.example.org/mobile',
    AURUM_MOBILE_TRUSTED_ORIGIN: 'https://app.aurum.example.org',
  });

  assert.equal(config.mode, 'release');
  assert.equal(config.origin, 'https://app.aurum.example.org');
});

for (const invalidReleaseUrl of [
  'https://localhost:3000',
  'https://127.0.0.1',
  'https://10.0.0.8',
  'https://172.20.0.3',
  'https://192.168.1.12',
  'https://aurum.local',
  'https://preview.example',
]) {
  test(`rejects non-public release endpoint ${invalidReleaseUrl}`, () => {
    assert.throws(
      () =>
        requireMobileRuntimeConfig({
          AURUM_MOBILE_MODE: 'release',
          AURUM_MOBILE_WEB_URL: invalidReleaseUrl,
          AURUM_MOBILE_TRUSTED_ORIGIN: new URL(invalidReleaseUrl).origin,
        }),
      /public, non-loopback hostname/u,
    );
  });
}

test('rejects HTTP in both debug and release modes', () => {
  for (const mode of ['debug', 'release']) {
    assert.throws(
      () =>
        requireMobileRuntimeConfig({
          AURUM_MOBILE_MODE: mode,
          AURUM_MOBILE_WEB_URL: 'http://192.168.1.10:3000',
          AURUM_MOBILE_TRUSTED_ORIGIN: 'http://192.168.1.10:3000',
        }),
      /must use HTTPS/u,
    );
  }
});

test('rejects release config without an explicit trusted origin', () => {
  assert.throws(
    () =>
      requireMobileRuntimeConfig({
        AURUM_MOBILE_MODE: 'release',
        AURUM_MOBILE_WEB_URL: 'https://app.aurum.example.org',
      }),
    /AURUM_MOBILE_TRUSTED_ORIGIN is required/u,
  );
});

test('rejects a mismatched release trusted origin', () => {
  assert.throws(
    () =>
      requireMobileRuntimeConfig({
        AURUM_MOBILE_MODE: 'release',
        AURUM_MOBILE_WEB_URL: 'https://app.aurum.example.org',
        AURUM_MOBILE_TRUSTED_ORIGIN: 'https://other.aurum.example.org',
      }),
    /must be the exact origin/u,
  );
});

test('rejects embedded URL credentials and URL fragments', () => {
  assert.throws(
    () =>
      requireMobileRuntimeConfig({
        AURUM_MOBILE_MODE: 'debug',
        AURUM_MOBILE_WEB_URL: 'https://user:password@example.org',
      }),
    /must not contain credentials/u,
  );

  assert.throws(
    () =>
      requireMobileRuntimeConfig({
        AURUM_MOBILE_MODE: 'debug',
        AURUM_MOBILE_WEB_URL: 'https://example.org/#debug',
      }),
    /must not contain a query or fragment/u,
  );
});

test('returns null only when no mobile runtime variables are present', () => {
  assert.equal(optionalMobileRuntimeConfig({}), null);
  assert.throws(
    () => optionalMobileRuntimeConfig({ AURUM_MOBILE_MODE: 'debug' }),
    /AURUM_MOBILE_WEB_URL is required/u,
  );
});
