# Milestone 17B Closeout

## Status

**Not complete.**

The cross-platform repository, CI, configuration, and disposable shell
foundation are implemented. This execution environment is Windows, so the iOS
project could not be generated or opened in Xcode and no physical-device test
was performed. Per the 17B acceptance criteria, physical installation is a
hard gate and this milestone cannot be reported as complete.

## Repository baseline

| Item             | Value                                                                                                                                                            |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Starting commit  | `e36125ee2adb47e48dffe7342d3743626ddf96df`                                                                                                                       |
| Branch           | `main` (the owner explicitly requested direct pushes to `main`)                                                                                                  |
| Final commits    | `c28fb8e` (`ci: add baseline repository validation workflow`), `596d0f5` (`feat(mobile): add disposable capacitor shell foundation`), `71ac0eb` (`docs(m17): document capacitor foundation validation`), `302c75a` (`docs(m17): record baseline ci evidence`), and the final CI Action-runtime update containing this revision; the complete immutable range is `e36125e..HEAD` |
| Operating system | Microsoft Windows 11 Home 10.0.26200, build 26200                                                                                                                |
| Node.js          | `v20.20.0`                                                                                                                                                       |
| pnpm             | `9.0.0`                                                                                                                                                          |
| Xcode            | Unavailable on Windows; not run                                                                                                                                  |
| Capacitor        | `7.6.8` for CLI, core, and iOS                                                                                                                                   |
| Target device    | Owner's iPhone 13 Pro; not connected or tested in this environment                                                                                               |
| Target iOS       | Owner-reported iOS 26.5.2; not independently verified                                                                                                            |

Capacitor 7 is intentionally pinned because it supports the repository's
Node.js 20 baseline. The iOS project must be generated on the owner's Mac using
the documented command before 17B can be accepted.

## Delivered scope

### CI workflow

`.github/workflows/ci.yml` provides one fail-closed Ubuntu validation job for
pull requests to `main`, pushes to `main`, and manual dispatch. It uses Node 20,
pnpm 9, a PostgreSQL 16 service, frozen installation, dependency caching, and
read-only repository permissions. Its static credentials are visibly CI-only
and address only the disposable service database.

### Mobile-shell package

`apps/mobile-shell` is an independently removable workspace with Capacitor
configuration, environment validation, local bootstrap/outage assets, contract
tests, a gitignored/generated-on-demand `dist` build directory, and
package-specific documentation. It adds no dependency to `apps/web`.

### iOS project

Not generated on Windows. `pnpm mobile:add:ios` validates the runtime
configuration, requires macOS, builds the local shell assets, and then invokes
the supported `cap add ios` workflow. The generated `ios/` directory must be
reviewed and committed from the Mac without personal signing state.

Manual Mac/Xcode steps:

1. Copy `apps/mobile-shell/mobile.env.example` to the ignored
   `apps/mobile-shell/.env.mobile.local` and provide a temporary trusted HTTPS
   tunnel or approved non-production URL.
2. Run `pnpm install --frozen-lockfile`, `pnpm mobile:add:ios`, and
   `pnpm mobile:doctor`.
3. Run `pnpm mobile:open:ios` and select the provisional
   `Aurum 17B Foundation` app target.
4. Select the owner's Personal Team and allow Xcode to manage signing.
5. Connect and trust the iPhone 13 Pro, enable Developer Mode if requested, and
   select the phone as the run destination.
6. Build and run, handle the device trust prompt if present, and repeat
   installation when free provisioning expires.

This does not claim TestFlight or App Store distribution support.

### Environment contract

- `AURUM_MOBILE_MODE` is exactly `debug` or `release`.
- `AURUM_MOBILE_WEB_URL` is consumed at Capacitor configuration/sync time and
  must be an absolute HTTPS URL without credentials, query, or fragment.
- Debug accepts an explicit HTTPS tunnel, non-production deployment, or HTTPS
  local endpoint. HTTP is deliberately rejected, avoiding a broad ATS
  exception.
- Release additionally rejects loopback, private/LAN, reserved, empty, and
  non-public hostnames.
- Release requires `AURUM_MOBILE_TRUSTED_ORIGIN` to exactly match the runtime
  URL origin.
- Local environment values live in the already-ignored
  `apps/mobile-shell/.env.mobile.local`; no tunnel URL is committed.

### Trusted-origin and external navigation behavior

The configured server URL is the sole privileged WebView origin.
`allowNavigation` is intentionally absent. Under Capacitor's default behavior,
same-origin navigation remains in the WebView and external HTTP(S) destinations
open outside it. There is no wildcard allowlist and no custom bridge.

`mailto:` and unsupported/custom schemes have not been tested on iOS and remain
explicit physical-device validation items. Provider/OAuth redirect handling is
not implemented.

### Loading and outage handling

The minimal local `webDir` includes:

- a branded initial loading/configuration state;
- `server.errorPath: "error.html"` for remote load failures;
- an understandable runtime-unavailable message;
- a retry action targeting the same sync-time-validated URL;
- only the non-sensitive diagnostic code
  `AURUM-MOBILE-RUNTIME-UNAVAILABLE` and shell version.

No financial data or credential is shown or stored. DNS, TLS, unreachable-host,
and retry behavior still require iOS/Xcode/device validation.

### Root scripts

| Command                | Purpose                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------ |
| `pnpm mobile:build`    | Build generic or configured local shell assets cross-platform                        |
| `pnpm mobile:check`    | Validate the explicit environment contract                                           |
| `pnpm mobile:prepare`  | Validate config and embed the non-secret runtime target in generated fallback assets |
| `pnpm mobile:add:ios`  | macOS-only supported iOS project generation                                          |
| `pnpm mobile:sync:ios` | macOS-only asset/config sync                                                         |
| `pnpm mobile:open:ios` | macOS-only Xcode open                                                                |
| `pnpm mobile:doctor`   | Validate config, macOS/Xcode availability, iOS project, and Capacitor dependencies   |

Existing web/API commands and the Windows restart helper are unchanged.

## CI validation

The `Validate repository` job runs:

```text
pnpm install --frozen-lockfile
pnpm --filter api exec prisma generate
pnpm --filter api exec prisma validate
pnpm --filter api exec prisma migrate deploy
pnpm lint
pnpm typecheck
pnpm --filter api test
pnpm --filter api test:e2e
pnpm --filter mobile-shell test
pnpm build
```

The migration uses only `postgres:16` service database `aurum_ci`. No step uses
`continue-on-error`, `|| true`, production infrastructure, or a real secret.

GitHub Actions result: **Pass**. The first complete pushed change set ran every
listed step successfully in 1m53s:
[CI run 30516422879](https://github.com/yuzequn095/Aurum/actions/runs/30516422879).

## Local validation

| Command                                                                   | Result                                                                                                                          |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile --offline`                                | Pass; lockfile current                                                                                                          |
| `pnpm --filter mobile-shell test`                                         | Pass; 16/16 tests                                                                                                               |
| `pnpm --filter mobile-shell typecheck`                                    | Pass                                                                                                                            |
| `pnpm --filter mobile-shell build`                                        | Pass; generic local assets generated                                                                                            |
| `pnpm mobile:check` with explicit debug HTTPS URL                         | Pass                                                                                                                            |
| `pnpm mobile:prepare` with explicit debug HTTPS URL                       | Pass                                                                                                                            |
| `pnpm --filter mobile-shell exec cap doctor`                              | Pass as a dependency report; CLI/core/iOS all installed at 7.6.8                                                                |
| `pnpm --filter mobile-shell exec cap config` with valid Release variables | Pass; TypeScript config resolved with HTTPS URL, no `allowNavigation`, Release logging disabled, and WebView debugging disabled |
| `pnpm mobile:doctor`                                                      | Expected environment failure: current platform is `win32`; macOS/Xcode required                                                 |
| `pnpm lint`                                                               | Pass                                                                                                                            |
| `pnpm typecheck`                                                          | Pass across core, API, web, and mobile shell                                                                                    |
| `pnpm --filter api test`                                                  | Pass; 22 suites and 113 tests                                                                                                   |
| `pnpm --filter api test:e2e`                                              | Pass; 2 suites and 5 tests                                                                                                      |
| `pnpm build`                                                              | Pass across core, API, web, and mobile shell                                                                                    |
| `pnpm --filter api exec prisma validate`                                  | Pass                                                                                                                            |
| `pnpm --filter api exec prisma migrate deploy`                            | Pass; all 16 migrations applied to an empty disposable PostgreSQL 16 container                                                  |
| `cap sync ios`                                                            | Not run; no generated iOS project and Windows is unsupported                                                                    |
| Xcode build                                                               | Not run; Xcode unavailable on Windows                                                                                           |

The expected `mobile:doctor` failure is an environment capability failure, not
an application test pass. The disposable `aurum-m17b-postgres` container used
for migration and e2e validation was stopped and automatically removed after
the tests; it did not use the repository's persistent development volume.

## Physical-device validation

No device test was performed. “Not performed” is not treated as passing.

| Test                                    | Result                    | Evidence/Notes                                                      |
| --------------------------------------- | ------------------------- | ------------------------------------------------------------------- |
| iOS project opens in Xcode              | Not performed             | Xcode unavailable on Windows                                        |
| Project builds                          | Not performed             | Requires Mac/Xcode                                                  |
| App installs with Personal Team         | Not performed             | Requires owner account, signing, and device                         |
| App launches                            | Not performed             | Requires installed app                                              |
| Non-production runtime loads            | Not performed             | Requires device and temporary HTTPS target                          |
| Login/demo entry renders                | Not performed             | Use synthetic/demo data only                                        |
| Same-origin Next.js navigation works    | Not performed             | Default policy configured; device evidence required                 |
| Dashboard/mobile navigation renders     | Not performed             | Device evidence required                                            |
| Rotation observed                       | Not performed             | Observe only; policy remains deferred                               |
| Background/foreground preserves WebView | Not performed             | Device evidence required                                            |
| External HTTPS opens in system browser  | Not performed             | Capacitor default configured; test a safe link                      |
| Return to Aurum works                   | Not performed             | Device evidence required                                            |
| Unavailable runtime shows failure state | Not performed             | Supported local `errorPath` is configured; device evidence required |
| Retry works                             | Not performed             | Bundled retry exists; DNS/TLS/network behavior must be observed     |
| No secret-bearing native bridge         | Pass by source inspection | No custom native bridge or secret-storage plugin exists             |
| No real financial data used             | Pass for repository work  | No real data, credential, or tunnel URL was added                   |

Also observe safe areas, keyboard overlap, bottom navigation, modals, chart
sizing, browser prompts, and swipe-back behavior during the device session.
Record defects as 17F candidates rather than expanding 17B.

## Architecture compliance

- Disposable shell: yes; isolated in `apps/mobile-shell` and independently
  removable.
- Native financial logic: none.
- Local financial database or persistence: none.
- Raw-token/Keychain/generic secure-storage bridge: none.
- Production hosting or permanent domain: none.
- Real personal financial data: none.
- Provider/OAuth rollout: none.
- TestFlight/App Store claim: none.
- Final mobile authentication architecture: not implemented.

## Known debt

- The application identifier `dev.aurum.mobile.foundation` is temporary.
- The native `ios/` project still must be generated and committed from macOS.
- The non-production runtime URL remains owner-local and intentionally
  uncommitted.
- Xcode build, Personal Team signing, physical install, navigation, outage, and
  device lifecycle evidence are absent.
- `mailto:` and unsupported/custom URL scheme behavior needs device validation.
- Free Personal Team provisioning expires and requires periodic re-signing.
- Safe-area, keyboard, modal, chart, rotation, browser-prompt, and swipe-back
  observations remain 17F candidates.

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
and the observed UX issues remain 17F.
