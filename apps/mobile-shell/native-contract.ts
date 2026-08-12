export const AURUM_NATIVE_IDENTITY = {
  bundleIdentifier: 'io.github.yuzequn095.aurum',
  displayName: 'Aurum',
  shellVersion: '1.0.0',
} as const;

export const AURUM_NATIVE_CAPABILITY_CONTRACT = {
  bridgeVersion: 1,
  shellVersion: AURUM_NATIVE_IDENTITY.shellVersion,
  platform: 'ios',
  capabilities: [],
} as const;

export type AurumNativeCapabilities = typeof AURUM_NATIVE_CAPABILITY_CONTRACT;
