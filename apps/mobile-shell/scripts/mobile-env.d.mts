export const mobileShellRoot: string;

export function loadMobileEnv(options?: {
  env?: NodeJS.ProcessEnv;
  filePath?: string;
  override?: boolean;
}): {
  loaded: boolean;
  filePath: string;
};
