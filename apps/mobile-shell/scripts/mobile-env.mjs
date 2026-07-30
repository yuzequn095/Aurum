import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));

export const mobileShellRoot = path.resolve(moduleDirectory, '..');

function parseValue(rawValue, lineNumber) {
  const value = rawValue.trim();

  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];

    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return value.slice(1, -1);
    }
  }

  if (value.startsWith('"') || value.startsWith("'")) {
    throw new Error(`.env.mobile.local line ${lineNumber} has an unterminated quoted value.`);
  }

  return value;
}

export function loadMobileEnv({
  env = process.env,
  filePath = path.join(mobileShellRoot, '.env.mobile.local'),
  override = false,
} = {}) {
  if (!existsSync(filePath)) {
    return { loaded: false, filePath };
  }

  const lines = readFileSync(filePath, 'utf8')
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/u);

  for (const [index, originalLine] of lines.entries()) {
    const line = originalLine.trim();

    if (line === '' || line.startsWith('#')) {
      continue;
    }

    const assignment = line.startsWith('export ') ? line.slice(7).trim() : line;
    const separator = assignment.indexOf('=');

    if (separator < 1) {
      throw new Error(`.env.mobile.local line ${index + 1} must use KEY=value syntax.`);
    }

    const key = assignment.slice(0, separator).trim();
    if (!/^[A-Z_][A-Z0-9_]*$/u.test(key)) {
      throw new Error(`.env.mobile.local line ${index + 1} has an invalid variable name.`);
    }

    if (override || env[key] === undefined) {
      env[key] = parseValue(assignment.slice(separator + 1), index + 1);
    }
  }

  return { loaded: true, filePath };
}
