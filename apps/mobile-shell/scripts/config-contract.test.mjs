import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import { mobileShellRoot } from './mobile-env.mjs';

test('Capacitor config keeps the 17B navigation and outage boundaries', async () => {
  const configSource = await readFile(path.join(mobileShellRoot, 'capacitor.config.ts'), 'utf8');

  assert.match(configSource, /appId: 'dev\.aurum\.mobile\.foundation'/u);
  assert.match(configSource, /appName: 'Aurum 17B Foundation'/u);
  assert.match(configSource, /webDir: 'dist'/u);
  assert.match(configSource, /errorPath: 'error\.html'/u);
  assert.match(configSource, /cleartext: false/u);
  assert.doesNotMatch(configSource, /allowNavigation/u);
});

test('mobile shell defines no custom native bridge or financial storage', async () => {
  const packageSource = await readFile(path.join(mobileShellRoot, 'package.json'), 'utf8');

  assert.doesNotMatch(packageSource, /keychain|preferences|secure-storage|community\/http/iu);
});
