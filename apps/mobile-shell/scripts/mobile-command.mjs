import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { buildMobileAssets } from './build-assets.mjs';
import { loadMobileEnv, mobileShellRoot } from './mobile-env.mjs';
import { requireMobileRuntimeConfig } from './runtime-url.mjs';

function fail(message) {
  console.error(`Aurum mobile command failed: ${message}`);
  process.exitCode = 1;
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: mobileShellRoot,
    encoding: 'utf8',
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} exited with ${result.status}.`);
  }
}

function requireMacOs(action) {
  if (process.platform !== 'darwin') {
    throw new Error(
      `${action} requires macOS and Xcode. Current platform is ${process.platform}; move this checkout to a Mac.`,
    );
  }
}

function requireIosProject() {
  const iosDirectory = path.join(mobileShellRoot, 'ios');
  if (!existsSync(iosDirectory)) {
    throw new Error('apps/mobile-shell/ios is missing. Run "pnpm mobile:add:ios" on a Mac first.');
  }
}

function runCapacitor(args) {
  run('pnpm', ['exec', 'cap', ...args]);
}

async function main() {
  loadMobileEnv();
  const command = process.argv[2];

  if (!['add', 'check', 'doctor', 'open', 'prepare', 'sync'].includes(command)) {
    throw new Error('expected one of: check, prepare, add, sync, open, or doctor.');
  }

  const runtime = requireMobileRuntimeConfig(process.env);
  console.log(`Validated ${runtime.mode} mobile origin ${runtime.origin}.`);

  if (command === 'check') {
    return;
  }

  if (command === 'prepare') {
    await buildMobileAssets();
    return;
  }

  requireMacOs(`mobile:${command}`);

  if (command === 'add') {
    const iosDirectory = path.join(mobileShellRoot, 'ios');
    if (existsSync(iosDirectory)) {
      throw new Error('apps/mobile-shell/ios already exists; use "pnpm mobile:sync:ios".');
    }
    await buildMobileAssets();
    runCapacitor(['add', 'ios']);
    return;
  }

  requireIosProject();

  if (command === 'sync') {
    await buildMobileAssets();
    runCapacitor(['sync', 'ios']);
    return;
  }

  if (command === 'open') {
    runCapacitor(['open', 'ios']);
    return;
  }

  run('xcodebuild', ['-version']);
  run('pod', ['--version']);
  runCapacitor(['doctor']);
}

try {
  await main();
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
