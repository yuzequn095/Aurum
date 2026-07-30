import { readdirSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { mobileShellRoot } from './mobile-env.mjs';

const sourceFiles = [
  ...readdirSync(path.join(mobileShellRoot, 'scripts'))
    .filter((fileName) => fileName.endsWith('.mjs'))
    .map((fileName) => path.join('scripts', fileName)),
  ...readdirSync(path.join(mobileShellRoot, 'src'))
    .filter((fileName) => fileName.endsWith('.js'))
    .map((fileName) => path.join('src', fileName)),
];

for (const sourceFile of sourceFiles) {
  const result = spawnSync(process.execPath, ['--check', sourceFile], {
    cwd: mobileShellRoot,
    encoding: 'utf8',
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(`Syntax-checked ${sourceFiles.length} mobile-shell JavaScript files.`);
