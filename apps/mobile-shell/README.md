# Aurum mobile shell (Milestone 17B)

This package is the bounded Capacitor foundation selected by the accepted
Milestone 17 architecture decision. It loads the existing Aurum web application
from one explicitly configured HTTPS origin. It does not contain financial
domain logic, authentication, secure storage, a native network client, or a
custom native bridge.

## Toolchain

- Node.js 20 (the repository baseline)
- pnpm 9
- Capacitor 7.6.8
- macOS with Xcode 16 or newer and CocoaPods for iOS project generation,
  simulator work, and device validation

Capacitor is deliberately pinned to the latest 7.x release because Capacitor 7
supports Node 20. Upgrading to Capacitor 8 is deferred until the repository
adopts that release's newer Node and Xcode requirements.

## Configure the runtime

Copy `mobile.env.example` to `.env.mobile.local` in this directory. The local
file is already covered by the repository's `apps/*/.env.*.local` ignore rule.
Never commit tunnel URLs or environment-specific release values.

Required variables:

| Variable                      | Debug                                                       | Release                                                                         |
| ----------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `AURUM_MOBILE_MODE`           | `debug`                                                     | `release`                                                                       |
| `AURUM_MOBILE_WEB_URL`        | Explicit HTTPS URL; a temporary HTTPS tunnel is recommended | Explicit public HTTPS URL; loopback, LAN, reserved, empty, and HTTP values fail |
| `AURUM_MOBILE_TRUSTED_ORIGIN` | Not used                                                    | Required; must exactly equal the runtime URL origin                             |

The 17B foundation rejects HTTP in both modes. This avoids adding a broad iOS
App Transport Security exception. A temporary HTTPS tunnel is the supported
debug path when the web server runs on a developer machine.

The provisional bundle identifier is `dev.aurum.mobile.foundation`, and the
provisional display name is `Aurum 17B Foundation`. Milestone 17C must replace
both with the durable app identity and signing configuration.

## Commands

Run these from the repository root:

```text
pnpm mobile:check
pnpm mobile:build
pnpm mobile:prepare
pnpm mobile:add:ios
pnpm mobile:sync:ios
pnpm mobile:open:ios
pnpm mobile:doctor
```

`mobile:build` can produce generic local assets without a configured remote
URL, so the normal monorepo build remains cross-platform. `mobile:prepare`,
`mobile:check`, and every native command require a valid local mobile
configuration.

`mobile:add:ios`, `mobile:sync:ios`, `mobile:open:ios`, and `mobile:doctor`
fail with an explicit message outside macOS. On a Mac, generate the native
project once with `pnpm mobile:add:ios`, then commit the generated `ios/`
directory after reviewing it. Use `mobile:sync:ios` whenever the shell assets
or Capacitor configuration change.

## Navigation and failure boundaries

- The configured server origin is the only trusted in-webview origin.
- `allowNavigation` is intentionally absent. Capacitor therefore keeps regular
  external HTTP(S) destinations out of the webview and opens them externally.
- No custom URL scheme or JavaScript-to-native bridge is registered.
- `mailto:` and other unsupported/custom schemes require simulator and physical
  device verification before Aurum can claim a final navigation policy.
- Capacitor's supported `server.errorPath` points to the bundled
  `error.html`. It contains only branding, a connection message, a retry
  action, and a non-sensitive diagnostic code.
- The generated retry target is the same validated runtime URL embedded during
  `mobile:prepare`/`mobile:sync:ios`; it is not user-controlled and contains no
  secret.

## Scope boundary

Do not add final authentication, Keychain storage, cookie/token handling,
provider OAuth, financial state, background refresh, or a native API client in
17B. Those decisions belong to the later Milestone 17 phases described in the
architecture decision.
