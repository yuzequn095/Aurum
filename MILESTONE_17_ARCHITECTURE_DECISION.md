# Milestone 17 Architecture Decision

## Status

Accepted with debt

Date: 2026-07-22

Decision scope: Milestone 17 private iOS beta architecture

Repository baseline: `8b9c0629a65fc7ccb932c823d40c38b88e6f5ec6` (`main` and `origin/main` at audit start)

This decision authorizes the architecture direction for Milestone 17. It does not authorize App Store submission, production-scale infrastructure, paid live financial-provider traffic, background financial operations, or a native rewrite.

## Context

Aurum is a pnpm/Turborepo application with a Next.js 16 App Router web client, a NestJS 11 API, Prisma 7, and PostgreSQL 16. The product currently runs as a browser application. Milestone 17 must make it usable as a private iOS beta installed directly from Xcode on the owner's iPhone 13 Pro while preserving the existing browser application and its financial-domain behavior.

The owner has a Mac capable of Xcode development and an iPhone 13 Pro running iOS 26.5.2, but no paid Apple Developer Program membership, custom domain, or chosen hosting provider. Early installation therefore uses free Apple Personal Team signing and accepts periodic re-signing; TestFlight is not an early-phase dependency. The environment must nevertheless be stable enough to protect possible real personal financial data after the safety gates pass.

The current web application is mostly client-rendered, but it is not currently a static-export application:

- `/` performs a dynamic server-side health fetch with `cache: "no-store"`.
- `/api/:path*` relies on a Next.js rewrite to the NestJS API.
- middleware is present, although it is currently a no-op.
- browser session state is stored in JavaScript-readable local storage and duplicated into JavaScript-readable cookies.
- the API client can use same-origin `/api`, with browser-visible direct API fallbacks.

The product has no offline financial source of truth, local database, service worker, or native integration today. The central architecture question is therefore whether the iOS shell should bundle a static copy of the web app, load the hosted Next.js runtime, or introduce a hybrid split.

Longer term, the UI may be replaced by SwiftUI while the backend, cloud topology, and AI/agent implementation evolve substantially. M17 therefore preserves server-authoritative data, versioned domain contracts, portable Node/PostgreSQL operations, and AI artifact lineage while treating WebView-specific code as disposable learning infrastructure.

Capacitor v8 documents a local `localhost` origin as its normal bundled-web configuration. Its `server.url` and expanded navigation configuration are described as live-reload/development-oriented rather than production-oriented. Loading a remote runtime is therefore an intentional exception for this narrow, direct-installed beta, not a claim of general Capacitor production best practice.

## Decision Drivers

1. Preserve the browser product and existing Next.js/NestJS/PostgreSQL system as the source of truth.
2. Reach a usable direct-installed beta quickly enough to learn from real device use.
3. Avoid duplicating financial calculations, persistence, or session semantics in native code.
4. Keep all long-lived financial data on the server so a future SwiftUI client does not require data migration.
5. Resolve the long-lived credential boundary so remotely served JavaScript cannot retrieve the refresh credential, and fix current refresh concurrency behavior before real beta data.
6. Keep deployment simple, low-cost, HTTPS-only, and recoverable.
7. Make web fixes deployable without rebuilding and re-signing the iOS shell during the learning phase.
8. Retain a credible path to a bundled shell or native client after the API contract and product flows stabilize.
9. Explicitly constrain beta debt rather than accidentally treating a private prototype as App Store-ready.

## Options Considered

### Model A – Bundled Static Next.js Export

#### Feasibility

Feasible after a small but real web-runtime conversion. A controlled experiment proved that all 13 current app routes can export when the dynamic root health fetch and rewrite dependency are neutralized. The unmodified application cannot export: the dynamic `/` fetch fails static rendering, rewrites do not operate as they do in the hosted Next.js runtime, and middleware is disabled for static export.

#### Required changes

- replace or remove the server-rendered root health fetch;
- remove reliance on the Next.js `/api` rewrite inside the native bundle;
- configure the native client with a direct HTTPS API base URL;
- add `capacitor://localhost` to the exact production API CORS allowlist;
- verify every navigation and asset path under a local Capacitor origin;
- isolate browser and native environment configuration;
- introduce native secure credential storage and lifecycle-aware session hydration;
- add an explicit web/native build matrix and prevent native-only behavior from leaking into browser builds.

#### Blocked or changed features

Any future server component requiring request-time data, route handler, server action, cookie/header read, rewrite, redirect, or middleware behavior would need removal, replacement, or a separate hosted path. The current application happens to be mostly client-rendered, but static export becomes an ongoing architectural constraint rather than a one-time setting.

#### Authentication

The bundle would call the NestJS API directly from `capacitor://localhost`. Refresh storage must move behind an adapter; native refresh tokens go to Keychain, and access tokens remain in memory. Cookie duplication should not be part of the native session design.

#### API and deployment

The API must be public over HTTPS and allow the exact Capacitor origin. The web application may continue through same-origin `/api`. Browser and native client configurations would consequently exercise different network paths.

#### Update and version relationship

The bundled UI version is pinned to the installed shell. Every UI fix requires a new native build, signing, and reinstall during the direct-install beta. The API must remain backward-compatible with installed shell versions or enforce a minimum client version.

#### Advantages

- follows the normal Capacitor local-web-asset model;
- works without the hosted Next.js page runtime after launch, subject to API availability;
- constrains the native bridge to code shipped in the signed bundle;
- is closer to a reviewable distributable architecture than a remote `server.url`.

#### Disadvantages

- creates a separate static-rendering variant and network path;
- couples every web fix to a native reinstall;
- makes normal Next.js server features unavailable to the native UI;
- requires version compatibility work earlier than the private beta needs it;
- still provides little useful offline behavior because all financial data and operations remain server-backed.

#### Decision

Rejected for Milestone 17, but retained as the first fallback if remote loading proves unreliable, violates a later distribution policy, or the beta moves beyond direct installation.

### Model B – Remote Hosted Next.js Runtime

#### Feasibility

Feasible with the least rendering and routing change. The Capacitor shell loads one pinned, trusted HTTPS Next.js deployment. The same hosted page runtime serves browser and iOS WebView users. Normal browser requests use same-origin `/api`, which Next rewrites to the NestJS API.

#### Required changes

- create the minimal Capacitor iOS shell and set its trusted HTTPS application URL;
- restrict navigation to the application origin and open external destinations through the system browser;
- complete a 17D authentication security spike and implement one approved credential boundary that never returns the raw refresh token to remotely served page JavaScript;
- refactor authentication behind explicit browser/native boundaries and a single-flight refresh coordinator;
- move the proxy target to server-only configuration and disable direct production API access by default;
- add a local shell-level startup/outage state so a failed remote load does not present an unexplained blank screen;
- configure safe areas, status bar, keyboard behavior, and lifecycle resumption;
- add environment and deployment gates before real data.

#### Blocked or changed features

No current page is blocked by rendering mode. The app requires network access to load both its UI and data. A bad web deployment can break the native experience immediately, while a good web deployment can fix it immediately. Arbitrary remote navigation must not inherit bridge access.

#### Authentication

Authentication is an unresolved security boundary for the remote-runtime model. Origin pinning, a navigation allowlist, and Content Security Policy can reduce navigation and injection risk, but they do not protect a credential from compromised JavaScript legitimately served by the trusted Aurum origin. A generic Keychain bridge that returns the raw refresh token to page JavaScript is therefore insufficient and is not approved for real-data use.

Model B may proceed through the 17B foundation with non-sensitive development or demo data only. In 17D, Aurum must select, implement, and device-test one of the real-data credential designs defined in the Authentication Decision. Regardless of the selected design, refresh rotation must use one in-flight operation so parallel 401 responses cannot independently rotate the same credential.

#### API and deployment

The primary path is:

`iOS WebView or browser -> hosted Next.js origin -> same-origin /api -> Next rewrite/proxy -> NestJS API -> PostgreSQL`

This removes CORS from the normal browser/WebView request path. In the primary M17 topology, NestJS is a private same-region service reachable by the Next.js server over the hosting provider's private network. Direct browser/native production API access is disabled rather than retained as a fallback.

#### Update and version relationship

The shell and web runtime are deliberately decoupled. Most UI and web-client fixes deploy once to the hosted Next.js service and take effect on the next load. A shell rebuild is required only for native configuration, plugins, entitlements, signing, bridge behavior, or a change to the pinned host.

The web deployment must maintain a short compatibility window for the installed shell bridge contract. Native bridge calls must be capability-detected and versioned. A deployment that requires a newer bridge must fail closed with a clear upgrade message rather than invoking unavailable native behavior.

#### Failure modes

- web host unavailable: shell shows a local outage/retry screen; no cached financial workflow is promised;
- API unavailable: hosted page loads but data actions fail through a consistent retryable error state;
- incompatible web/native bridge: capability check blocks the affected feature and reports an upgrade requirement;
- compromised or misconfigured trusted web deployment: origin pinning and CSP do not protect a JavaScript-readable long-lived credential; real data remains prohibited until the 17D credential boundary prevents page JavaScript from retrieving or exfiltrating the refresh credential;
- provider hostname change: existing shells still point at the old host, so a stable custom domain should be introduced before broader distribution if provider portability becomes important.

#### Advantages

- preserves current Next.js rendering, rewrite, and deployment behavior;
- gives browser and iOS users one UI codepath;
- allows rapid beta fixes without repeated Xcode installation;
- keeps financial logic and data server-side;
- minimizes native code and makes eventual shell removal straightforward.

#### Disadvantages

- Capacitor documents remote `server.url` as development-oriented, so this is explicit beta debt;
- the application cannot start meaningfully without the web host and API;
- web deployment safety becomes native deployment safety;
- remotely served trusted-origin JavaScript remains inside the application threat model and must not receive a raw long-lived credential;
- this model is not approved here for TestFlight or App Store distribution.

#### Decision

Selected for Milestone 17's direct-installed private beta, subject to the gates and exit criteria in this record.

### Model C – Hybrid Local Shell and Remote Product Runtime

#### Feasibility

Technically feasible. A local bundle could own startup, authentication, navigation, or offline surfaces while embedding or routing to remote product views.

#### Required changes

It would require two coordinated UI runtimes, explicit routing and message contracts, duplicated shell states, more complex credential handoff, version negotiation, and broader device testing. Deciding which surface owns errors, deep links, navigation, and refresh would become a product architecture project.

#### Blocked or changed features

Every product surface would need an explicit owner: local, remote, or bridged. Browser history, authentication gates, loading/error states, external navigation, and deep links would no longer inherit one consistent runtime. No current workflow demonstrates enough offline value to justify those changed semantics.

#### Authentication

The local shell would likely own Keychain and issue authenticated requests or credentials to remote views. This increases the bridge surface and the number of session transitions that must be secured.

#### API and deployment

Both local and remote clients would need compatible API behavior and secure credential handoff. The hosted services remain necessary for financial operations, so the extra local runtime would not eliminate the API/database deployment or their failure modes.

#### Update and version relationship

Remote UI could update independently, but the local shell contract would evolve rapidly and require backward compatibility. Deployment failures could arise in either half or their bridge, and local fixes would still require signing and reinstall.

#### Advantages

- can offer a polished local startup/offline frame;
- can incrementally move selected surfaces native or local;
- can insulate some shell UX from web-host outages.

#### Disadvantages

- highest complexity for the least demonstrated product need;
- introduces two navigation and rendering systems before workflows are stable;
- increases authentication, bridge, testing, and rollback surface;
- does not create meaningful offline finance behavior without a much larger synchronization design.

#### Decision

Rejected. A tiny local loading/outage screen is allowed within Model B, but no financial workflow, domain state, or competing navigation system will be added to the shell.

## Final Decision

Aurum will use **Model B: a minimal Capacitor shell loading one trusted, hosted Next.js runtime** for the Milestone 17 direct-installed private beta.

This is **Accepted with debt** because Capacitor's remote runtime configuration is not documented as a general production-distribution pattern. Acceptance is bounded by all of the following:

- installation is directly from Xcode to the owner's device;
- there is no TestFlight or App Store claim;
- the remote origin is HTTPS, pinned, and navigation-restricted;
- the native bridge is minimal and exposes no financial-domain logic;
- origin pinning and CSP are not treated as protection against compromised JavaScript served by the trusted origin;
- a generic JavaScript-readable Keychain token adapter is prohibited for real-data Model B use;
- one approved 17D credential boundary, single-flight rotation, and proof that application JavaScript cannot retrieve or exfiltrate the long-lived credential must land before real beta data;
- the decision is reviewed before any external beta or store distribution.

Exit triggers are App Store/TestFlight preparation, more than a tightly controlled owner beta, a need for meaningful offline use, inability to secure remote bridge access, or unacceptable remote-load reliability. At an exit trigger, Model A is evaluated first; a SwiftUI client is a later product decision rather than a Milestone 17 fallback.

Until the real-data authentication gate is satisfied, Model B is limited to synthetic, development, or demo data even if the shell, hosting, and other controls are operational.

## Authentication Decision

### Storage abstraction

Introduce explicit asynchronous authentication boundaries so session and API code no longer read `localStorage`, cookies, or native storage directly.

- Browser adapter: retain the current local-storage behavior only as a compatibility baseline for non-sensitive development/demo use, document its XSS exposure, and remove unnecessary cookie duplication when server-rendered auth is not using it.
- Native boundary: must not be a generic JavaScript-readable Keychain getter. If the native-broker option is selected, a pinned, audited Keychain plugin remains entirely behind native authentication operations. `@aparajita/capacitor-secure-storage` is a candidate implementation detail, not an approved page-facing bridge. Ionic Identity Vault remains a paid fallback if a supported policy/biometric vault becomes necessary.
- Do not use Capacitor Preferences for secrets. Its iOS storage is UserDefaults, not an encrypted credential vault.

### Remote-runtime credential threat model and real-data gate

The page is remotely deployable code from the trusted Aurum origin. If that deployment, build pipeline, dependency graph, or served JavaScript is compromised, the malicious code runs with the same origin and bridge permissions as legitimate code. Origin pinning prevents an unrelated origin from using the bridge, and CSP can reduce some injection paths, but neither prevents trusted-origin code from calling an exposed `getRefreshToken()`-style API and exfiltrating its result.

Before real personal financial data, 17D must select, implement, and device-test one of:

1. **Native authentication broker:** native code owns login, refresh, logout, logout-all, Keychain persistence, and rotation; it never returns the raw refresh token to page JavaScript.
2. **Same-origin HttpOnly cookie:** the hosted Next.js/auth path keeps the refresh credential in an `HttpOnly`, `Secure`, appropriately `SameSite` cookie that JavaScript cannot read.
3. **Model A before real data:** move the native client to signed bundled assets, then evaluate a minimal Keychain adapter within that signed-code threat model.

The 17D validation must actively prove that Aurum application JavaScript cannot retrieve or exfiltrate the long-lived credential. Storage-at-rest encryption, origin checks, and a successful login are not sufficient evidence.

### Token placement

- Long-lived refresh credential: never JavaScript-readable in an approved real-data Model B architecture.
- Native-broker option: refresh token remains in Keychain with iCloud synchronization disabled and is used only by native authentication operations.
- HttpOnly-cookie option: refresh credential remains in the server-set cookie and is unavailable to both page JavaScript and the native bridge.
- Model A option: Keychain use is evaluated only after the signed bundled-asset boundary is in place.
- Short-lived access credential: memory only and exposed to page JavaScript only to the minimum extent required by the selected 17D design.
- Existing browser tokens: current browser storage remains a non-sensitive compatibility baseline, not approval for Model B real-data use.
- Financial data: never copied into Keychain, Preferences, or a native database.

Storing a short-lived access token in Keychain adds persistent attack surface without materially improving recovery. On termination, the access token is lost. The selected credential owner restores the session without returning the raw refresh credential to remotely served JavaScript.

### Refresh and concurrency

The current API rotates refresh tokens and treats reuse as compromise. The web client does not deduplicate refresh calls, so simultaneous 401 responses can race: one rotates successfully, a second reuses the old token, and the server may revoke the entire token family. Before real data:

1. all requests must share a single `refreshPromise`;
2. waiting requests retry once after that promise resolves;
3. the refresh request itself must never recursively refresh;
4. failed rotation clears local credentials and returns to sign-in;
5. auth concurrency, reuse, revocation, and retry behavior must have automated tests.

For the native-broker or Model A Keychain option, the server response and Keychain write cannot be made truly atomic. If the app terminates after server rotation but before storing the replacement, the safe recovery is a new sign-in.

### Lifecycle and revocation

- launch: detect the selected credential owner and restore the session without hydrating the raw refresh credential into remote page JavaScript;
- background: perform no background financial action and do not depend on access-token validity;
- foreground: revalidate session before protected work;
- logout: ask the selected credential owner to revoke the session, then clear every applicable memory, Keychain, HttpOnly-cookie, browser-storage, and duplicate-cookie location;
- logout all: expose the existing API operation in the client and clear the current device regardless of network result;
- server rejection/reuse detection: clear the device session immediately;
- access tokens remain usable until their short expiry after logout; this is accepted for the private beta and should be revisited for higher-risk distribution.

If 17D selects a Keychain-based broker or Model A storage, iOS Keychain items can survive uninstall. Store a non-secret first-launch marker in Preferences/UserDefaults. If the marker is absent, clear the Aurum Keychain entry before session restoration, then create the marker. Device tests must cover install, restart, background/resume, logout, logout-all, offline logout, uninstall/reinstall, clock/token expiry behavior, and an attempted long-lived-credential read/exfiltration from application JavaScript.

## API and CORS Decision

The normal beta path uses the hosted Next.js origin and same-origin `/api` requests. Next proxies those requests to NestJS using a **server-only internal** API target environment variable. Public `NEXT_PUBLIC_*` direct API configuration and direct production fallback are disabled.

Production topology:

- public web: `https://<web-provider-domain>` serving Next.js;
- private API: provider-internal NestJS service address with no public domain;
- private database: provider-internal PostgreSQL connection with external/public access disabled;
- browser and iOS WebView: web origin `/api`;
- Next.js server: `INTERNAL_API_BASE_URL` (or equivalent server-only variable) pointing to the private NestJS address;
- direct browser/native production API access: disabled.

The normal production Model B request path does not depend on browser CORS because the browser/WebView calls its own Next.js origin and only the Next.js server reaches private NestJS. Development CORS origins belong to a separate development configuration and must never be carried into beta. `capacitor://localhost` is needed only if Model A or another explicitly introduced direct native API path is exercised.

Any future direct production API must be introduced deliberately with a new threat model, public-edge controls, authentication review, rate limiting, logging/redaction, and an exact CORS allowlist. Never use wildcard origins with credentials.

Local physical-device development should use a trusted HTTPS tunnel or a reachable LAN Next.js development URL configured only in the debug shell. The Next.js development server can continue proxying to the Mac-hosted API. Production remote-host settings must never be copied into arbitrary-navigation allowlists.

All external destinations use the Capacitor Browser plugin/system browser. Do not allow OAuth, arbitrary links, or user-controlled origins to remain inside the privileged WebView. Provider OAuth and redirect integration remains deferred until its own threat model and device tests exist.

The API contract remains `/v1`. Before a future native client depends on it, stabilize and document:

- authentication and refresh error semantics;
- one consistent error envelope and machine-readable codes;
- money/decimal and date/time serialization;
- pagination/filtering conventions;
- snapshot/artifact schemas and immutability rules;
- client/version compatibility policy.

Generate an OpenAPI-derived client once those semantics are stable; do not continue duplicating contract types independently across web and future native code.

When a future SwiftUI client requires direct server access, expose a deliberately public versioned API through an API gateway or introduce a mobile BFF. Do not make the private M17 NestJS service public in anticipation of that future client.

## Private Deployment Direction

### Primary: Render

Use three same-region services:

1. one public paid Node web service for Next.js;
2. one paid **private** Node service for NestJS, reachable only from same-region services over Render's private network;
3. one paid managed PostgreSQL database using its internal connection URL with external/public access disabled.

As checked on 2026-07-22, Render lists Starter web services at $7/month each. PostgreSQL entry tiers range from $6/month for 256 MB to $19/month for 1 GB, plus storage. A realistic private-beta base is approximately $21–35/month and should be budgeted at $25–45/month after storage and backup/export overhead. Pricing must be rechecked at provisioning.

Use a provider-assigned HTTPS domain for the public Next.js service initially. NestJS receives no public `onrender.com` domain, and PostgreSQL external access is disabled. Next.js uses a server-only private-service address for the rewrite/proxy. Place all three resources in one region. Paid services avoid free-tier sleeping/cold-start behavior. Introduce a stable custom web domain before any distribution where a provider hostname embedded in installed shells would become an operational trap.

Required operational controls:

- separate dev/demo and beta services, databases, credentials, and encryption keys;
- secrets only in provider secret configuration, never browser-visible variables or Git;
- a pre-deploy/release command running `prisma migrate deploy`;
- expand/contract database migrations so the previous application version remains usable during rollback;
- health checks for web and API;
- retained deployment rollback for application code;
- paid PostgreSQL point-in-time recovery where available;
- scheduled encrypted logical PostgreSQL exports stored outside the hosting account;
- a documented and successful isolated restore drill before real data.

The existing application-level backup is a convenience export, not disaster recovery: it omits connected-finance, portfolio, AI, identity, and other durable state. Full database backup is required. Encryption keys for provider secrets must be backed up separately and securely or restored encrypted rows will be unusable.

### Fallback: Railway

Railway is the fallback if Render provisioning, regional availability, or operational fit blocks 17E. Expose only the Next.js service through Railway public networking. Keep NestJS on its `railway.internal` private address with no generated public domain, and use the private `DATABASE_URL` without a public database TCP proxy where platform capabilities permit. As checked on 2026-07-22, Hobby has a $5 minimum with usage credits; Pro has a $20 minimum, with compute/storage metered. A small beta is estimated at roughly $10–30/month on Hobby or $20+ on Pro, but usage must be measured.

Railway volume backups provide useful daily/weekly/monthly recovery points, but the documented same-project restore limitations and evolving backup feature mean they are not the only copy. Keep the same encrypted off-platform PostgreSQL dump and isolated restore requirement.

Railway is suitable for real private-beta financial data only after the same separation, secret, migration, paid-service reliability, backup, restore, logging, and physical-device gates required for Render. Neither provider selection alone makes the system safe.

### Portability

The system remains portable because it is standard Node.js plus PostgreSQL, Prisma migrations, and environment configuration. No Redis runtime is currently used and none should be added for Milestone 17. Containerization or AWS migration can be evaluated later from measured needs; neither is required to preserve portability now.

## Data Safety Decision

No real private-beta financial data may be entered until all data gates pass:

1. **17B:** baseline repository CI is present and passing;
2. **17D:** select and implement a native authentication broker, same-origin HttpOnly Secure refresh-cookie architecture, or Model A signed bundled assets;
3. **17D/17F:** device validation proves application JavaScript cannot retrieve or exfiltrate the long-lived credential;
4. **17D:** refresh single-flight behavior and revocation tests pass;
5. **17E:** demo/dev and beta use separate services, databases, JWT secrets, encryption keys, and user credentials;
6. **17G:** `prisma/seed.ts` has a production/beta guard and explicit opt-in because it creates or resets the predictable `demo@aurum.local` / `password123` account;
7. **17E:** the public Next.js/private NestJS/private PostgreSQL environment is deployed with least-privilege secrets and no direct production API path;
8. **17E/17G:** full encrypted PostgreSQL backup completes and an isolated restore is proven;
9. **17F/17I:** physical-device acceptance covers auth, network loss, restart, external navigation, and core read/write workflows;
10. **17G:** logs are reviewed for tokens, provider payloads, financial content, and upstream response bodies.

Seed is not currently invoked by install, build, normal start, or `prisma migrate deploy`, which is positive. It is nevertheless unsafe to run accidentally against beta because it resets a known credential and writes synthetic finance data. The restore CLI also needs environment/confirmation guards before being considered an operational beta tool.

Create the real beta user through the normal registration flow in the isolated beta environment. That path creates a blank user and does not attach demo finance data. Do not copy or rename the seeded demo user. Destructive restore/wipe commands must require an explicit target environment, typed confirmation, and a pre-operation backup; production/beta execution must fail closed by default.

Production logging must not persist request authorization, refresh/access tokens, provider tokens, raw financial payloads, AI prompts containing financial context, or unbounded upstream error bodies. Add request IDs and structured redaction. The existing root `.tmp-*.log` files are untracked and outside this change; `.tmp-*.log` should be ignored and local diagnostic capture should remain disposable.

Import endpoints require explicit size, MIME/content, row-count, and timeout limits before exposure from iOS. Native file import/export and sharing are deferred rather than assumed safe because the present web UI does not expose the existing CSV API endpoints.

## Native Shell Boundaries

The native shell owns only:

- WebView creation and lifecycle;
- trusted-origin pinning and external-navigation handoff;
- the 17D-selected authentication boundary; if a native broker is chosen, it may own authentication lifecycle and Keychain access but no financial-domain behavior;
- first-launch cleanup marker;
- local loading, unrecoverable configuration, and outage/retry presentation;
- safe-area, status-bar, keyboard, orientation, and display integration;
- application identifier, signing, build configuration, and installed bridge version;
- device diagnostics that contain no financial content or credentials.

The native shell does **not** own:

- accounts, transactions, categories, holdings, snapshots, or financial persistence;
- balances, valuation, performance, scoring, or recommendation calculations;
- connected-finance provider orchestration;
- AI workflow prompts, execution state, or artifact business rules;
- a SQLite financial database, offline mutation queue, or synchronization engine;
- API-domain policy or database migrations.

The bridge must be minimal, capability-versioned, origin-gated, and documented. Origin gating does not make a raw token getter safe from compromised trusted-origin JavaScript. No raw refresh-token getter, generic arbitrary Keychain API, arbitrary HTTP proxy, or native code execution surface is exposed to page JavaScript.

## Future Migration Compatibility

A future SwiftUI client can consume the same stabilized `/v1` API and PostgreSQL data without moving financial records off the server. The Capacitor shell can then be retired as a client replacement, not a data migration.

Before SwiftUI work, formalize the API contract and extract service seams where coupling is currently highest:

- authentication/session contract and rotation semantics;
- ledger/accounts/transactions/categories application services;
- connected-finance provider adapters and orchestration;
- portfolio snapshots, valuation, performance, and scoring;
- AI tasks, immutable inputs, source lineage, and report artifacts.

The current provider-neutral contracts in `packages/core` are a good base. The large connected-finance and portfolio services mix persistence, orchestration, provider access, and calculation concerns; split them along domain/service boundaries before a second first-class client increases the cost of change.

AI and snapshot records already preserve useful version and source fields. Extend lineage with immutable input hashes, provider/model identity, workflow version, and explicit source artifact references so future clients reproduce or explain results rather than embedding model behavior locally.

A native-specific BFF is not justified now. Add one only if measured native needs diverge materially from browser API composition, and keep domain behavior in shared server services.

Capacitor and a future SwiftUI client may coexist during migration because both use the same versioned server contract and neither owns a second financial database. Move workflows incrementally, keep API compatibility for both clients during a declared window, and retire the shell only after native acceptance. A later cloud database move likewise uses PostgreSQL backup/restore or replication behind the API and does not require a client-data migration.

## Accepted Private-Beta Debt

- remote hosted Next.js runtime inside the Capacitor shell;
- direct Xcode installation and Personal Team re-signing constraints;
- no TestFlight or App Store readiness claim;
- hard dependency on network, hosted web, API, and database availability;
- provider hostname embedded in the shell until stable domain work is justified;
- browser localStorage session behavior retained only as a non-sensitive development/demo compatibility baseline until the 17D credential decision;
- access tokens remain valid until short expiry after logout;
- one region, basic observability, and manual operational response;
- no meaningful offline finance workflow;
- no native CSV import/export/share path;
- provider OAuth/redirects and paid live provider traffic deferred;
- no push notification or background-sync infrastructure;
- web deployment can affect the installed shell immediately.

This debt is accepted only for a controlled owner beta. It must be reviewed before expanding users or distribution.

The unresolved remote-runtime credential boundary is a real-data blocker, not accepted security debt. Hosting Model B with real personal financial data is prohibited until the 17D gate is implemented and proven.

## Rejected Complexity

The following are explicitly out of Milestone 17 unless a later decision supplies new evidence:

- full SwiftUI rewrite;
- React Native or Expo parallel client;
- SQLite or Core Data as a second financial source of truth;
- CloudKit synchronization;
- local-first mutation queues and conflict resolution;
- microservices decomposition;
- Kubernetes;
- multi-region active/active deployment;
- native background account syncing;
- App Store or TestFlight release work;
- push notifications;
- native chart or design-system rewrite;
- paid live Plaid, SnapTrade, Coinbase, market-data, or AI rollout;
- trading, transfers, or money-movement capabilities;
- new Redis dependency when no current runtime feature uses it;
- hybrid local/remote product navigation without a demonstrated offline requirement.

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation | Validation phase |
| --- | --- | --- | --- | --- |
| Remote `server.url` behaves poorly or is unacceptable beyond direct install | Medium | High | Limit to owner beta; pin HTTPS origin; keep Model A conversion documented; revisit before external distribution | 17C, 17F, 17H |
| Parallel 401s trigger refresh-token reuse revocation | High today | High | Single-flight refresh coordinator, one retry, concurrency/reuse tests | 17D |
| Compromised trusted-origin JavaScript retrieves or exfiltrates a Keychain refresh token | High if a raw-token bridge exists | Critical | Prohibit generic token getters; select native broker, HttpOnly cookie, or Model A; prove JavaScript cannot retrieve/exfiltrate the credential | 17D, 17F |
| Keychain token survives uninstall unexpectedly | Medium | Medium | If Keychain is selected, a Preferences first-launch marker clears the Aurum entry before restore | 17D, 17F |
| Trusted web deployment gains an unsafe non-credential native bridge | Medium | High | Pin origin, restrict navigation, expose minimal capability-versioned operations, apply CSP and dependency hygiene | 17C, 17F |
| Current direct fallback leaves NestJS publicly reachable or bypasses the Next.js boundary | Medium today | High | Disable direct production fallback; deploy private NestJS; use a server-only internal API URL | 17E |
| Web/API outage makes app unusable | Medium | High | Paid services, health checks, local outage/retry screen, monitoring, no false offline promise | 17E, 17F |
| Web deployment is incompatible with installed shell | Medium | High | Versioned capability handshake, compatibility window, fail-closed upgrade screen, deployment smoke tests | 17C, 17E, 17F |
| Accidental demo seed contaminates beta or resets a known account | Medium today | High | Environment guard, explicit opt-in, separate beta database and credentials | 17G |
| Database loss or unusable encrypted provider rows | Low–Medium | Critical | PITR, encrypted off-platform dump, separate key escrow, isolated restore drill | 17E, 17G |
| Logs leak financial/provider/AI content | Medium today | High | Structured logging, redaction, bounded upstream messages, no secret payload logs | 17G |
| Provider hostname changes and strands installed shell | Low | Medium | Stable custom web domain before broader distribution; retain old redirect/host through transition | 17C, 17E, 17H |
| External/OAuth navigation remains inside privileged WebView | Medium | High | System Browser plugin, strict navigation allowlist, defer provider OAuth until tested | 17C, 17F |
| Safe areas, keyboard, charts, prompts, or window behavior fail on device | Medium | Medium | Focused iPhone test matrix and replace browser-only interactions where necessary | 17F |
| Existing backup is mistaken for full recovery | High today | Critical | Label it partial; use full PostgreSQL backup; restore complete database in isolation | 17E, 17G |
| No CI allows regression after the audit | Medium | High | Add frozen install, lint, typecheck, unit/e2e, build, Prisma, migration checks before or within foundation work | 17B |

## Implementation Handoff

### 17B – Capacitor foundation and baseline CI

- add the minimum compatible Capacitor packages and generate the iOS project from macOS;
- configure separate debug and release web origins without adding a static product fork;
- define the minimal capability-versioned native bridge contract;
- add a local loading/configuration/outage frame and system-browser handoff;
- prove a non-production hosted page can load on the target device;
- add baseline repository CI covering frozen pnpm install, lint, typecheck, API unit tests, API e2e tests, web/API/core production build, Prisma validate, and migration deployment against disposable PostgreSQL;
- keep the macOS/Xcode build manual initially;
- add no financial logic, real data, provider credentials, or unnecessary native permissions.

Exit: baseline CI protects the repository and the disposable shell builds and loads a non-production environment on device; no claim of secure authentication or beta readiness is made.

### 17C – App identity, native configuration, and trusted-origin policy

- set bundle identifier, display name, icons/splash assets, minimum iOS target, and configuration naming;
- pin the trusted release origin and restrict all other navigation;
- configure status bar, safe areas, keyboard, orientation, privacy manifest, and only required entitlements;
- document native/web bridge compatibility and shell configuration failure states.

Exit: app identity and origin policy are stable, reviewable, and environment-specific.

### 17D – Authentication and credential boundary

- run the explicit remote-runtime threat-model/security spike;
- select a native authentication broker, same-origin HttpOnly Secure refresh cookie, or Model A signed bundled assets before real-data use;
- ensure no generic JavaScript-readable Keychain refresh-token adapter exists;
- implement the selected browser/native authentication boundaries and audit any selected Keychain plugin with iCloud synchronization disabled;
- implement first-launch cleanup, single-flight refresh, one-retry 401 recovery, logout, logout-all, and revocation handling;
- add auth concurrency, restart, reuse, and revocation tests while preserving browser behavior;
- run an adversarial trusted-origin test build that enumerates the page bridge and attempts to retrieve or exfiltrate the long-lived credential, then document why the attempt cannot obtain it.

Exit: the selected authentication design is implemented and tested, and the credential non-exfiltration proof passes. Real data remains prohibited until every other data-safety gate also passes.

### 17E – Private hosting, migrations, and database recovery

- provision a public Render Next.js service, private Render NestJS service, and private-access PostgreSQL database in one region, or document the equivalent Railway fallback;
- configure a server-only internal API base URL and keep direct production API access disabled;
- separate dev/demo/beta secrets and databases;
- run `prisma migrate deploy` in release flow;
- configure health checks and deployment rollback;
- configure PITR plus encrypted off-platform logical export;
- complete and record an isolated restore with encryption keys.

Exit: the private hosting, migration, and database-recovery portion of the gate is satisfied. Real data remains prohibited until the 17D, 17F, and 17G gates also pass.

### 17F – WKWebView and physical-device runtime hardening

- test safe areas, status bar, keyboard/viewport resizing, date/number inputs, charts, modals, fixed navigation, history, and degraded network;
- replace unsuitable prompt/confirm/window interactions with accessible application UI;
- verify external navigation, clipboard policy, file input/export limitations, and deferred OAuth behavior;
- validate origin escape attempts, bridge capability mismatch, remote deployment failure, and local outage/retry handling;
- revalidate authentication lifecycle and the long-lived-credential non-exfiltration property on the physical iPhone;
- fix only device-proven issues while retaining the shared browser codepath.

Exit: critical WKWebView, physical-device runtime, navigation, and authentication-boundary defects are closed without expanding shell financial-domain responsibilities.

### 17G – Data safety and expanded operational validation

- add seed and restore environment/confirmation guards;
- add structured redacted logging, request IDs, bounded upstream errors, import limits, and shutdown handling;
- expand 17B CI with deployment smoke tests, security checks, backup/restore evidence, and later iOS automation where practical;
- configure paid database recovery plus encrypted off-platform logical exports and separate encryption-key escrow;
- complete and record an isolated full-database restore before real data.

Exit: seed/restore, logging, operational validation, and restore evidence satisfy the 17G portion of the data-safety gates.

### 17H – Signing and repeatable direct installation

- document Xcode signing, Personal Team expiry/re-signing, device registration, configuration selection, and reinstall process;
- document shell/web/API version relationships and emergency rollback;
- do not claim TestFlight or App Store readiness.

Exit: the owner can repeatably install the approved build on the target device.

### 17I – Real-world acceptance

- test iPhone 13 Pro sign-in, core read/write workflows, restart, background/resume, expiry, concurrent requests, logout, logout-all, offline states, and uninstall/reinstall;
- operate privacy-conscious uptime/error monitoring and exercise the deploy, rollback, outage, credential rotation, backup, and restore runbooks;
- use only the isolated beta user and confirm no paid provider, live trading, transfer, or background feature is enabled;
- record performance, reliability, and workflow findings from realistic use.

Exit: the owner accepts core workflows and the environment can be operated and recovered without undocumented local knowledge.

### 17J – Dogfood feedback and closeout

- create GitHub issue templates/labels for device, auth, data, UX, and deployment feedback;
- record accepted debt, incidents, restore evidence, validation results, and the distribution exit decision;
- decide whether to continue Model B, convert to Model A, or begin a separately scoped native-client program.

Exit: Milestone 17 evidence is complete and the next architecture decision has an explicit owner and trigger.

## References

- Repository evidence: `MILESTONE_17_AUDIT.md`
- Capacitor configuration: <https://capacitorjs.com/docs/config>
- Capacitor Preferences: <https://capacitorjs.com/docs/apis/preferences>
- Capacitor Browser: <https://capacitorjs.com/docs/apis/browser>
- secure-storage candidate: <https://www.npmjs.com/package/@aparajita/capacitor-secure-storage>
- Render pricing and PostgreSQL recovery: <https://render.com/pricing>, <https://render.com/docs/postgresql-backups>
- Render private services, private networking, and PostgreSQL access control: <https://render.com/docs/private-services>, <https://render.com/docs/private-network>, <https://render.com/docs/postgresql-creating-connecting>
- Railway pricing, private networking, and backups: <https://railway.com/pricing>, <https://docs.railway.com/private-networking>, <https://docs.railway.com/volumes/backups>
