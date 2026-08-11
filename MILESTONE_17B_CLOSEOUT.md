# Milestone 17B Closeout

## Status

**Complete with debt.**

The disposable Capacitor shell has been generated and built on the owner's
Intel Mac, signed with a Personal Team, installed on the owner's iPhone 13 Pro,
and exercised against a synthetic local Aurum environment through a temporary
HTTPS tunnel. The mandatory 17B device path passed. The device session also
identified a concrete outage presentation issue for 17F: a reachable tunnel
that returns HTTP 502 displays the tunnel provider's gateway page, while a true
network/transport failure correctly displays Aurum's bundled fallback and
recovers through Retry.

## Repository baseline

| Item | Value |
| --- | --- |
| Original 17B starting commit | `e36125ee2adb47e48dffe7342d3743626ddf96df` |
| Mac completion starting commit | `0db25904fe9fad19a0bbd7b52889d94147564c84` (`origin/main` at start) |
| Mac completion branch | `milestone-17/17b-macos-device-completion` |
| Prior cross-platform commits | `c28fb8e`, `596d0f5`, `71ac0eb`, `302c75a`, and `0db2590` |
| macOS | 26.6.1 (build 25G76) |
| CPU | Intel `x86_64` |
| Xcode | 26.5 (build 17F42) |
| iOS SDK | 26.5 device SDK available |
| Node.js | `v20.20.2` |
| pnpm | `9.0.0` |
| Git | `2.50.1` |
| Capacitor | `7.6.8` for CLI, core, and iOS |
| Target device | iPhone 13 Pro, detected by Xcode and `devicectl` |
| Target iOS | 26.5.2, detected from the connected device and supported by Xcode 26.5 |

The earlier Windows implementation and CI evidence remain valid historical
evidence. This completion pass did not rewrite those commits or reimplement the
working cross-platform foundation.

## Delivered scope

### Disposable mobile shell and iOS project

`apps/mobile-shell` remains an independently removable workspace with no
financial-domain logic. The repository-provided workflow generated
`apps/mobile-shell/ios`, installed its native dependencies, synchronized the
Capacitor configuration, and opened the workspace in Xcode.

The committed native project contains the provisional 17B identity
`dev.aurum.mobile.foundation` and the generated Capacitor/CocoaPods integration.
It does not contain a Personal Team identifier, provisioning profile, device
identifier, Apple account information, temporary runtime URL, `xcuserdata`,
Pods, DerivedData, or build output. Personal signing remains local to Xcode.

### Environment contract

- `AURUM_MOBILE_MODE` is exactly `debug` or `release`.
- `AURUM_MOBILE_WEB_URL` is consumed during Capacitor configuration/sync and
  must be an absolute HTTPS URL without credentials, query, or fragment.
- Debug accepts an explicit HTTPS tunnel, non-production deployment, or HTTPS
  local endpoint. HTTP remains rejected; no broad ATS exception was added.
- Release additionally rejects loopback, private/LAN, reserved, empty, and
  non-public hostnames.
- Release requires `AURUM_MOBILE_TRUSTED_ORIGIN` to match the runtime URL origin.
- Local values remain in ignored `apps/mobile-shell/.env.mobile.local`; the
  temporary URL is not committed.

### Trusted-origin and external navigation behavior

The configured server URL remains the sole privileged WebView origin and
`allowNavigation` remains absent. Same-origin Aurum navigation stayed in the
WebView during the device test. The owner completed a temporary development-only
external-link pass covering a safe HTTPS destination, `mailto:`, and an
unsupported custom scheme without reporting a privileged WebView takeover.
The temporary test surface was removed before commit. Provider OAuth was not
implemented.

### Loading and outage handling

The minimal local `webDir` still provides the branded initial state and
`server.errorPath: "error.html"`. On the physical device:

- disabling network connectivity displayed the bundled Aurum runtime-unavailable
  fallback rather than an unexplained white screen;
- the fallback exposed no sensitive information;
- restoring connectivity and tapping Retry returned to Aurum successfully;
- leaving the HTTPS tunnel reachable while stopping its local upstream produced
  an HTTP 502 and displayed the tunnel provider's gateway page instead of the
  bundled fallback.

The last item is documented for 17F. It does not invalidate the 17B transport
fallback, but the user-facing 5xx presentation needs a future product decision.

## Mac development runtime

No pre-approved non-production deployment was available. The device session
used the smallest isolated local stack required for validation:

```text
iPhone 13 Pro
  -> ephemeral Cloudflare Quick Tunnel (HTTPS)
  -> Mac Next.js development server on port 3000
  -> same-origin /api rewrite
  -> Mac NestJS development server on port 3001
  -> dedicated local PostgreSQL 16 database
```

Homebrew PostgreSQL 16.14 and `cloudflared` 2026.7.3 were installed for this
owner-only development session. All 16 Prisma migrations and the repository's
synthetic demo seed ran against the dedicated `aurum_m17b` database. No real
financial data or production/beta infrastructure was used. Docker was not
installed or required.

CocoaPods 1.11.2 continued to report its existing `ffi` native-extension
warning, but the actual `pod install`, Capacitor add/sync, and native build all
succeeded. CocoaPods, Ruby, and `ffi` were therefore not replaced or upgraded.

## Validation

### Cross-platform and CI history

The earlier `Validate repository` GitHub Actions run passed the frozen install,
Prisma generation/validation/migration, lint, typecheck, API unit/e2e tests,
mobile-shell tests, and monorepo build in 1m53s:
[CI run 30516422879](https://github.com/yuzequn095/Aurum/actions/runs/30516422879).

### macOS, Capacitor, and Xcode

| Check | Result | Evidence/notes |
| --- | --- | --- |
| Frozen dependency install | Pass | Lockfile current on macOS |
| Mobile-shell tests | Pass | 16/16 tests |
| Mobile-shell typecheck | Pass | No TypeScript errors |
| Mobile-shell build | Pass | Generic shell assets generated |
| `mobile:check` / `mobile:prepare` | Pass | Ignored debug HTTPS configuration validated and embedded |
| `mobile:add:ios` | Pass | Generated the iOS project with Capacitor 7.6.8 |
| `mobile:sync:ios` | Pass | Web assets/config copied; CocoaPods install completed |
| `mobile:doctor` | Pass | Xcode, project, Pods, and Capacitor dependencies detected |
| Xcode workspace open | Pass | `App.xcworkspace` and `App` scheme recognized |
| Unsigned device-target build | Pass | Clean serial Xcode build for the connected iPhone destination |
| Signed device build | Pass | Automatic Personal Team development signing succeeded |
| App install and launch | Pass | Installed and launched as `dev.aurum.mobile.foundation` |

Xcode emitted only non-blocking warnings: an upstream CapacitorCordova
`WKProcessPool` deprecation and a CocoaPods embed-framework build phase without
declared outputs.

### Physical-device validation

| Test | Result | Evidence/notes |
| --- | --- | --- |
| iOS project opens in Xcode | Pass | Generated workspace and scheme opened on macOS |
| Project builds | Pass | Clean unsigned and signed physical-destination builds |
| App installs with Personal Team | Pass | Automatic signing, device registration, and installation succeeded |
| App launches | Pass | Trusted developer profile and launched on iPhone 13 Pro |
| Non-production Aurum runtime loads | Pass | Ephemeral HTTPS tunnel loaded the local Next.js runtime |
| Login/demo entry renders | Pass | Login surface rendered using synthetic data only |
| Demo login works | Pass | Seeded demo account reached the authenticated experience |
| Same-origin Next.js navigation works | Pass | Aurum routes remained in the privileged WebView |
| Dashboard renders | Pass | Dashboard cards and charts rendered |
| Mobile navigation works | Pass | Home, Portfolio, Transactions, AI Insights, and Settings exercised |
| Rotation observed | Pass | Portrait and landscape observed on the phone |
| Background/foreground restores WebView | Pass | Returned after approximately ten seconds in background |
| External HTTPS behavior | Pass | Temporary safe external link pass completed without reported WebView takeover |
| `mailto:` behavior | Pass with observation debt | Trigger exercised; no blocking failure reported |
| Unsupported custom scheme | Pass with observation debt | Trigger exercised; no blocking failure reported |
| Return to Aurum works | Pass | App remained usable after external-navigation pass |
| Runtime unavailable state | Pass | Offline transport failure displayed branded bundled fallback |
| Retry works | Pass | Restored network and Retry returned to the runtime |
| Reachable tunnel with failed upstream | Debt recorded | HTTP 502 displayed Cloudflare's gateway page; track in 17F |
| Top and bottom safe areas | Pass for basic use | No core-path blocker reported |
| Keyboard and modal interaction | Pass for basic use | Login/action flow usable; owner noted minor non-blocking issues |
| Bottom navigation and charts | Pass for basic use | Core surfaces usable; hardening remains 17F scope |
| Browser prompts and swipe/history | Pass for basic use | No core-path blocker reported |
| No secret-bearing native bridge | Pass | Source/project inspection found no custom secret bridge |
| No real financial data used | Pass | Dedicated database contained only repository demo/synthetic data |

The owner observed minor non-blocking device UX bugs and explicitly accepted
the core device experience as sufficient for 17B. They were not itemized, so
this closeout does not invent reproductions or claim fixes; concrete recurrence
should be captured and prioritized in 17F.

## Architecture compliance

- Disposable shell: yes; isolated in `apps/mobile-shell` and independently removable.
- Native financial logic: none.
- Native financial persistence: none.
- Raw-token, Keychain, or generic secure-storage bridge: none.
- Production hosting or permanent domain: none.
- Real personal financial data: none.
- Provider/OAuth rollout: none.
- TestFlight/App Store claim: none.
- Final mobile authentication architecture: not implemented.

## 17F candidates and remaining debt

- Detect or replace provider-generated HTTP gateway/5xx pages with a consistent
  Aurum runtime-unavailable experience; `server.errorPath` covered a transport
  failure but did not intercept the observed tunnel HTTP 502 response.
- Reproduce and itemize the owner's minor non-blocking physical-device UX bugs
  before selecting fixes.
- Continue focused safe-area, keyboard, modal, chart, browser-prompt, rotation,
  and swipe/history hardening on representative devices.
- The application identifier `dev.aurum.mobile.foundation` is provisional and
  belongs to 17C.
- The runtime is an owner-local development stack behind an ephemeral URL, not
  production/beta infrastructure.
- Personal Team provisioning expires and requires periodic local re-signing.
- The CocoaPods `ffi` warning remains machine-level debt because it did not
  affect generation, dependency installation, build, or installation.
- Final authentication, secure credential lifecycle, permanent infrastructure,
  production data, TestFlight, and App Store distribution remain out of 17B.

## 17C handoff

Only the following belongs to 17C:

- replace the provisional app/bundle identity with the durable identity;
- establish the final trusted Release origin policy;
- provide final icon and splash assets;
- decide and document the minimum iOS deployment target;
- assign ownership for safe-area, status-bar, and keyboard configuration;
- review privacy manifest, entitlements, and native permissions;
- freeze the minimal bridge compatibility/version policy.

Authentication and credential lifecycle remain 17D. Production hosting,
database, domain, backups, and deployment remain 17E. Runtime/device hardening
and observed UX issues remain 17F.
