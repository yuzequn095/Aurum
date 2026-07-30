export type MobileRuntimeMode = 'debug' | 'release';

export interface MobileRuntimeConfig {
  mode: MobileRuntimeMode;
  url: string;
  origin: string;
}

export function requireMobileRuntimeConfig(env?: NodeJS.ProcessEnv): Readonly<MobileRuntimeConfig>;

export function optionalMobileRuntimeConfig(
  env?: NodeJS.ProcessEnv,
): Readonly<MobileRuntimeConfig> | null;
