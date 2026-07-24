# Milestone 17A Repository and Capacitor Feasibility Audit

## Audit status

Completed on 2026-07-22 against commit `8b9c0629a65fc7ccb932c823d40c38b88e6f5ec6`, which matched `origin/main` after `git fetch origin`.

This audit determines feasibility and architecture only. It does not add Capacitor, create an iOS project, install an app, implement Keychain storage, deploy infrastructure, or validate TestFlight. The design-demo repositories were treated as visual references only; their Vite/AI Studio implementations are not present in or authoritative for Aurum.

Architecture-review corrections were incorporated on 2026-07-23. They clarify that trusted-origin remote JavaScript remains capable of abusing any JavaScript-readable native credential bridge, make the primary NestJS/PostgreSQL topology private, move baseline CI to 17B, and normalize phase ownership. These corrections do not claim that secure mobile authentication or real-data readiness is implemented.

## Repository state inspected

- Branch at audit start: `main`, matching `origin/main`.
- Audit branch: `milestone-17/17a-architecture-audit`.
- Pre-existing worktree state: twelve untracked `.tmp-*.log` files at the repository root. They were not read, changed, deleted, staged, or committed.
- Workspace: pnpm 9 and Turborepo with `apps/api`, `apps/web`, `packages/core`, and a shared `packages/config/tsconfig.base.json` file. Turbo recognizes three script-bearing packages: `api`, `web`, and `@aurum/core`.
- Runtime versions used locally: Node `v20.20.0`, pnpm `9.0.0`, Docker `29.2.1`, Docker Compose `v5.0.2`.
- Application versions: Next.js `16.1.6`, React `19.2.3`, NestJS `11`, Prisma `7.4.1`, PostgreSQL 16.
- There are no Capacitor packages, native projects, secure-storage plugins, service workers, PWA packages, or web workers in the repository.
- There is no `.github/workflows` directory. Local validation has no repository CI counterpart.

## Files inspected

### Repository, infrastructure, and status

- `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `turbo.json`
- `.gitignore`, `.npmrc`, `.nvmrc`, `.eslintrc.cjs`, `.prettierrc`
- `infra/docker/docker-compose.yml`
- `scripts/aurum.ps1`, `scripts/dev-restart.ps1`, `scripts/install-aurum-command.ps1`
- `README.md`, `ROADMAP.md`, `test.md`
- `SYSTEM_ARCHITECTURE.md`, `PRODUCT_ARCHITECTURE.md`, `FINANCIAL_DOMAIN_MODEL.md`, `AI_ARCHITECTURE.md`
- `MILESTONE_14_CLOSEOUT.md`, `MILESTONE_15_CLOSEOUT.md`, and the Milestone 16 implementation/status sections in `README.md`
- There is no standalone `MILESTONE_16_CLOSEOUT.md`; the latest M16 closeout evidence is in `README.md`, tests, and commits `f9239e5`, `25bf3a3`, and `8b9c062`.

### Next.js application

- `apps/web/package.json`, `apps/web/next.config.ts`, `apps/web/middleware.ts`, `apps/web/README.md`
- all route layouts/pages under `apps/web/src/app`
- auth/session/API helpers under `apps/web/src/lib`
- app shell, navigation, modal, toast, chart, connected-finance, and portfolio components under `apps/web/src/components`
- global CSS and tokens under `apps/web/src/app/globals.css` and `apps/web/src/styles`

### NestJS, Prisma, data tooling, and tests

- `apps/api/package.json`, `apps/api/.env.example`, `apps/api/nest-cli.json`, `apps/api/prisma.config.ts`
- `apps/api/src/main.ts`, `apps/api/src/app.module.ts`, auth, import/export, Prisma, connected-finance, portfolio-snapshot, AI, entitlement, and conversation modules
- `apps/api/prisma/schema.prisma`, all 16 migrations, and `apps/api/prisma/seed.ts`
- `apps/api/scripts/assign-default-user.ts`, `reset-password.ts`, and `restore-backup.ts`
- all 22 API unit suites and both e2e files/configuration
- shared portfolio and AI contracts/application logic under `packages/core/src`

## Commands executed and results

| Command | Result |
| --- | --- |
| `git fetch origin` plus commit comparison | Pass; local `main` exactly matched `origin/main` at `8b9c062`. |
| `pnpm install` | Pass; lockfile current, no tracked change. |
| `pnpm lint` | Pass; API and web lint tasks passed. `@aurum/core` has no lint script. |
| `pnpm typecheck` | Pass; API, web, and core passed. |
| `pnpm build` | Pass; core, NestJS API, and Next.js production build passed. |
| `pnpm --filter api test` | Pass; 22 suites and 113 tests. |
| `pnpm --filter api test:e2e` | Pass; 2 suites and 5 tests. |
| `pnpm --filter api exec prisma validate` | Pass. |
| `pnpm --filter api exec prisma migrate status` | Pass against the local Docker database; 16 migrations found and schema current. |
| `pnpm --filter api test -- --runInBand` | Invocation failed before Jest because pnpm 9 parsed `runInBand` as an unknown pnpm option. The supported repository command above passed; this is not a code failure. |
| temporary `output: "export"` build, current route/rewrite behavior intact | Expected failure. Next warned that rewrites do not work automatically and rejected `/` because its `cache: "no-store"` API health fetch is dynamic. |
| temporary static export after neutralizing only the rewrite and dynamic `/` health fetch | Pass; all 13 application routes exported to 165 files. Next warned that middleware is disabled for static export. |
| production CORS preflight simulation | `capacitor://localhost` and a configured HTTPS web origin returned 204 with credentialed allow-origin headers; an untrusted origin returned 500/rejected. |
| restored `git diff` check | Pass; both experimental source edits were removed. Generated `apps/web/out` was also removed. |

The repository does not define a root `test` script or any web test script, so `pnpm test` and `pnpm --filter web test` are not supported commands. No Playwright/Cypress suite exists. Docker services were returned to their prior stopped state; the existing volume was not deleted.

## Rendering and Next.js findings

### Current behavior

- The web app uses the App Router.
- Almost every product page is a client component. The app/protected layouts are server components, but only compose client gates/shells and do not use runtime-only server APIs.
- `/` is an async server component and calls `${NEXT_PUBLIC_API_BASE_URL}/v1/health` with `cache: "no-store"`. It is the only route reported as dynamic by the production build.
- There are no Next route handlers, server actions, cookie/header reads, dynamic route parameters, or `generateStaticParams` functions.
- `middleware.ts` is a no-op `NextResponse.next()` middleware. It adds a Next runtime/proxy artifact but no product behavior.
- `next.config.ts` rewrites `/api/:path*` to the NestJS base URL. Current production behavior therefore requires a running Next server for `/`, the rewrite, and middleware, even though the product route tree is otherwise exportable.
- No route-level `loading.tsx`, `error.tsx`, or custom not-found boundary exists. Pages implement their own data loading/error states.
- Next/React client navigation and query/hash state have product meaning. Login and auth redirects use `window.location.href`; other navigation uses Next router/link APIs.

### Static-export conclusion

Static export is technically feasible but is not supported without changes today.

Current blockers are:

1. the dynamic, no-store health fetch on `/`;
2. the `/api` rewrite, which cannot be carried into the static bundle;
3. middleware, which is disabled by static export (currently no behavior is lost because it is a no-op);
4. the API client defaults to relative `/api`, which would resolve against `capacitor://localhost` in a normal bundled iOS shell;
5. environment/API URLs would be compiled into the bundle, coupling changes to an iOS rebuild and reinstallation.

The second experiment proved there are no additional route-level export blockers after (1) and (2) are neutralized. A bundled app would still require a direct HTTPS API URL, explicit CORS support for `capacitor://localhost`, auth changes, and device validation. This is materially more than changing `output` alone.

## Browser API and WKWebView inventory

### Present behavior

- Auth and developer-workbench records use `window.localStorage`.
- Auth also writes access and refresh tokens into JavaScript-readable cookies; no server code reads these cookies.
- Browser tab synchronization uses the `storage` event plus a custom same-tab event.
- The AI workbench uses `navigator.clipboard`; this is developer-only.
- SnapTrade uses `window.open(..., "_blank")` for its connection portal.
- Transactions still use browser-native `prompt` and `confirm` for secondary creation/deletion flows.
- Modals are fixed elements rendered in the existing React tree, not React portals. They lock `document.body` scrolling and use `100dvh` limits.
- Mobile bottom navigation is fixed. CSS accounts for `safe-area-inset-bottom`, but not top/side safe areas or native status-bar configuration.
- Date and number inputs rely on native browser controls. Recharts and custom SVG charts are client-rendered.
- There is no current file input, FormData upload, object URL, programmatic download, multiple-window workflow, service worker, or offline cache in the web UI.

### Import/export implications

- The API supports authenticated in-memory CSV upload endpoints, but the current product UI does not expose them.
- The API supports `Content-Disposition` CSV and JSON downloads, but the current UI does not call them.
- A plain navigation/download link cannot attach the bearer token required by these endpoints. A future WKWebView implementation should fetch with authorization, then use a native Filesystem/Share flow. It must not assume browser anchor downloads work reliably.
- CSV file selection should be tested with the iOS document picker on the physical device when a UI is added. The API currently has no explicit upload byte limit or MIME-type limit and buffers files in memory.

### Device risks requiring 17F testing

- keyboard resizing/occlusion of fixed bottom navigation and bottom-sheet modals;
- status bar, notch, and top safe-area treatment;
- swipe/back history behavior across Next client navigation and auth redirects;
- native prompt/confirm quality;
- clipboard permission/failure handling on the developer route;
- SnapTrade/Plaid/OAuth redirect behavior, which is deferred and should use explicit native external-browser boundaries rather than an unrestricted WebView;
- file picker, native export/share, date/number controls, chart sizing, background/foreground restoration, low-connectivity and web-runtime outage states.

## API findings

- Routes are explicitly versioned with `/v1` in controllers; there is no global prefix.
- All financial/product controllers are JWT guarded. Health, register, login, refresh, and logout are public as required; logout-all is access-token guarded.
- Production CORS uses an exact comma-separated origin allowlist and credentials. Development reflects any origin. The production allowlist always includes both local web origins; production should instead be fully explicit.
- With the selected remote-web model, normal browser calls remain same-origin through `/api`, so CORS is not involved in the primary path. The current direct fallback must be disabled/refactored before beta so Next.js alone reaches a private NestJS service over the provider network; the primary M17 topology has no public NestJS domain or browser CORS dependency.
- The simulated production preflight confirmed `capacitor://localhost` can be allowed by the current implementation for a future bundled/direct model.
- Global DTO validation whitelists, rejects non-whitelisted input, and transforms values.
- There is no custom exception filter, request-id middleware, structured request log, sensitive-field redaction layer, rate limiting, or production environment schema validation.
- Nest default logging is present. Quick Chat can log up to 240 characters of an upstream provider error body. Connected sync failures persist and expose provider error messages. These paths need redaction before real provider or financial payloads are enabled.
- Prisma connects on module initialization and disconnects on module destruction. `enableShutdownHooks()` is not called.
- API startup does not run migrations or seed data. The Windows-only `dev:restart` helper runs `prisma migrate deploy`; production must run this as a separate pre-deploy/release command.
- The compiled production entry point exists at `apps/api/dist/apps/api/src/main.js` and the declared `start:prod` command is valid after build.
- PostgreSQL uses normal tables, enums, JSONB, and numeric columns. No database extension or platform-specific feature is required. Redis is present in local Compose/environment examples but is not a runtime dependency in the inspected application code.

## Authentication and session findings

### Current implementation

- Both access and refresh JWTs are stored in `localStorage` and duplicated into JavaScript-readable `SameSite=Lax` cookies.
- Protected routes consider a user authenticated when a refresh token is present; there is no startup call that validates or refreshes the session before rendering.
- Session state survives browser reload/process restart through `localStorage`.
- Browser tabs receive localStorage change events. A native shell has one WebView, so tab synchronization is irrelevant there.
- The API issues 15-minute access and 30-day refresh tokens under the example configuration. Refresh tokens are hashed in PostgreSQL, rotated transactionally, linked to parents/replacements, and support reuse detection.
- Logout revokes the supplied refresh token and clears local state even on network failure. Logout-all revokes all refresh tokens, but there is no web client helper or settings action for it.
- Logout/logout-all do not revoke already issued stateless access JWTs; those remain valid until expiry.
- A request retries at most once after a 401, so there is no unbounded recursive refresh loop.

### Critical concurrency gap

`refreshAccessToken()` has no shared in-flight promise or queue. Multiple concurrent 401 responses can submit the same refresh token simultaneously. One rotation may succeed; another is then classified as reuse, and `AuthService.refresh()` revokes all refresh tokens for the user. The token returned by the nominally successful request can consequently be revoked immediately. The current test suite has no auth service/client concurrency coverage.

This must be fixed before real private-beta use. A single-flight refresh coordinator must serialize rotation, retry each original request at most once, never refresh the refresh request itself, and clear the session on final failure.

### Storage-boundary gap

There is no auth storage adapter. Token access is synchronous and directly imported across the API/session/logout helpers. Native secure storage is asynchronous, so the adapter boundary must be introduced before Keychain integration rather than patched into product components.

Keychain storage alone does not resolve the selected Model B threat model. JavaScript served by the pinned Aurum origin can call any bridge method granted to that origin. If a generic bridge returns the raw refresh token, compromised trusted-origin JavaScript can retrieve and exfiltrate it; origin pinning and CSP do not prevent that behavior.

Model B may use non-sensitive development/demo data during 17B. Real personal financial data is prohibited until 17D selects, implements, and device-tests a native authentication broker that never returns the raw refresh token, a same-origin `HttpOnly` `Secure` refresh-cookie architecture, or Model A signed bundled assets. Validation must prove that application JavaScript cannot retrieve or exfiltrate the long-lived credential.

## Data-safety findings

### Positive findings

- All main financial reads/writes inspected are user scoped and guarded.
- Registration creates a clean user; it does not attach demo data.
- Seed execution is explicit. Install, build, API startup, and `migrate deploy` do not invoke it.
- The seed targets the exact `demo@aurum.local` identity and marks demo connected-finance metadata. It does not attach demo data to an arbitrary registered user.
- Connected-provider secrets are AES-256-GCM encrypted with an application key from the environment. Provider integrations are optional and read-only at the product boundary.
- The application backup endpoint is user scoped and does not include provider credentials.

### Required hardening

- The seed has no `NODE_ENV`/explicit opt-in guard. If run against beta, it creates or resets a predictable demo login and populates demo financial data. Beta deployment identities must not have permission or startup commands that can run seed; 17G should add a fail-closed production guard.
- Root `.gitignore` does not ignore `.tmp-*.log`; twelve runtime logs are already untracked. Runtime logs may eventually contain sensitive context and must stay outside the repository or be ignored/redacted.
- Current `backup.json` covers only ledger accounts, categories, subcategories, and transactions. It omits identities, snapshots/positions, connected sources/accounts/manual valuations, AI reports/scores/conversations/preferences, entitlements, refresh records, and encrypted provider records. It is not a complete private-beta backup.
- The restore CLI can create/remap a target user and `wipe` ledger tables without an environment guard or interactive confirmation. It only restores the limited v1 ledger format. It must not be treated as production disaster recovery.
- A full PostgreSQL backup contains password hashes, refresh-token hashes, financial data, AI outputs, and encrypted provider payloads. It must itself be encrypted, access-controlled, retained separately from the application, and paired with separately protected application encryption/JWT secrets.
- Password reset accepts the new password as a command-line argument, which can persist in shell history/process metadata.
- Provider and LLM error logging needs structured redaction. Request bodies and bearer/refresh tokens must never be logged.

Before real data, use separate dev/demo/beta databases and secrets; prohibit seed in beta; create the real owner through `/register` or a one-time controlled bootstrap; run `prisma migrate deploy` once per release; establish managed PITR plus encrypted logical export; and pass a restore drill into an isolated database.

## Deployment findings

- The monorepo installs, lints, typechecks, tests, and builds cleanly on Node 20. There is no CI or application Dockerfile, so a hosting service needs explicit monorepo build/start commands.
- Web and API can be deployed separately. Next currently needs a full Node runtime for the dynamic root and rewrite/proxy. NestJS uses a standard Node process. Both are stateless with respect to local disk.
- PostgreSQL is portable standard PostgreSQL 16 with no special extension. Migrations are checked into the repository and should run as a release/pre-deploy step, never concurrently from every application replica.
- No custom domain is required. Provider-assigned HTTPS domains are sufficient for a private beta. The tradeoff is that a provider migration changes the web URL embedded in the shell and therefore requires a new device build unless a custom domain is added later.
- Paid, non-sleeping services are appropriate once real data is introduced. Free sleeping/expiring database tiers are suitable only for disposable experiments.
- The smallest stable primary topology is one public paid Next.js Node service, one paid private NestJS service reachable only through the same-region provider network, and one paid managed PostgreSQL database using an internal URL with external/public access disabled. Next.js uses a server-only internal API base URL; direct production API access is disabled. Redis is not required.
- A public versioned API, API gateway, or mobile BFF can be introduced later when a SwiftUI client requires direct server access; it is not a dependency or preemptive exposure in the primary M17 topology.
- See `MILESTONE_17_ARCHITECTURE_DECISION.md` for the selected provider direction, current cost ranges, backup/rollback policy, and fallback.

## Future-compatibility findings

### Healthy boundaries

- `/v1` API versioning already exists.
- `PortfolioSnapshot` remains the canonical portfolio analysis input and is server persisted.
- Snapshot delta/change explanation explicitly avoids realized-P&L and causal claims.
- Connected finance, ledger, portfolio snapshots, auth, and AI live in recognizable Nest modules.
- `packages/core` holds provider-neutral portfolio, snapshot, AI task, prompt, report, and score contracts.
- AI reports persist task type, prompt version, source run id, snapshot link, content, and metadata; scores persist scoring version and snapshot link. These are useful migration anchors for future provider/RAG/agent rewrites.

### Coupling/debt

- Web API view types are frequently duplicated in `apps/web/src/lib/api*` rather than generated from a formal contract. There is no OpenAPI artifact or mobile SDK.
- The 72 KB connected-finance service and 56 KB portfolio-snapshot service combine orchestration, Prisma access, mapping, provider behavior, and domain calculations. Controllers are generally thin, but future extraction seams need application/repository interfaces.
- Several large client pages own extensive workflow state. They are disposable UI, not a suitable source for SwiftUI domain rules.
- Prisma records/enums are used directly inside backend services. Public controllers usually map views, but DTO/error/pagination conventions are not fully formalized.
- `AIReportRecord.sourceSnapshotId` is nullable and server AI runs are represented by `sourceRunId` rather than a persisted, complete execution record. Future AI migration should preserve immutable input references/hashes, provider/model metadata, workflow version, timestamps, and output ownership.
- The current application backup does not provide a portable export of the full long-lived domain.

The Capacitor shell can be removed without moving financial data as long as M17 adds no local financial database and native code stays limited to lifecycle/storage/navigation/presentation bridges.

## Test and CI findings

- API unit coverage is substantial for connected finance, snapshots, AI workflows, artifacts, entitlements, and CSV parsing.
- E2E coverage is small: health plus four Milestone 16 contract cases, mostly with mocked services.
- There are no auth rotation/reuse/concurrency tests, web component tests, browser e2e tests, WKWebView tests, deployment smoke tests, migration-from-empty tests, backup restore drills, or CI workflows.
- Local validation exceeds any checked-in CI expectation because no CI configuration exists. Baseline CI belongs before or within 17B and must cover frozen pnpm install, lint, typecheck, API unit tests, API e2e tests, web/API/core production build, Prisma validate, and migration deployment against a disposable PostgreSQL service. The macOS/Xcode build may remain manual initially; 17G can add deployment smoke, security, backup/restore, and later iOS automation.

## External references checked

Checked on 2026-07-22:

- Capacitor v8 configuration: <https://capacitorjs.com/docs/config>
- Capacitor Preferences: <https://capacitorjs.com/docs/apis/preferences>
- Capacitor Browser plugin: <https://capacitorjs.com/docs/apis/browser>
- `@aparajita/capacitor-secure-storage` package: <https://www.npmjs.com/package/@aparajita/capacitor-secure-storage>
- Render pricing and Postgres recovery: <https://render.com/pricing>, <https://render.com/docs/postgresql-backups>
- Render private services, private networking, and Postgres access control: <https://render.com/docs/private-services>, <https://render.com/docs/private-network>, <https://render.com/docs/postgresql-creating-connecting>
- Railway pricing, private networking, and volume backups: <https://railway.com/pricing>, <https://docs.railway.com/private-networking>, <https://docs.railway.com/volumes/backups>
- Web/mobile design references: <https://github.com/yuzequn095/Aurum-Web-UX-Demo>, <https://github.com/yuzequn095/Aurum-Mobile-UX-Demo>

Capacitor v8 documents `localhost` as the default hostname and `capacitor` as the default iOS local scheme. It also documents remote `server.url` and expanded `allowNavigation` as development-oriented rather than production-oriented. The selected private-beta remote model accepts this as explicit direct-install debt and is not an App Store recommendation.

## Unresolved questions for later phases

1. The actual Xcode and iOS WebKit behavior on the owner's iPhone 13 Pro cannot be validated from Windows.
2. The final provider-assigned public web hostname and private API/database addresses do not exist until 17E.
3. The real-data credential boundary remains intentionally unresolved until 17D. Any selected open-source Keychain plugin must be pinned, inspected, kept behind the approved native boundary, and device-tested; Ionic Identity Vault remains a paid fallback if stronger supported vault/biometric policy becomes necessary.
4. App identifier, display name, signing team, and minimum iOS target belong to 17C/17H.
5. Provider OAuth/redirect workflows are intentionally deferred; no claim is made that Plaid, SnapTrade, or Coinbase connect flows work in WKWebView.
6. GitHub Issues is approved for dogfood feedback, but issue templates/labels belong to 17J.

## Blockers and debt classification

### Architecture-decision blockers

None. Repository evidence is sufficient to select a model and hand off 17B.

The unresolved credential boundary does not block a non-sensitive 17B foundation, but it is an explicit blocker to real personal financial data.

### Must pass before real private-beta data

- 17B baseline repository CI passing;
- 17D selection and implementation of a native authentication broker, same-origin HttpOnly Secure refresh cookie, or Model A signed bundled assets;
- 17D/17F device proof that application JavaScript cannot retrieve or exfiltrate the long-lived credential;
- 17D single-flight refresh and concurrency/revocation tests;
- 17E environment separation and private Next.js-to-NestJS/PostgreSQL topology with direct production API access disabled;
- 17G seed protection, logging hardening, and expanded operational validation;
- 17E/17G complete database backup and successful isolated restore test;
- 17F/17I device validation of auth lifecycle, network failure, external navigation, and core workflows.

### Non-blocking private-beta debt

- Personal Team re-signing and no TestFlight;
- remote web dependency and provider URL embedded in the shell;
- no offline financial workflows;
- deferred provider OAuth;
- basic observability and one region;
- browser localStorage retained only as a non-sensitive development/demo compatibility baseline until the 17D credential decision;
- no native CSV export/share until explicitly hardened;
- no paid live AI/market/provider rollout.
