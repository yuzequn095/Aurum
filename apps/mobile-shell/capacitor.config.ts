import type { CapacitorConfig } from '@capacitor/cli';

import {
  AURUM_NATIVE_CAPABILITY_CONTRACT,
  AURUM_NATIVE_IDENTITY,
} from './native-contract.ts';
import { loadMobileEnv } from './scripts/mobile-env.mjs';
import { requireMobileRuntimeConfig } from './scripts/runtime-url.mjs';

loadMobileEnv();

const runtime = requireMobileRuntimeConfig(process.env);

const config: CapacitorConfig = {
  appId: AURUM_NATIVE_IDENTITY.bundleIdentifier,
  appName: AURUM_NATIVE_IDENTITY.displayName,
  webDir: 'dist',
  loggingBehavior: runtime.mode === 'debug' ? 'debug' : 'none',
  server: {
    url: runtime.url,
    cleartext: false,
    errorPath: 'error.html',
  },
  plugins: {
    AurumBuildContract: {
      mode: runtime.mode,
      trustedOrigin: runtime.origin,
      bridgeVersion: AURUM_NATIVE_CAPABILITY_CONTRACT.bridgeVersion,
      shellVersion: AURUM_NATIVE_CAPABILITY_CONTRACT.shellVersion,
    },
  },
  ios: {
    allowsLinkPreview: false,
    contentInset: 'never',
    preferredContentMode: 'mobile',
    webContentsDebuggingEnabled: runtime.mode === 'debug',
  },
};

export default config;
