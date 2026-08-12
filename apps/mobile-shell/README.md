# Aurum mobile shell

This package is the bounded Capacitor shell selected by the Milestone 17
architecture decision. It loads the existing Aurum web application from one
build-time-pinned HTTPS origin. It contains no financial-domain logic,
authentication implementation, secure storage, native financial persistence,
native network proxy, or custom native plugin.

## Durable identity

| Property | Value |
| --- | --- |
| Bundle identifier | `io.github.yuzequn095.aurum` |
| Display name | `Aurum` |
| Native shell version | `1.0.0` |
| Bridge contract version | `1` |
| Custom capabilities | None (`[]`) |
| Minimum iOS version | 14.0 |
| Device family | iPhone |
| Orientation | Portrait |

The bundle identifier uses the owner's existing GitHub namespace instead of
claiming an unowned custom domain. It is environment-neutral and can remain
stable through the private beta and a future SwiftUI client migration.

## Toolchain

- Node.js 20
- pnpm 9
- Capacitor 7.6.8
- macOS with Xcode 16 or newer and CocoaPods for native synchronization,
  builds, and device installation

Capacitor remains pinned to 7.6.8 because it supports the repository's Node 20
baseline. Its iOS and CapacitorCordova podspecs require iOS 14.0, which is the
shell's explicit minimum. No current shell capability justifies raising it.

## Configuration model

Copy `mobile.env.example` to the ignored `.env.mobile.local`. Never commit a
tunnel URL, release host, Apple account, signing team, profile, certificate, or
device identifier.

| Variable | Debug | Release/private beta |
| --- | --- | --- |
| `AURUM_MOBILE_MODE` | `debug` | `release` |
| `AURUM_MOBILE_WEB_URL` | Explicit HTTPS origin; temporary tunnel allowed | Explicit approved public HTTPS origin |
| `AURUM_MOBILE_TRUSTED_ORIGIN` | Not required | Required and exactly equal to the runtime origin |

Both modes reject HTTP, embedded credentials, query strings, fragments, and
runtime paths. Requiring the URL itself to be an origin ensures same-origin
Next.js routes remain application navigation under Capacitor's server URL
policy. Release additionally rejects loopback, LAN/private, reserved, local,
and malformed hostnames. Because 17E has not created a durable hosted origin,
no future hostname is hardcoded.

`pnpm mobile:sync:ios` writes the validated configuration into ignored native
files. The Xcode target contains a fail-closed build phase:

- Debug builds require a synced `AURUM_MOBILE_MODE=debug` configuration.
- Release builds require a synced `AURUM_MOBILE_MODE=release` configuration.
- missing, mismatched, or unknown configurations stop the Xcode build with a
  remediation message.

Changing the runtime origin requires updating the ignored environment,
resynchronizing Capacitor, rebuilding, signing, and reinstalling the shell.
An already installed build remains pinned to the origin embedded at its last
sync; hosted web deployments at that origin can change independently.

## Commands

Run from the repository root:

```text
pnpm mobile:check
pnpm mobile:build
pnpm mobile:prepare
pnpm mobile:sync:ios
pnpm mobile:open:ios
pnpm mobile:doctor
```

`pnpm mobile:add:ios` is only for generating a missing native project. The iOS
project is committed and should normally be synchronized, not regenerated.
Native commands fail clearly outside macOS.

## Trusted navigation boundary

- The validated `server.url` origin is the only privileged WebView origin.
- `allowNavigation` is intentionally absent; no wildcard or secondary host is
  admitted into the application WebView.
- Same-origin Aurum navigation remains inside the WebView.
- Top-level external HTTP(S), `mailto:`, and supported external schemes are
  handed to iOS by Capacitor's navigation delegate.
- Unknown schemes are cancelled in the WebView and remain subject to whether
  iOS has a registered handler.
- Provider OAuth and redirect handling are not implemented.

Origin pinning limits which pages receive the shell context. It is not an
authentication-token protection mechanism; the 17D credential decision must
still ensure trusted-origin JavaScript cannot retrieve a long-lived credential.

## Native presentation ownership

- The iPhone shell is portrait-only. Landscape layout hardening is not part of
  the owner-only private beta.
- Native configuration owns a stable dark-content status bar. Individual web
  pages do not mutate native status-bar state.
- The WebView uses `contentInset: "never"` and a `viewport-fit=cover` viewport.
  The web layer owns top/bottom safe-area padding, the fixed bottom navigation,
  and all product layout; native code must not duplicate financial UI spacing.
- No keyboard plugin is installed. WKWebView keeps its normal resize/focus
  behavior, while web forms own field visibility and scrolling. Non-blocking
  overlap or polish issues belong to 17F.

The app icon and launch mark derive from Aurum's existing overlapping-ring
symbol and gold/dark-green palette. The launch screen contains only the mark and
transitions into the similarly styled bundled loading/outage frame.

## Privacy, entitlements, and permissions

The app target uses no app-authored required-reason API and adds no tracking,
native collection, or sensitive device capability. It therefore adds no
app-level privacy declarations merely “just in case.” Capacitor and
CapacitorCordova 7.6.8 each ship their own `PrivacyInfo.xcprivacy`; both declare
no tracking, collected data, tracking domains, or required-reason API access.

There is no entitlements file and no permission usage-description key. The
shell does not enable push notifications, background modes, HealthKit,
Contacts, Calendar, Photos, Camera, Microphone, Bluetooth, location, NFC,
Apple Pay, or iCloud storage. Any future native capability must justify and
review its privacy declaration, entitlement, and permission before landing.

## Native capability contract

`native-contract.ts` freezes the version-1 contract:

```ts
{
  bridgeVersion: 1,
  shellVersion: "1.0.0",
  platform: "ios",
  capabilities: []
}
```

This is a documentary/type-level compatibility contract, not an exposed
plugin. The ordinary browser app remains fully functional without it. Token
getters, arbitrary Keychain/filesystem access, native HTTP proxying, generic
native invocation, financial data/database APIs, and financial-domain logic
are prohibited.

The shell changes slowly, the hosted web runtime changes frequently, and the
backend remains versioned under `/v1`. Future web code must capability-detect
native operations and degrade clearly when unavailable. A web deployment must
never assume that an installed shell has a newer bridge; a host or native
contract change can require a rebuilt and reinstalled shell.

## Loading and outage behavior

The supported `server.errorPath` points to bundled `error.html`. It contains
only branding, a connection message, Retry, and a non-sensitive diagnostic.
The generated retry target is the same validated URL embedded during sync and
is neither user-controlled nor secret. A reachable tunnel returning an HTTP
gateway error can still display the provider's page; that observed issue
remains 17F debt.
