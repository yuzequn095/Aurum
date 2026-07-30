import type { CapacitorConfig } from '@capacitor/cli';

import { loadMobileEnv } from './scripts/mobile-env.mjs';
import { requireMobileRuntimeConfig } from './scripts/runtime-url.mjs';

loadMobileEnv();

const runtime = requireMobileRuntimeConfig(process.env);

const config: CapacitorConfig = {
  appId: 'dev.aurum.mobile.foundation',
  appName: 'Aurum 17B Foundation',
  webDir: 'dist',
  loggingBehavior: runtime.mode === 'debug' ? 'debug' : 'none',
  server: {
    url: runtime.url,
    cleartext: false,
    errorPath: 'error.html',
  },
  ios: {
    allowsLinkPreview: false,
    preferredContentMode: 'mobile',
    webContentsDebuggingEnabled: runtime.mode === 'debug',
  },
};

export default config;
