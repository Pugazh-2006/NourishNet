# NourishNet Action Plan

This plan turns the current prototype into a usable, maintainable application.

## Current Status

- The frontend builds successfully.
- The app now has a shared local backend and a real local SQLite database.
- Donor, NGO, and volunteer users can sign in and work against shared data.
- The biggest remaining gaps are map/routing polish, analytics quality, workflow hardening, and engineering cleanup.

## Status Legend

- `[Done]` finished
- `[In Progress]` partially implemented, but still needs follow-up
- `[Pending]` not started yet

## Priority Order

## Phase 1: Make Core Workflow Actually Usable

Goal: turn the donor -> NGO -> volunteer flow into a reliable product flow instead of a single-browser demo.

### 1. [Done] Add a real backend and database

Completed:
- Added a real local backend in `server/index.mjs`.
- Replaced browser-only state as the source of truth.
- Added a real local SQLite database in `server/nourishnet.db`.
- Added shared persistence for users, donations, NGOs, sessions, and donation history.
- Added API endpoints for login, bootstrap, profile update, create donation, accept donation, and update delivery status.
- Seeded development/demo accounts on first server start.

Remaining later:
- Replace local SQLite with a hosted production database when moving beyond local development.

### 2. [Done] Add authentication and role-based access

Completed:
- Added login flow with donor, NGO, and volunteer demo accounts.
- Added authenticated session handling.
- Moved role identity from local UI state to authenticated backend user data.
- Added route protection for donor, NGO, volunteer, and authenticated pages.
- Connected profile editing to the authenticated user.

Remaining later:
- Add signup.
- Add stronger auth/security for production use.

### 3. [Done] Fix volunteer assignment flow

Completed:
- Replaced single hidden pickup lookup with assigned pickup list behavior.
- Volunteers now see multiple assigned pickups.
- Status updates are stored in backend history.
- Removed the old hardcoded local-only workflow logic.

Remaining later:
- Add a dedicated pickup detail route if you want a fuller operations workflow.
- Add smarter volunteer assignment rules instead of first available volunteer.

## Phase 2: Replace Mocked Behavior

Goal: remove features that look real but are still simulated.

### 4. [In Progress] Replace mock map behavior

Completed:
- Replaced the fake SVG map with a real Leaflet + OpenStreetMap map.
- Added backend-stored pickup coordinates for donations.
- Added automatic server-side geocoding for newly entered addresses with cache + fallback behavior.
- Rendered real donor and NGO markers plus radius overlays.
- Enabled working external map links for volunteer pickup and NGO navigation.

Remaining:
- Verify live geocoding end-to-end in a non-sandboxed run.
- Calculate route-based travel more accurately if needed.
- Upgrade to a stronger map provider later if advanced routing is needed.

Done when:
- Donations and NGOs display at real map locations.
- Volunteers can open turn-by-turn navigation from the app.

### 5. [Done] Replace fake analytics with real metrics

Completed:
- Donation history and workflow timestamps are now stored in the backend.
- Pickup timing is now derived from real accepted and picked-up events.
- Added platform-wide analytics summaries from the backend instead of inventing totals in the frontend.
- Replaced fake food and meal estimates with structured parsing from quantity entries such as servings, kg, and grams.
- Separated platform metrics from per-user impact metrics in the analytics experience.
- Added clearer low-data states when structured meal or weight data is not available yet.

Done when:
- Dashboard and analytics values are derived from real recorded actions.

## Phase 3: Product and UX Hardening

Goal: make the app safer and clearer for real usage.

### 6. [Done] Improve validation and workflow safety

Completed:
- Added structured quantity validation in both the donor form and the backend API.
- Prevented creation of already-expired donations and blocked future cooked times.
- Prevented NGOs from accepting expired donations and blocked expired pickups from continuing.
- Kept backend status-transition rules enforced for volunteer updates.
- Added clearer loading, disabled, and expired states across donor, NGO, and volunteer actions.
- Added confirmation prompts before NGO accept, volunteer pickup, and volunteer delivery actions.

Done when:
- Users cannot accidentally create invalid or impossible workflow states.

### 7. [Done] Improve page structure and navigation

Completed:
- Added route guards for authenticated pages.
- Made role access clearer through authenticated workspaces.
- Improved volunteer flow by supporting multiple assigned pickups.
- Added role-aware workspace navigation in the top nav.
- Added clearer workflow guidance and next-step actions on the home dashboard.
- Improved empty and recovery states for notifications, donor dashboard, and tracking pages.
- Tightened mobile layout and button sizing on core donor and tracking screens.

Done when:
- A new user can complete the core flow without confusion.

## Phase 4: Engineering Cleanup

Goal: make the project easier to run, maintain, and extend.

### 8. [Done] Clean up project configuration

Completed:
- Added a backend run script.
- Updated the README to document the backend/database setup.
- Added `tsconfig.json` and a working `typecheck` script.
- Added predictable `preview`, `lint`, and `test` scripts to `package.json`.
- Added `.env.example` plus env-based Vite and server configuration for local API and geocoder settings.
- Renamed the package from the Figma-generated default to `nourishnet`.
- Moved `react` and `react-dom` into normal dependencies for a cleaner fresh install.

Done when:
- A fresh clone has a predictable setup and developer workflow.

### 9. [Pending] Reduce bundle size and remove unused UI weight

Tasks:
- Audit large dependencies imported from the Figma export.
- Remove unused generated UI components.
- Code-split heavy pages and charts.
- Rebuild and compare bundle size after cleanup.

Done when:
- Build warnings are reduced and initial load is lighter.

### 10. [Pending] Add test coverage

Tasks:
- Add unit tests for app state and workflow rules.
- Add integration tests for donor, NGO, and volunteer flows.
- Add smoke tests for routing and page rendering.
- Add one end-to-end happy path for full donation lifecycle.

Done when:
- Core workflow regressions are caught automatically.

## Remaining High-Priority Work

1. Verify live geocoding end-to-end outside the sandbox and refine it if needed.
2. Add tests for the core donation lifecycle.
3. Reduce bundle size and remove unused UI weight.
4. Add signup and stronger production auth when moving beyond local demo use.
5. Add a hosted production database path when moving beyond local development.







