import { isIP } from 'node:net';

const RESERVED_DOMAIN_SUFFIXES = ['.example', '.invalid', '.local', '.localhost', '.test'];

function configurationError(message) {
  return new Error(`Invalid Aurum mobile runtime configuration: ${message}`);
}

function normalizeHostname(hostname) {
  return hostname
    .toLowerCase()
    .replace(/^\[|\]$/gu, '')
    .replace(/\.$/u, '');
}

function isPrivateIpv4(hostname) {
  const octets = hostname.split('.').map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet))) {
    return true;
  }

  const [first, second, third] = octets;

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 0 && third === 0) ||
    (first === 192 && second === 0 && third === 2) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19)) ||
    (first === 198 && second === 51 && third === 100) ||
    (first === 203 && second === 0 && third === 113) ||
    first >= 224
  );
}

function isPrivateIpv6(hostname) {
  const normalized = hostname.toLowerCase();

  return (
    normalized === '::' ||
    normalized === '::1' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    /^fe[89ab]/u.test(normalized) ||
    normalized.startsWith('2001:db8:')
  );
}

function isPublicReleaseHostname(hostname) {
  const normalized = normalizeHostname(hostname);

  if (
    normalized === '' ||
    normalized === 'localhost' ||
    normalized.endsWith('.internal') ||
    RESERVED_DOMAIN_SUFFIXES.some(
      (suffix) => normalized === suffix.slice(1) || normalized.endsWith(suffix),
    )
  ) {
    return false;
  }

  const ipVersion = isIP(normalized);
  if (ipVersion === 4) {
    return !isPrivateIpv4(normalized);
  }
  if (ipVersion === 6) {
    return !isPrivateIpv6(normalized);
  }

  return normalized.includes('.');
}

function parseHttpsUrl(rawValue, variableName) {
  if (!rawValue || rawValue.trim() === '') {
    throw configurationError(`${variableName} is required.`);
  }

  let url;
  try {
    url = new URL(rawValue);
  } catch {
    throw configurationError(`${variableName} must be an absolute URL.`);
  }

  if (url.protocol !== 'https:') {
    throw configurationError(`${variableName} must use HTTPS.`);
  }
  if (url.username !== '' || url.password !== '') {
    throw configurationError(`${variableName} must not contain credentials.`);
  }
  if (url.search !== '' || url.hash !== '') {
    throw configurationError(`${variableName} must not contain a query or fragment.`);
  }

  return url;
}

function parseMode(rawMode) {
  if (rawMode !== 'debug' && rawMode !== 'release') {
    throw configurationError('AURUM_MOBILE_MODE must be exactly "debug" or "release".');
  }

  return rawMode;
}

export function requireMobileRuntimeConfig(env = process.env) {
  const mode = parseMode(env.AURUM_MOBILE_MODE);
  const runtimeUrl = parseHttpsUrl(env.AURUM_MOBILE_WEB_URL, 'AURUM_MOBILE_WEB_URL');

  if (mode === 'release') {
    if (!isPublicReleaseHostname(runtimeUrl.hostname)) {
      throw configurationError(
        'release AURUM_MOBILE_WEB_URL must use a public, non-loopback hostname.',
      );
    }

    const trustedOriginUrl = parseHttpsUrl(
      env.AURUM_MOBILE_TRUSTED_ORIGIN,
      'AURUM_MOBILE_TRUSTED_ORIGIN',
    );

    if (trustedOriginUrl.pathname !== '/' || trustedOriginUrl.origin !== runtimeUrl.origin) {
      throw configurationError(
        'AURUM_MOBILE_TRUSTED_ORIGIN must be the exact origin of AURUM_MOBILE_WEB_URL.',
      );
    }
  }

  return Object.freeze({
    mode,
    url: runtimeUrl.href,
    origin: runtimeUrl.origin,
  });
}

export function optionalMobileRuntimeConfig(env = process.env) {
  const hasMode = Boolean(env.AURUM_MOBILE_MODE?.trim());
  const hasUrl = Boolean(env.AURUM_MOBILE_WEB_URL?.trim());
  const hasTrustedOrigin = Boolean(env.AURUM_MOBILE_TRUSTED_ORIGIN?.trim());

  if (!hasMode && !hasUrl && !hasTrustedOrigin) {
    return null;
  }

  return requireMobileRuntimeConfig(env);
}
