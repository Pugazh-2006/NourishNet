# NourishNet Action Plan

This plan is intentionally forward-looking. Completed items were removed so this file stays focused on upcoming execution.

## Planning Date

- April 9, 2026

## Current Baseline (Reanalyzed)

- Core donor -> NGO -> volunteer workflow is functional with shared local state via API + SQLite.
- Route-level code splitting and reduced UI/dependency weight are in place.
- Test stack exists (Vitest + Testing Library) with baseline unit/integration/smoke/happy-path tests.
- Biggest remaining gaps are production readiness (auth, data, deployment), operational reliability, and deeper test depth.

## Status Legend

- `[In Progress]` active now
- `[Pending]` queued next
- `[Blocked]` needs external decision or dependency

## Priority Roadmap

## Phase 1: Reliability And Workflow Accuracy

Goal: make the existing flow consistently correct under real usage conditions.

### 1. [In Progress] Complete map and routing realism

Tasks:
- Validate live geocoding behavior end-to-end with real network access and capture fallback frequency.
- Replace random `distance` assignment with deterministic distance estimation.
- Add optional route-aware ETA calculation for pickup and delivery paths.
- Add map/provider error states for rate-limit, timeout, and no-result scenarios.

Done when:
- Newly created donations consistently resolve coordinates.
- Distance/ETA values are reproducible and no longer synthetic.
- Users see actionable messaging when map/geocoding services fail.

### 2. [Pending] Harden workflow invariants across backend + UI

Tasks:
- Add server-side idempotency protection for accept/pickup/deliver endpoints.
- Prevent duplicate submissions from rapid repeat clicks and browser retries.
- Add explicit stale-state handling when two actors act on the same donation concurrently.
- Normalize error response shapes for all workflow endpoints.

Done when:
- Concurrent or repeated actions cannot create invalid state transitions.
- Frontend displays clear conflict feedback and recovers safely.

## Phase 2: Security And Identity

Goal: move from local-demo auth to safer production-ready foundations.

### 3. [Done] Strengthen authentication and session security

Completed:
- Replaced legacy SHA-256 password handling with salted `scrypt` password hashes for new credentials.
- Added legacy-password compatibility and automatic on-login rehash migration to avoid breaking existing local users.
- Added session expiry and lifecycle controls:
  - TTL-based expiry
  - max session lifetime cap
  - rolling `lastUsedAt` updates with bounded extension
  - login-time session rotation and prior-session invalidation
  - explicit logout token invalidation
- Added brute-force protections on login:
  - per-IP+email attempt tracking window
  - lockout after repeated failures
  - `Retry-After` support on lock responses
- Added role/permission audit guardrails for mutating workflow endpoints and enforced centralized role checks.

Done when:
- Credentials and session handling follow modern security expectations.
- Common abuse paths (credential stuffing, brute force, stale token reuse) are mitigated.

### 4. [Done] Add signup and account lifecycle management

Completed:
- Implemented `POST /api/auth/signup` with role/email/password validation, duplicate-email protection, and immediate session issuance.
- Implemented `POST /api/auth/change-password` with current-password verification, password policy checks, and full session invalidation after update.
- Added role-aware profile completeness rules and enforced them in both signup and `PATCH /api/me`.
- Added backend + frontend onboarding coverage:
  - backend API tests against a temporary SQLite test DB (`server/account-lifecycle.test.mjs`)
  - frontend AppState integration tests for signup + password change (`src/app/state/AppState.integration.test.jsx`)
  - frontend API client tests for account lifecycle error handling (`src/app/lib/api.account-lifecycle.test.js`)
- Password reset flow is explicitly deferred and documented in the login/profile UX until reset-token/email infrastructure is added.

Done when:
- New users can self-onboard without manual DB seeding.
- Account lifecycle flows are test-covered and role-safe.

## Phase 3: Data And Deployment Readiness

Goal: prepare for multi-user hosted environments beyond local development.

### 5. [Pending] Introduce migration-safe data layer

Tasks:
- Add schema migration strategy instead of startup-only schema mutation.
- Add environment-aware DB configuration (local vs hosted).
- Add backup/restore path and seed strategy separation for dev/test/prod.
- Define data retention policy for sessions/history records.

Done when:
- Schema changes are versioned and repeatable.
- Environment setup is predictable without manual DB intervention.

### 6. [Blocked] Choose production hosting architecture

Tasks:
- Decide backend hosting target and production database provider.
- Define secrets/config management for deployed environments.
- Add deployment checklist for frontend, API, and database.
- Validate CORS, base URLs, and proxy behavior in deployed setup.

Done when:
- A single documented deployment path exists and is reproducible.
- App can run outside local machine with shared persistent data.

## Phase 4: Testing And Quality Gates

Goal: turn current test baseline into strong regression protection.

### 7. [In Progress] Expand automated coverage depth

Tasks:
- Add backend API tests for auth and workflow endpoints against a test DB.
- Add integration tests for map/geocoding failure and fallback branches.
- Add negative-path tests for validation and permission failures.
- Add coverage reporting and minimum threshold enforcement.

Done when:
- Critical backend/frontend paths include both happy and failure cases.
- CI fails automatically when coverage or critical tests regress.

### 8. [Pending] Add CI quality pipeline

Tasks:
- Add CI workflow for `npm ci`, `test`, and `build`.
- Enforce branch protection checks on test/build success.
- Add lint rule set (or document why test/build-only checks are sufficient).
- Publish artifacts/test reports for failed CI runs.

Done when:
- Every PR is automatically validated before merge.
- Regressions are caught before manual QA.

## Phase 5: Product UX And Operations

Goal: improve day-2 usability and maintainability.

### 9. [Pending] Improve operational transparency in UI

Tasks:
- Add explicit loading/empty/error states on all major pages.
- Add timestamp/source metadata for analytics and map-derived values.
- Add clearer role-specific dashboard cues for next action.
- Add user-visible audit context for important status changes.

Done when:
- Users can understand system state without guessing.
- Failures and delays are visible and actionable in the UI.

### 10. [Pending] Add observability and diagnostics

Tasks:
- Add structured server logging with request IDs.
- Add centralized error handling middleware in API.
- Add lightweight health/readiness endpoint.
- Add debug toggles for geocoding and workflow transitions in non-prod.

Done when:
- Production issues can be traced from logs quickly.
- Basic runtime health can be monitored externally.

## Immediate Next Sprint (Recommended)

1. Complete item 1 (map/geocoding realism) and item 2 (workflow idempotency/concurrency).
2. Start item 7 with backend API tests for auth + donation transitions.
3. Land CI pipeline from item 8 to enforce test/build gates.

