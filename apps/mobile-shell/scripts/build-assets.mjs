import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadMobileEnv, mobileShellRoot } from './mobile-env.mjs';
import { optionalMobileRuntimeConfig } from './runtime-url.mjs';

const sourceDirectory = path.join(mobileShellRoot, 'src');
const outputDirectory = path.join(mobileShellRoot, 'dist');

export async function buildMobileAssets() {
  loadMobileEnv();
  const runtime = optionalMobileRuntimeConfig(process.env);

  await rm(outputDirectory, { force: true, recursive: true });
  await mkdir(outputDirectory, { recursive: true });

  for (const fileName of ['bootstrap.js', 'error.html', 'error.js', 'index.html', 'styles.css']) {
    await cp(path.join(sourceDirectory, fileName), path.join(outputDirectory, fileName));
  }

  const publicRuntime = runtime
    ? { mode: runtime.mode, origin: runtime.origin, url: runtime.url }
    : null;

  await writeFile(
    path.join(outputDirectory, 'runtime-config.js'),
    `globalThis.__AURUM_MOBILE_RUNTIME__ = ${JSON.stringify(publicRuntime)};\n`,
    'utf8',
  );

  console.log(
    runtime
      ? `Built mobile shell assets for ${runtime.mode} origin ${runtime.origin}.`
      : 'Built generic mobile shell assets without a remote runtime URL.',
  );
}

const invokedFile = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedFile === fileURLToPath(import.meta.url)) {
  await buildMobileAssets();
}
