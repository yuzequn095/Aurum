# Milestone 17D Closeout

## Status

**Complete with debt**

Milestone 17D establishes a deterministic browser and remote-WKWebView session
lifecycle. Concurrent protected requests now share one refresh operation,
startup validates the persisted session, invalid credentials clear predictably,
temporary transport failures remain retryable, and session epochs prevent late
refresh results from resurrecting a logout or overwriting a newer login.

The owner-only private beta deliberately retains a JavaScript-readable refresh
credential behind a single browser persistence boundary. That is accepted debt
for synthetic and low-sensitivity owner dogfood, not a claim that Model B is
ready for broader distribution or high-sensitivity credentials. Real personal
financial data remains outside this milestone because the 17E and 17G
infrastructure/data-safety gates are also incomplete.

## Repository baseline

| Item | Evidence |
| --- | --- |
| Starting commit | `b3f82f8d2ad846eb8832f9f468cf0c67912d3ca6` |
| Branch | `milestone-17/17d-auth-session-lifecycle` |
| Session-boundary commit | `39d0693` — `refactor(auth): establish explicit session boundaries` |
| Test commit | `e43df75` — `test(auth): cover refresh and session lifecycle races` |
| Hydration-state fix | `4f57dc9` — `fix(auth): preserve retryable hydration failures` |
| Documentation commit | `docs(m17): close authentication lifecycle phase` |
| macOS | 26.6.1 (25G76), Intel `x86_64` |
| Xcode | 26.5 (17F42) |
| Capacitor | 7.6.8 |
| Node / pnpm | Node v20.20.2 / pnpm 9.0.0 |
| Target device | iPhone 13 Pro |
| Device OS | iOS 26.6.2 |

The prompt expected iOS 26.5.2; device discovery reported 26.6.2 at final
validation. The branch started from current `origin/main`. Milestones 17A–17C
and the native identity/configuration contract were inspected and preserved.

## Previous authentication behavior

- Login returned `{ user, accessToken, refreshToken }` from NestJS.
- The web client placed both tokens and the email in `localStorage` and also
  duplicated both credentials into JavaScript-readable cookies.
- No Next.js middleware, server component, SSR path, or API flow consumed those
  cookies.
- Startup treated refresh-token presence as authentication without validating
  or rotating it.
- Each protected request handled its own 401 and refresh, so simultaneous 401s
  could submit the same rotating refresh token independently.
- Refresh failure cleared storage, but refresh/logout/new-login ordering had no
  epoch guard against a late response restoring stale state.
- The Capacitor remote-runtime path used exactly the same browser JavaScript
  authentication path; it had no native broker, Keychain store, or auth bridge.

The backend already hashed refresh tokens with SHA-256, stored their expiry and
rotation lineage in PostgreSQL, rotated in a transaction, detected reuse,
supported one-session logout and authenticated logout-all, and kept access
tokens stateless until their short expiry. The repository's development
defaults are 15 minutes for access tokens and 30 days for refresh tokens; 17D
did not change those values.

## Final authentication architecture

```text
login/register response
        |
        v
session manager ---- access token (memory only)
        |
        +---- refresh token + email (one localStorage record)
        |
protected API request -- Bearer access token --> /api/v1/...
        |
       401
        |
        v
shared refresh promise --> POST /api/v1/auth/refresh
        |                         |
        |                         +-- R1 revoked, R2 persisted
        v
retry original request once with the new access token

logout --> advance session epoch + clear local state first
       --> best-effort server revoke
       --> late refresh result is discarded
```

Credential persistence, session lifecycle, refresh coordination,
authenticated transport, and React UI state are separate small layers.
Components establish or observe a session; they no longer read, write, or
infer authentication directly from token storage.

## Credential-storage decision

Three options were evaluated:

1. **Browser storage behind an explicit abstraction.** Lowest risk and one
   implementation for browsers and the remote WKWebView, but trusted-origin
   JavaScript can read the refresh credential.
2. **Same-origin HttpOnly refresh cookie.** Stronger JavaScript isolation, but
   requires coordinated NestJS/Next.js cookie forwarding, CSRF policy,
   WKWebView cookie-lifecycle testing, development behavior, and logout changes.
   It was not the smallest correctness fix for the current owner-only phase.
3. **Native broker/Keychain.** Rejected for 17D owner dogfood because it creates
   a second authentication architecture. A generic token getter would not
   improve the remote-runtime threat boundary and remains prohibited.

Option 1 is selected for the current owner-only private beta. The access token
is memory-only. The refresh token and user email use one versionable
`aurum.authSession` localStorage record through `CredentialPersistence`.
Legacy localStorage entries migrate on the next successful login/rotation, the
legacy access-token entry is removed immediately, and the unused JavaScript
cookies are expired and never recreated.

**Trusted-origin JavaScript can still read the refresh credential. This is
accepted owner-only private-beta debt; it must be revisited before broader
distribution or storing high-sensitivity credentials.**

No native secure-storage dependency, native auth plugin, generic bridge,
Keychain token getter, or financial native state was added. The web application
continues to work in an ordinary browser.

## Single-flight refresh

`AuthSessionManager` owns one module-level in-flight promise for the current
session epoch. Every same-context caller receives that promise. On success, the
rotated refresh credential is persisted once and all waiters receive the same
access token. On invalid-auth failure, the session is invalidated once and all
waiters reject consistently. Temporary transport/server failure rejects the
waiters without deleting the persisted session.

The Web Locks API serializes refresh across browser tabs where supported so two
tabs cannot concurrently reuse the same rotating credential. Because access
tokens are intentionally memory-only per tab, a later tab may perform a
subsequent serialized rotation rather than share another tab's access token.

The refresh transport calls `/v1/auth/refresh` directly and can never recurse
through authenticated-fetch behavior. Each original protected request retries
at most once. A second 401 invalidates the local session; no loop is possible.

## Session hydration

UI state is explicit:

- `checking`: startup is validating a persisted credential;
- `authenticated`: login or controlled refresh produced a valid access token;
- `unauthenticated`: no credential exists or the server rejected it;
- `unavailable`: a persisted credential exists but a temporary network/server
  failure prevented validation.

No refresh credential means no request and an unauthenticated result. A valid
credential is rotated before protected UI is admitted. Invalid/revoked/expired
credentials clear the session. A transport failure preserves the credential
and presents a retryable session-check state instead of unexpectedly logging
the owner out.

## Rotation / revocation lifecycle

The backend contract remains unchanged and is now covered directly by e2e
tests:

- login creates a database record containing a SHA-256 token hash, expiry, and
  optional client metadata;
- refresh verifies the JWT and stored record, creates R2, and atomically marks
  R1 revoked with parent/replacement lineage;
- reuse of a rotated, revoked, or expired stored credential revokes all active
  refresh records for that user;
- an invalid JWT is unauthorized;
- logout revokes the submitted refresh session;
- logout-all revokes every active refresh session for the authenticated user;
- stateless access tokens remain valid until their configured short expiry.

A direct concurrent-backend test confirms one R1 request succeeds, the second
is rejected, and reuse protection revokes the family. The browser coordinator
prevents a legitimate same-client burst from reaching that failure mode.

## Logout lifecycle

Normal logout captures the current credential, advances the session epoch,
clears in-memory access and persisted state, publishes unauthenticated state,
and then asks the server to revoke the captured refresh session. Logout-all
uses the captured access token to invoke the existing revoke-all endpoint.
Local logout remains authoritative when the network is unavailable.

An epoch guard makes late results inert. A refresh started before logout cannot
restore the old session. If logout is followed by a new login, the new session
has a newer epoch and an old refresh response cannot overwrite it. A new login
also drops any stale in-flight promise reference.

## Browser validation

| Test | Result | Evidence/Notes |
| ---- | ------ | -------------- |
| Login page render | Pass | Local Next.js `/login` returned 200 and rendered in installed Chrome through an ephemeral Playwright smoke check. |
| Login | Pass | Synthetic demo credentials reached `/dashboard`. |
| Authenticated navigation | Pass | Direct navigation to `/portfolio` remained authenticated. |
| Page reload / restore | Pass | Reload stayed on `/dashboard` after controlled refresh hydration. |
| Storage policy | Pass | One persistent session record existed; legacy access/refresh entries and both old auth cookies were absent. |
| Access refresh and retry | Pass | Deterministic browser-oriented tests cover successful rotation, bounded retry, and six-request bursts. |
| Logout | Pass | Server-backed logout returned the browser to `/login`. |
| Invalid session | Pass | Automated hydration tests and physical revocation test produced unauthenticated state. |
| Temporary interruption | Pass | Temporary refresh failure preserved persistence and exposed retryable `unavailable` state. |

The final Chrome interruption check also proved that `AuthGate` keeps the
retryable state on the original protected route instead of redirecting it to
login; restoring the refresh transport and pressing Retry returned to the
dashboard.

The Playwright tool was used ephemerally and was not added to the repository or
lockfile.

## Automated tests

The new web suite contains 14 deterministic tests:

- six concurrent protected 401s share exactly one refresh and all retry with
  the same new access token;
- a protected request retries once;
- a second 401 invalidates without an infinite loop;
- `/auth/refresh` never recursively refreshes;
- temporary refresh failure preserves the session;
- legacy access/cookie duplication is removed during migration;
- eight direct refresh callers share one rotation and one persistence write;
- five failed waiters share one refresh and one invalidation;
- hydration covers absent, valid, invalid/revoked, and temporary-failure cases;
- refresh-in-flight plus logout cannot resurrect a session;
- an old refresh cannot overwrite a newer login.

The new API auth e2e suite contains five high-value lifecycle tests covering
login response shape, valid rotation and old-token reuse, revoked/invalid/
expired tokens, logout-all across multiple sessions, and concurrent rotation.

Final results:

| Command | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | Pass |
| `pnpm lint` | Pass, 3 lint tasks |
| `pnpm typecheck` | Pass, 4 workspace tasks |
| `pnpm --filter web test` | Pass, 14/14 |
| `pnpm --filter api test -- --runInBand` | Pass, 22 suites / 113 tests |
| `pnpm --filter api test:e2e` | Pass, 3 suites / 10 tests |
| `pnpm --filter mobile-shell test` | Pass, 18/18 |
| `pnpm build` | Pass, 4 workspace tasks |
| `pnpm mobile:doctor` | Pass; Xcode 26.5 and CocoaPods detected |
| Clean unsigned Xcode Debug build | Pass |
| Personal Team signed iPhone build/install/launch | Pass |
| GitHub Actions | Pass on the final branch |

The pre-existing CocoaPods 1.11.2 `ffi` native-extension warning remains
non-blocking. No Ruby/CocoaPods repair or native configuration change was
needed. One incorrect local e2e invocation passed `--runInBand` through as a
Jest filename pattern and found no tests; the repository's exact `test:e2e`
script was then run successfully as recorded above.

## Physical-device validation

All device testing used the synthetic demo account, the isolated local M17
PostgreSQL database, local Next.js/NestJS processes, and a temporary ignored
HTTPS tunnel. No temporary URL, credential, signing identity, Team ID,
provisioning profile, or device identifier is committed.

| Test | Result | Evidence/Notes |
| ---- | ------ | -------------- |
| 1. App launches | Pass | Signed Aurum build launched on the connected iPhone 13 Pro. |
| 2. Unauthenticated state | Pass | Login UI rendered without exposing protected product state. |
| 3. Demo login | Pass | Synthetic demo account authenticated successfully. |
| 4. Dashboard | Pass | Authenticated dashboard and seeded synthetic data rendered. |
| 5. Background / foreground | Pass | Session and usable WebView state were preserved/restored. |
| 6. Termination / relaunch | Pass | Force-quit/relaunch performed controlled hydration and restored the dashboard. |
| 7. Authenticated navigation | Pass | Dashboard, Portfolio, Transactions, and AI surfaces remained authenticated. |
| 8. Logout | Pass | Settings logout returned to the login state. |
| 9. Relaunch after logout | Pass | Force-quit/relaunch remained logged out. |
| 10. Login again | Pass | A fresh login succeeded after logout. |
| 11. Temporary network loss | Pass | Airplane-mode interruption recovered after connectivity/Retry without pathological auth behavior. |
| 12. Expired access token | Pass | A temporary 2-second development TTL forced repeated refresh; normal 15-minute TTL was restored afterward. |
| 13. Concurrent protected requests | Pass | Rapid navigation after expiry loaded all surfaces without unexpected logout; server rotation evidence increased without legitimate-client reuse failure. |
| 14. Revoked refresh credential | Pass | Active synthetic sessions were revoked in the disposable database; relaunch produced clean login and a subsequent login succeeded. |
| 15. Credential exposure | Pass | No token/password appeared in UI or application diagnostics; code logs no credentials or authorization headers. |
| 16. Native permissions | Pass | No unexpected iOS permission prompt appeared. |
| 17. Xcode signing/install | Pass | Clean signed Debug build, device installation, and launch succeeded with Personal Team signing. |
| 18. 17C boundary preservation | Pass | Identity, icon, launch, portrait policy, minimum target, trusted origin, privacy, and entitlement baseline are unchanged. |

The owner observed some page-transition/loading lag during the deliberately
2-second access-token test over the temporary tunnel. It did not cause failed
navigation or logout and is recorded as later performance/UX evidence rather
than expanded into 17D.

## Security scope

17D claims functional session correctness for an owner-only direct-installed
beta using synthetic/low-sensitivity dogfood boundaries. It does not claim:

- protection from malicious JavaScript legitimately served by the trusted web
  origin;
- readiness for provider credentials, bank/broker credentials, OAuth tokens,
  SSNs, card numbers, tax documents, or raw statements;
- enterprise session monitoring, device inventory, attestation, pinning,
  biometrics, WAF/SIEM, or hardware-backed custom cryptography;
- a native Auth Broker, Keychain refresh storage, HttpOnly-cookie migration,
  provider OAuth, production hosting, TestFlight, or App Store readiness.

No real financial data, provider credential, secret-bearing bridge, native
financial model, native database, or offline financial mutation queue was used
or introduced.

## Known debt

### Owner-only dogfood debt

- The refresh credential remains JavaScript-readable in browser localStorage.
- Offline logout clears the device immediately but cannot guarantee immediate
  server revocation until connectivity exists; no offline revocation queue was
  added.
- Access tokens remain valid server-side until their short expiry after logout.
- Web Locks prevent cross-tab reuse races, but independent tabs keep separate
  in-memory access tokens and may perform sequential rotations.
- The temporary tunnel and deliberately short expiry made page transitions
  feel slower during stress testing; stable-host performance remains unmeasured.
- Personal Team provisioning remains time-limited.

### Before broader distribution

- Revisit the refresh-credential boundary: same-origin HttpOnly cookie, a
  non-secret-returning native broker, or Model A must be chosen against the
  actual hosting/distribution threat model.
- Add CSRF/cookie-lifecycle evidence if HttpOnly cookies are selected.
- Add multi-user/device session visibility and stronger revocation operations
  only when product scope demonstrates the need.
- Reassess CSP/dependency supply-chain controls and credential-exfiltration
  tests before high-sensitivity or provider credentials are ever introduced.
- Complete 17E hosting and 17G data-safety/backup gates before real-data use.

## 17E handoff

17E is hosting only:

- establish stable separated Next.js and NestJS environments;
- provision managed PostgreSQL for the private beta;
- separate development and beta databases, JWT secrets, encryption keys, and
  user credentials;
- supply the stable trusted HTTPS Release origin through the 17C contract;
- run controlled Prisma migrations;
- establish basic health checks, rollback, backup, restore, and recovery
  evidence.

17E must not redesign the 17D authentication lifecycle. The JavaScript-readable
credential debt remains explicitly tracked for review before broader
distribution/high-sensitivity credentials.
