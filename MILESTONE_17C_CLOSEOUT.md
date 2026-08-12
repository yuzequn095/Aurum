# Milestone 17C Closeout

## Status

**Complete with debt**

Milestone 17C establishes Aurum's durable native application identity and its
trusted configuration contract. The resulting shell builds cleanly, signs
through the owner's Personal Team, installs on the physical iPhone, and passes
the required device acceptance path. The remaining items below are explicit
later-phase debt; none prevents the 17C identity/configuration contract from
being reproduced or reviewed.

## Repository baseline

| Item | Evidence |
| --- | --- |
| Starting commit | `0805d1f9c5d7846ff36480bb08ba613b42e001ac` |
| Branch | `milestone-17/17c-native-identity-config` |
| Final feature commit | `026b75b` — `feat(mobile): establish durable ios identity and configuration` |
| Final documentation commit | `docs(m17): close native identity and configuration phase` |
| macOS | 26.6.1 (25G76), Intel `x86_64` |
| Xcode | 26.5 (17F42) |
| Capacitor | 7.6.8 |
| Node / pnpm | Node v20.20.2 / pnpm 9.0.0 |
| Target device | iPhone 13 Pro |
| Device OS | iOS 26.5.2 |

The branch was created from current `origin/main`; existing 17B commits were
inspected and preserved rather than reimplemented.

## Durable app identity

| Property | Final value |
| --- | --- |
| Bundle identifier | `io.github.yuzequn095.aurum` |
| Display name | `Aurum` |
| Native shell version | `1.0.0` |

The identifier uses the owner's established GitHub namespace. This avoids
asserting ownership of a custom domain that does not yet exist, contains no
environment or temporary wording, is valid for Apple development signing, and
can remain stable through a private beta and a future SwiftUI migration.

Xcode registered and signed this identifier through the existing Personal Team
without a bundle-id collision. No Team ID, Apple account, certificate,
provisioning profile, or device identifier is committed. A fresh clone remains
locally signable by choosing a Personal Team with automatic signing.

## App icon and launch presentation

- Replaced the generated Capacitor placeholder icon with an Aurum icon built
  from the repository's existing overlapping-ring symbol and gold/dark-green
  palette. The committed 1024-pixel PNG is RGB and contains no alpha channel.
- Added the replaceable vector source at
  `apps/mobile-shell/assets/aurum-app-icon.svg`.
- Replaced the generated placeholder splash asset with a centered vector Aurum
  mark on a dark-green native launch background.
- The launch screen contains no fake financial data, URL, diagnostic, or
  animation and transitions into the similarly branded loading/outage frame.

The owner confirmed the icon, `Aurum` label, and launch presentation on the
physical iPhone. Further brand polish is optional and not architectural.

## Configuration model

### Debug

- `AURUM_MOBILE_MODE=debug` is required.
- `AURUM_MOBILE_WEB_URL` must be an explicit HTTPS origin. Temporary HTTPS
  development tunnels are allowed.
- WebView inspection and debug logging are enabled.
- `AURUM_MOBILE_TRUSTED_ORIGIN` is not needed because the single validated
  runtime origin is itself the pin.

### Release/private beta

- `AURUM_MOBILE_MODE=release` is required.
- Both `AURUM_MOBILE_WEB_URL` and `AURUM_MOBILE_TRUSTED_ORIGIN` are required.
- Both values must resolve to the exact same HTTPS origin.
- HTTP, localhost, loopback, private/LAN/link-local addresses, reserved test
  hosts, embedded credentials, paths, query strings, fragments, malformed
  URLs, and missing values are rejected.
- WebView inspection is disabled and Capacitor logging is suppressed.

No speculative 17E hostname is committed. A Release/private-beta sync without
an explicit approved origin fails with a focused configuration error. The Xcode
target then verifies that Debug was synced from `debug` mode and Release was
synced from `release` mode; missing, mismatched, and unknown modes fail the
build with remediation guidance.

The ignored `.env.mobile.local`, generated Capacitor runtime configuration,
bundled web output, and temporary tunnel URL remain untracked. An origin change
requires a Capacitor resync, rebuild, signing, and reinstall. Hosted web changes
at the already pinned origin do not require a shell rebuild.

## Minimum iOS target

The explicit minimum is **iOS 14.0**.

Capacitor and CapacitorCordova 7.6.8 both declare iOS 14.0 as their actual
minimum. The shell uses no capability that justifies raising that floor, and a
single-owner beta does not justify adding legacy compatibility below the
dependency baseline. A later Capacitor major version or a deliberately adopted
native API may require revisiting the target.

## Orientation policy

Aurum is **iPhone-only and portrait-only** for the private beta.

17B showed that landscape technically rendered but exposed ordinary dashboard
layout debt. Constraining the phone shell to portrait gives the owner a stable,
simple finance-dashboard experience without pulling responsive rework or iPad
support into 17C. The physical phone remained portrait-locked when rotated.

## Status bar / safe area / keyboard ownership

- **Status bar:** native configuration owns one stable dark-content style. Web
  pages do not perform per-route native status-bar mutations.
- **Safe area:** the WebView uses `contentInset: "never"` and the web viewport
  uses `viewport-fit=cover`. The web layer owns top and bottom inset padding,
  product layout, fixed navigation, and home-indicator clearance. Native code
  does not duplicate financial UI spacing.
- **Keyboard:** no native Keyboard plugin is installed. WKWebView retains its
  normal resize/focus behavior; web forms own field visibility and scrolling.

The owner confirmed acceptable status-bar contrast, top/bottom safe areas,
bottom navigation, keyboard use, and modal use on the iPhone. Non-blocking
layout polish remains 17F work.

## Privacy manifest

No app-authored `PrivacyInfo.xcprivacy` was added because the current app target
contains no native tracking, native data collection declaration, tracking
domain, or app-authored required-reason API use. Empty or speculative entries
would not accurately describe the current shell.

Capacitor 7.6.8 and CapacitorCordova 7.6.8 each supply their own framework
`PrivacyInfo.xcprivacy`. Both manifests are included in the built app and
declare no tracking, collected data, tracking domains, or required-reason API
access. Both passed `plutil` validation. This decision follows Apple's
[privacy manifest guidance](https://developer.apple.com/documentation/bundleresources/adding-a-privacy-manifest-to-your-app-or-third-party-sdk).

Any future native plugin or app-authored required-reason API must trigger a new
manifest review. App Store privacy-label work is not claimed in this Personal
Team/private-device milestone.

## Entitlements and permissions

The committed project has:

- no entitlements file;
- no permission usage-description key in `Info.plist`;
- no push, background mode, HealthKit, Contacts, Calendar, Photos, Camera,
  Microphone, Bluetooth, location, NFC, Apple Pay, or iCloud capability;
- no placeholder permission description.

The signed Debug app contains only the baseline development entitlements added
automatically by Personal Team signing. No new permission prompt appeared
during physical-device validation.

## Native bridge contract

`apps/mobile-shell/native-contract.ts` freezes the version-1 contract:

```ts
type AurumNativeCapabilities = {
  readonly bridgeVersion: 1;
  readonly shellVersion: "1.0.0";
  readonly platform: "ios";
  readonly capabilities: readonly [];
};
```

This contract is documentary/type-level. There is no custom native plugin and
no JavaScript API is injected. The web application remains fully functional in
an ordinary browser.

Permitted future capability categories are non-sensitive shell/version
reporting, platform identification, explicit external URL handoff, and
non-sensitive lifecycle support. Version 1 exposes none because Capacitor's
existing behavior already covers the current shell.

Token getters, arbitrary Keychain/filesystem access, a native HTTP proxy,
generic native invocation, financial data/database APIs, financial-domain
logic, and any secret-bearing bridge are prohibited.

## Native/web/backend version relationship

The compatibility policy is intentionally small:

- the native shell changes slowly and has its own semantic version;
- the bridge contract has an independent integer version;
- the hosted Next.js runtime may deploy frequently at the pinned origin;
- the backend remains versioned under `/v1`.

Web code must use ordinary browser behavior as its baseline. Any future native
operation must be capability-detected rather than inferred from user agent or
assumed from a web deployment. If a future page truly requires a newer bridge,
it must detect the missing capability, degrade safely, and present a clear
upgrade requirement. No version-negotiation service is introduced in 17C.

## Validation

### Repository and Capacitor

| Command | Result |
| --- | --- |
| `git status` / `git fetch origin` / baseline comparison | Clean accepted baseline confirmed before branching |
| `pnpm install --frozen-lockfile` | Passed |
| `pnpm --filter mobile-shell test` | Passed, 18/18 tests |
| `pnpm --filter mobile-shell typecheck` | Passed |
| `pnpm lint` | Passed across API, web, and mobile shell |
| `pnpm typecheck` | Passed across all four workspace packages |
| `pnpm build` | Passed across all four workspace packages |
| `pnpm mobile:check` | Passed with ignored Debug configuration |
| `pnpm mobile:sync:ios` | Passed; pods installed despite the pre-existing non-blocking ffi warning |
| `pnpm mobile:doctor` | Passed; Xcode, iOS SDK, CocoaPods, and Capacitor detected |
| `plutil -lint apps/mobile-shell/ios/App/App/Info.plist` | Passed |
| `ibtool --compile … LaunchScreen.storyboard` | Passed without errors, notices, or warnings |
| Built-framework privacy manifest validation | Both Capacitor manifests passed `plutil` |

Capacitor's CommonJS TypeScript config loader did not resolve an emitted-style
`.js` relative import from `capacitor.config.ts`; using the repository-local
`.ts` extension plus `allowImportingTsExtensions` is the verified Capacitor
7.6.8 behavior. This is a tooling detail, not a second configuration contract.

### Xcode policy and build

| Validation | Result |
| --- | --- |
| Clean unsigned Debug build for generic iOS destination | Passed |
| Release build against a Debug-synced config | Failed at the 17C guard as intended |
| Clean unsigned Release build after ignored Release-policy sync | Passed |
| Return to ignored Debug configuration and resync | Passed |
| Clean Personal Team Debug build for connected iPhone | Passed |
| `codesign --verify --deep --strict` on device app | Passed |
| `xcrun devicectl device install app …` | Passed |
| `xcrun devicectl device process launch … io.github.yuzequn095.aurum` | Passed |

The final post-sync unsigned Debug build used `xcodebuild clean build` against
the committed workspace, `App` scheme, Debug configuration, generic iOS
destination, a disposable DerivedData path, and `CODE_SIGNING_ALLOWED=NO`.

The Release validation used an uncommitted public HTTPS validation origin only
to prove policy/build behavior. No temporary or future hostname is recorded.

## Physical-device validation

All runtime tests used only the seeded synthetic demo account and the existing
isolated local Milestone 17 development database. A temporary owner-only HTTPS
tunnel connected the phone to the local Next.js runtime; no production/beta
infrastructure or real financial data was used.

| Test | Result | Evidence/Notes |
| ---- | ------ | -------------- |
| 1. Project builds | Pass | Clean Debug and Release-policy Xcode builds completed. |
| 2. Signing still works | Pass | Automatic Personal Team development signing succeeded for the durable identifier. |
| 3. App installs | Pass | Xcode/devicectl installed the signed app on the iPhone 13 Pro. |
| 4. App icon appears correctly | Pass | Owner confirmed the gold overlapping-ring icon on the Home Screen. |
| 5. Display name is `Aurum` | Pass | Owner confirmed the Home Screen label. |
| 6. Launch presentation appears correctly | Pass | Owner confirmed the dark-green/gold native launch presentation. |
| 7. Debug trusted runtime loads | Pass | Local Next.js/API/PostgreSQL runtime loaded through an ignored temporary HTTPS tunnel. |
| 8. Same-origin navigation works | Pass | Demo login, dashboard, and same-origin product navigation remained inside Aurum. |
| 9. External HTTPS leaves the WebView | Pass | Owner confirmed a safe temporary external HTTPS test opened outside the privileged WebView. |
| 10. Orientation follows policy | Pass | App remained portrait-only when the phone rotated. |
| 11. Status bar baseline | Pass | Owner confirmed acceptable stable contrast and presentation. |
| 12. Safe areas | Pass | Top inset, bottom navigation, and home-indicator area had no core blocker. |
| 13. Keyboard baseline | Pass | Login/form keyboard behavior remained usable with no core blocker. |
| 14. Background/foreground | Pass | WebView preserved or restored the usable runtime after lifecycle transition. |
| 15. Offline fallback and retry | Pass | With connectivity intentionally unavailable, the branded fallback appeared; after restoration, Retry recovered the runtime. |
| 16. No unexpected permission prompt | Pass | Owner observed no new native permission request. |
| 17. No financial-domain native code | Pass | Source/config review and dependency audit found no native financial model or persistence. |
| 18. No secret-bearing bridge | Pass | No custom plugin or injected secret API exists; capability list is empty. |

The temporary external-navigation surface also exercised `mailto:` and an
unsupported custom scheme, then was removed completely; no test UI remains in
the web product. An expired development-tunnel hostname initially produced the
branded unreachable state. Replacing the ignored tunnel, resyncing, rebuilding,
and reinstalling restored the runtime and confirms that the installed shell is
correctly pinned to its build-time origin.

## Architecture compliance

- The shell remains disposable and Model B remote-runtime based.
- No native finance logic or native financial database was introduced.
- No custom or secret-bearing native bridge was introduced.
- No authentication implementation, Keychain token storage, Native Auth
  Broker, refresh redesign, biometric flow, or provider OAuth was introduced.
- No production hosting or permanent private-beta host was introduced.
- No provider rollout, live financial integration, real AI provider, real
  personal financial data, TestFlight, or App Store work was introduced.
- No SwiftUI product screen or Mobile BFF was introduced.

## Known debt

- A permanent approved Release/private-beta HTTPS origin remains 17E work.
  Until it exists, Release policy is validated but no durable Release runtime
  can be installed.
- Personal Team provisioning is time-limited and may require periodic rebuild
  and reinstall. Paid Developer Program distribution remains out of scope.
- Temporary Quick Tunnel hostnames are disposable. One expired during 17C and
  correctly required an ignored config update, resync, rebuild, and reinstall.
- A reachable tunnel edge can return its own HTTP 502/Cloudflare gateway page
  instead of triggering Capacitor's transport-level `server.errorPath`. This
  known behavior remains a concrete 17F outage-presentation candidate.
- Minor phone layout, prompt, modal, chart, and swipe/history hardening remains
  17F work; none blocked the accepted core path.
- Model B's remote `server.url` and the existing web token model retain the
  security debt documented by the 17A decision. Authentication is the 17D
  real-data gate; 17C origin pinning is not presented as token protection.
- CocoaPods 1.11.2 still emits the pre-existing ffi native-extension warning,
  but dependency installation and builds pass. Xcode also reports an upstream
  Capacitor WebKit deprecation warning; neither required a 17C workaround.

## 17D handoff

17D is limited to the authentication boundary:

- decide the credential architecture for the accepted remote-runtime model;
- define auth storage and any narrowly scoped native broker boundary;
- implement single-flight refresh and concurrent 401 behavior;
- validate refresh rotation, reuse/revocation, logout, logout-all, restart,
  background/foreground, and expiration lifecycle behavior;
- add concurrency/security tests and repeat device auth validation before real
  financial data is permitted.

Permanent hosting, tunnel replacement, domain selection, production database,
backup infrastructure, TestFlight, App Store configuration, and device UX
hardening do not belong to 17D.
