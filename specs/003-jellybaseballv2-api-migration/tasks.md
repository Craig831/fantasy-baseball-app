---
description: "Task list for feature 003-jellybaseballv2-api-migration"
---

# Tasks: JellyBaseballV2 API Migration

**Input**: Design documents from `/specs/003-jellybaseballv2-api-migration/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included. The plan and quickstart explicitly call out unit, component, and integration test layers (Vitest + Testing Library + MSW). Test tasks are scheduled before or alongside implementation per layer.

**Organization**: Tasks are grouped by user story (US1 auth, US2 player research, US3 personal data, US4 legacy cleanup) so each can be implemented and demoed independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Different file from any other task in the same phase, no dependency on an incomplete task — safe to run in parallel.
- **[Story]**: User-story label (US1, US2, US3, US4). Setup, Foundational, and Polish tasks have no story label.
- All paths are absolute from the repository root unless noted.

## Path Conventions

This is a single-project web client. All application code lives under `src/`. New modules introduced by this branch:

- `src/api/` — typed client and shared API plumbing (NEW)
- `src/auth/` — auth UI, context, route gates (NEW)
- `src/test/` — MSW handlers and shared test utilities (NEW)
- `src/features/`, `src/pages/`, `src/components/`, `src/hooks/` — existing
- `backend/`, `infrastructure/`, `docker-compose.yml`, `DOCKER.md` — slated for removal in US4

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install tooling, create directory scaffolding, generate the typed contracts the rest of the work depends on.

- [X] T001 Install runtime and dev dependencies in `package.json`: add `jwt-decode` (runtime), `openapi-typescript` (dev), `msw` (dev). Run `npm install` from the repo root.
- [X] T002 [P] Add npm scripts in `package.json`: `"gen:types": "openapi-typescript http://localhost:5000/swagger/v1/swagger.json --output src/api/types.generated.ts"`.
- [X] T003 [P] Create `.env.development.local.example` documenting `VITE_API_BASE_URL=http://localhost:5000` (and update `.gitignore` to ignore `.env.development.local` if not already). Also grep the entire repo for any usage of the legacy `VITE_API_URL` env var (the existing `src/services/api.ts` reads it) and replace each occurrence with `VITE_API_BASE_URL`, including `.env*` files and any CI configuration. Goal: only one env var name exists in the tree once Phase 1 ends.
- [X] T004 [P] Create empty directories `src/api/`, `src/auth/`, `src/test/` (with placeholder `.gitkeep` files where appropriate).
- [X] T005 With the JellyBaseballV2 API running locally, generate `src/api/types.generated.ts` via `npm run gen:types` from the repo root. Commit the generated file.

**Checkpoint**: `npm run dev` still boots the existing app; new `src/api/` directory holds only `types.generated.ts`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build the typed-client primitives and shared infrastructure that every user story consumes. **No user-story task may begin until this phase is complete.**

**⚠️ CRITICAL**: All four primary modules (`tokens`, `errors`, `jsonBlobs`, `client`) plus the `QueryClientProvider` wiring must land before US1 begins.

### Foundational implementation

- [X] T006 Implement token store in `src/api/tokens.ts`: module-scoped `accessToken`, `localStorage`-backed `refreshToken` (key `jb2:refreshToken`), `setTokens`/`clearTokens`/`getAccessToken`/`getRefreshToken` API, and a `window.addEventListener('storage', ...)` handler that re-syncs the in-memory access token when another tab rotates the refresh token.
- [X] T007 [P] Implement RFC 7807 error mapper in `src/api/errors.ts`: export `ApiError`, `isApiError`, and `splitValidationDetail(err)` per `contracts/auth.md` and `research.md` §5.
- [X] T008 [P] Implement JSON-blob helpers and types in `src/api/jsonBlobs.ts`: `parseJsonBlob<T>` (returns `null` for `"{}"`/`"[]"`/empty), `stringifyJsonBlob<T>`, and the five typed shapes (`PositionSlot`, `StatCategoryWeight`, `DraftOrder`, `LineupCategory`, `SavedSearchFilters`) per `data-model.md` §7. Enforce `filterVersion: 2` on `SavedSearchFilters` serialize.
- [X] T009 Implement Axios client in `src/api/client.ts`: base URL from `import.meta.env.VITE_API_BASE_URL`, request interceptor that attaches `Authorization: Bearer ${accessToken}` from T006, response interceptor with single-flight `inFlightRefresh` promise, retry-once logic, RFC 7807 mapping via T007, clear-and-redirect via `react-router` (not `window.location.href`). **Depends on T006, T007.**
- [X] T010 Wire `@tanstack/react-query` `QueryClientProvider` and `ReactQueryDevtools` in `src/App.tsx`. Set sensible defaults (`staleTime: 30_000`, `refetchOnWindowFocus: false` for now).
- [X] T011 [P] Configure MSW: create `src/test/mswHandlers.ts` with empty default array, `src/test/mswServer.ts` (Node setup), and update `src/setupTests.ts` to start/stop the server around the suite.

### Foundational tests

- [X] T012 [P] Unit tests for token store in `src/api/tokens.test.ts`: set/clear, localStorage persistence, cross-tab `storage`-event resync.
- [X] T013 [P] Unit tests for error mapper in `src/api/errors.test.ts`: `isApiError` type guard, `splitValidationDetail` behavior on multi-error `detail` strings.
- [X] T014 [P] Unit tests for JSON-blob helpers in `src/api/jsonBlobs.test.ts`: round-trip the five shapes, `"{}"`/`"[]"` → null, `filterVersion: 2` enforcement (parser rejects, serializer always sets).
- [X] T015 [P] Unit tests for client interceptor in `src/api/client.test.ts`: 401 → single-flight refresh + retry-once, 401-after-refresh → clear tokens + redirect, concurrent request coalescing onto a single refresh promise, RFC 7807 → `ApiError`.

**Checkpoint**: All Phase 2 tasks pass `npm test`. The typed-client foundation is ready; user-story phases may now begin in parallel.

---

## Phase 3: User Story 1 — Authenticated Sessions Against the External API (Priority: P1) 🎯 MVP

**Goal**: A user can register, log in, remain authenticated across token expirations and page reloads, and log out — all against the JellyBaseballV2 API. No local user database participates.

**Independent Test**: Run the dev server (`npm run dev`) against the live API. Register a new account → access a protected route → wait past access-token expiry → trigger a request and observe transparent refresh + retry → reload the page and confirm session persists → log out and confirm protected routes redirect to login. (Quickstart §5.)

### Implementation for US1

- [X] T016 [US1] Auth API module in `src/api/auth.ts`: `register`, `login`, `refresh`, `logout`, `getCurrentUser` per `contracts/auth.md`. All functions use the `client` from T009 and import generated types from `types.generated.ts`.
- [X] T017 [P] [US1] Auth API unit tests in `src/api/auth.test.ts` (MSW-backed): each endpoint's happy and error paths.
- [X] T018 [P] [US1] Auth context in `src/auth/AuthContext.tsx`: `useAuth()` exposing `currentUser`, `signIn(email, password)`, `register(payload)`, `signOut()`, `isLoading`, `isAuthenticated`. On boot, hydrate by calling `refresh` if a refresh token exists.
- [X] T019 [P] [US1] `ProtectedRoute` component in `src/auth/ProtectedRoute.tsx`: redirects unauthenticated users to `/login`, preserving the originally requested path via `react-router` state.
- [X] T020 [P] [US1] `LoginPage` in `src/auth/LoginPage.tsx` using existing `@react-aria/*` primitives. On success, navigate to the preserved redirect path or `/`.
- [X] T021 [P] [US1] `RegisterPage` in `src/auth/RegisterPage.tsx` with client-side password rules (min 8 chars, ≥1 digit) mirroring AUTH.md.
- [X] T022 [US1] Wire `<AuthProvider>` at the app root in `src/App.tsx`. **Depends on T010, T018.**
- [X] T023 [US1] Add `/login` and `/register` routes and wrap existing protected pages in `ProtectedRoute` in `src/App.tsx` (or wherever the router lives). **Depends on T019, T020, T021, T022.**
- [X] T024 [US1] Add a logout control to the existing header/menu component (locate via `src/components/common/`). Calls `signOut()` from `useAuth` and navigates to `/login`.

### Tests for US1

- [X] T025 [P] [US1] `AuthContext` component tests in `src/auth/AuthContext.test.tsx`: register success, login success, login failure surfaces validation detail, signOut clears tokens, boot hydration uses refresh token.
- [X] T026 [P] [US1] `ProtectedRoute` tests in `src/auth/ProtectedRoute.test.tsx`: unauthenticated redirect, authenticated pass-through, redirect-state preservation.
- [X] T027 [P] [US1] `LoginPage` tests in `src/auth/LoginPage.test.tsx`: form validation, submit triggers `signIn`, error surfacing.
- [X] T028 [P] [US1] `RegisterPage` tests in `src/auth/RegisterPage.test.tsx`: password-rule validation, submit triggers `register`, semicolon-delimited 400 errors render inline.
- [X] T029 [US1] Hand-execute Quickstart §5 against the live API and check off acceptance scenarios in `spec.md` US1 #1–#5.

**Checkpoint**: US1 is fully functional. Auth-protected views from prior branches still load; the legacy `services/api.ts` still backs them but the new auth flow is now driving sessions.

---

## Phase 4: User Story 2 — Player Research Reads From the External API (Priority: P2)

**Goal**: Player search, filter, sort, and detail all read from the JellyBaseballV2 API. No local database is involved.

**Independent Test**: Sign in (US1), open Player Research, exercise filters and sort, open a player detail, and verify in DevTools that all requests target `${VITE_API_BASE_URL}` and that the existing UI behavior is preserved. Stop the API and confirm a clear error within 5 seconds. (Quickstart §6.)

### Implementation for US2

- [X] T030 [US2] Players API module in `src/api/players.ts`: `searchPlayers`, `getPlayerById`, `getTeams`, `getPositions`, `getPlayerScoreBreakdown` per `contracts/players.md`. Uses generated DTO types and the `client` from T009.
- [X] T031 [US2] TanStack Query hooks for players in `src/features/player-research/hooks/usePlayersQuery.ts` (and sibling hooks for teams/positions/score-breakdown if needed). Use `queryKey` namespacing per resource.
- [X] T032 [US2] Migrate `src/features/player-research/**/*.tsx` to consume the new hooks, replacing imports of `services/api.ts`.
- [X] T033 [US2] Migrate `src/pages/PlayerResearch/**/*.tsx` to consume the new hooks.
- [X] T034 [US2] Update `src/types/player.ts` to re-export aliases of the generated DTOs (or delete if redundant with `types.generated.ts`).
- [X] T035 [US2] Implement a global API-error notifier in `src/components/common/ApiErrorNotifier.tsx`: a toast (rendered via a global notification component, **not** a React error boundary — error boundaries do not catch network errors) that surfaces within 5 seconds when any TanStack Query request fails network-level (no response). For HTTP errors with a response body, render `ApiError.detail` for status 400 (so users see validation messages), but for status 500 render a fixed generic string (e.g., "Something went wrong. Please try again.") and **never** display the API's `detail` payload — per spec FR-014. Mount in `App.tsx`. Applies app-wide; verified by US2's "stop the API" scenario.

### Tests for US2

- [X] T036 [P] [US2] Players API unit tests in `src/api/players.test.ts` (MSW-backed): each endpoint, query-param serialization (the `paramsSerializer: { indexes: null }` quirk), pagination shape mapping.
- [X] T037 [P] [US2] Player-research hooks tests in `src/features/player-research/hooks/usePlayersQuery.test.ts`: cache key correctness, refetch on filter change.
- [X] T038 [P] [US2] Component test for the player-search flow in `src/features/player-research/__tests__/playerSearch.test.tsx` (MSW-backed): apply filter, change sort, open detail.
- [ ] T039 [US2] Hand-execute Quickstart §6 acceptance scenarios in `spec.md` US2 #1–#4 (including the "stop the API" 5-second-error edge case).

**Checkpoint**: Player research runs end-to-end against the API. Legacy `services/api.ts` may still exist if other features import it (cleaned up in US3 / US4).

---

## Phase 5: User Story 3 — User-Owned Data Persists via the External API (Priority: P3)

**Goal**: Personal scoring configurations, weekly lineups, and saved player searches are persisted by the API and survive sign-out / sign-in cycles.

**Independent Test**: Sign in, create a scoring config, save a lineup for a week, save a player-search filter. Sign out, sign back in. All three artifacts reappear unchanged. (Quickstart §7.)

### Implementation for US3

- [ ] T040 [US3] Leagues API module in `src/api/leagues.ts` per `contracts/leagues.md` (leagues, members, invitations, settings, draft control). Required because lineups are league-scoped.
- [ ] T041 [P] [US3] Teams API module in `src/api/teams.ts` per `contracts/lineups.md`: dashboard (authoritative `currentWeek`), roster, lineup get/set, free-agent add.
- [ ] T042 [P] [US3] Scoring configs API module in `src/api/scoringConfigs.ts` per `contracts/scoring-configs.md`. Uses `parseJsonBlob`/`stringifyJsonBlob` for `categoriesJson`.
- [ ] T043 [P] [US3] Saved searches API module in `src/api/savedSearches.ts` per `contracts/saved-searches.md`. Always sets `filterVersion: 2` on serialize; rejects on parse otherwise.
- [ ] T044 [US3] TanStack Query hooks for scoring configs, lineups, and saved searches in `src/hooks/` (one file per resource: `useScoringConfigs.ts`, `useLineup.ts`, `useSavedSearches.ts`).
- [ ] T045 [US3] Migrate `src/pages/ScoringConfigs/**/*.tsx` to consume the new API module via the hooks from T044.
- [ ] T046 [US3] Migrate `src/pages/Lineups/**/*.tsx` to consume the new API module via the hooks from T044. Replace any imports of `src/services/lineupService.ts`.
- [ ] T047 [US3] Add or migrate saved-searches UI in player research: "Save current filter" button + "Saved searches" list with apply / delete affordances (delete only if API exposes it; otherwise hide). File(s): `src/features/player-research/SavedSearches.tsx` and integration into the existing filter bar.
- [ ] T048 [US3] Delete `src/services/lineupService.ts` once nothing imports it.

### Tests for US3

- [ ] T049 [P] [US3] Saved searches API tests in `src/api/savedSearches.test.ts`: round-trip with `filterVersion: 2`, parser rejection of missing/wrong version, 400 error surfacing.
- [ ] T050 [P] [US3] Scoring configs API tests in `src/api/scoringConfigs.test.ts`: list, create, detail, `categoriesJson` round-trip.
- [ ] T051 [P] [US3] Leagues + teams API tests in `src/api/leagues.test.ts` and `src/api/teams.test.ts`: settings reads, lineup get/set, locked-slot edit blocked, free-agent-add full-roster 400 surfacing.
- [ ] T052 [P] [US3] Hooks tests in `src/hooks/useScoringConfigs.test.ts`, `useLineup.test.ts`, `useSavedSearches.test.ts` (MSW-backed).
- [ ] T053 [US3] Hand-execute Quickstart §7 acceptance scenarios in `spec.md` US3 #1–#4.

**Checkpoint**: All read and write paths run against the API. The legacy backend is no longer reached by any code path even though it still exists in the tree.

---

## Phase 6: User Story 4 — Repository Contains No Local Backend or Database Tooling (Priority: P4)

**Goal**: The repository contains only the web application. No backend code, no ORM schema, no migrations, no seed scripts, no database service in container orchestration.

**Independent Test**: Inspect the repo and run the app with only the JellyBaseballV2 API running locally. (Quickstart §8.)

### Implementation for US4

- [X] T054 [US4] Delete the `backend/` directory in its entirety from the repository root (NestJS app, Prisma schema, all migrations including the untracked `backend/prisma/migrations/20260421195202_add_teams_and_fix_players/`, `backend/prisma.config.ts`, tests, `Dockerfile`, `eslint.config.mjs`, `package.json`, `README.md`).
- [X] T055 [US4] Update `docker-compose.yml`: remove the `backend` and `postgres` services; if no meaningful services remain (e.g., only the frontend served via `nginx`), delete the file outright.
- [X] T056 [US4] Update or delete `DOCKER.md` at the repository root to reflect the new architecture (web client only) — point developers at the JellyBaseballV2 README for API setup.
- [ ] T057 [US4] Audit `infrastructure/` and remove any files that provisioned Postgres or the local NestJS backend. Keep only what serves the web client (e.g., nginx config, deployment scripts).
- [ ] T058 [US4] Update repository-root `README.md` to describe the new architecture (web client + external API) and link to `specs/003-jellybaseballv2-api-migration/quickstart.md` for setup.
- [ ] T059 [US4] Delete `src/services/api.ts` and `src/services/lineupService.ts` if not already deleted in earlier phases. Delete `src/services/` if empty.
- [ ] T060 [US4] Repo-wide grep verification per Quickstart §8. Run from the repo root and confirm zero matches: `prisma`, `@nestjs`, `5432`, `postgres` (excluding mentions inside `specs/`, `JellyBaseballV2/` references, and `node_modules/`).
- [ ] T061 [US4] Hand-execute Quickstart §8 acceptance scenarios in `spec.md` US4 #1–#4.

**Checkpoint**: A clean checkout, with only the JellyBaseballV2 API running locally, can build and run `` end-to-end.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Quality and consistency improvements that touch multiple user stories.

- [ ] T062 [P] Add an ESLint rule (or convention note in `README.md`) forbidding direct `axios` or `fetch` usage outside `src/api/` to prevent re-introducing a parallel client.
- [ ] T063 [P] Update `README.md` with the new architecture, env-var setup, and `gen:types` step.
- [ ] T064 Run the full Vitest suite (`cd frontend && npm test`) and confirm green.
- [ ] T065 Run end-to-end Quickstart §1–§9 against the live API and confirm all acceptance scenarios pass.
- [ ] T066 Audit the repo for UI flows touching API capabilities documented as missing or no-op in `JellyBaseballV2/docs/web-client/KNOWN-GAPS.md`, per `spec.md` FR-017. For each item below, confirm the UI is either absent, omitted, read-only, or correctly substituted; record the finding. Expected baseline: none of these UIs exist in the current repo, so the audit should confirm absence rather than gating. If any interactive flow against a missing endpoint is found, file a follow-up task to omit or gate it before merge.
  - Draft pick submission (no `POST /api/leagues/{id}/draft/pick` endpoint).
  - Real-time push expectations for drafts, waivers, or trades (polling only).
  - Email-based league invitations sent from the app (no-op email service; share-link UI only).
  - Player news feed rendering (no-op news service; news section omitted).
  - Display of non-self user names (only `teamName` is resolvable for other members).
  - Display of commissioner's name on the league page (only "You are the commissioner" badge for self).
- [ ] T067 [P] Run automated accessibility checks against the new auth screens to verify constitution §I (Accessibility first / WCAG). Add `vitest-axe` (or `axe-core` directly) as a dev dependency, write component tests at `src/auth/LoginPage.a11y.test.tsx` and `src/auth/RegisterPage.a11y.test.tsx` that render each page and assert zero critical or serious axe violations. Resolve any findings by adjusting the components, not by softening the assertions.
- [ ] T068 Update auto-memory pointer (in `~/.claude/projects/.../memory/`) to mark feature 003 as implementation-complete and ready for review.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies. T002–T004 are parallelizable; T001 must complete before T005 (types generation needs the dev dep).
- **Foundational (Phase 2)**: Requires Setup. T006/T007/T008 are parallelizable. T009 depends on T006 + T007. T010, T011, and the foundational tests T012–T015 can run in parallel with T009 once their respective implementation tasks land.
- **User Story phases (Phase 3–6)**: All require Foundational. The branch's MVP demo path is US1 → US2 → US3 → US4 in order, but a multi-developer team can work US1, US2, and US3 in parallel after Phase 2.
- **Polish (Phase 7)**: Requires all desired user stories complete.

### User Story Dependencies

- **US1 (P1, MVP)**: Independent. Required in practice for any human to test US2/US3 against a live API, but the *infrastructure* needed by US2/US3 is in Phase 2 (Foundational), so they are technically not blocked.
- **US2 (P2)**: Independent. Can be built against MSW-mocked auth without US1 complete.
- **US3 (P3)**: Independent. Can be built against MSW-mocked auth without US1 complete.
- **US4 (P4)**: Sequentially last. Deletes the legacy code that earlier stories may still incidentally reference. Should follow once US1–US3 no longer import from `src/services/`.

### Within Each User Story

- Tests for foundational primitives (Phase 2) run alongside their implementations.
- Within a story: API-module tasks → Query hooks → Page/component migrations → Story-level integration (manual quickstart run).
- All tests for a single story marked [P] can run in parallel.

### Parallel Opportunities

- Phase 1: T002, T003, T004 in parallel. T005 sequential (depends on T001).
- Phase 2: T007, T008, T010, T011, T012, T013, T014 are all [P] (different files); T006 and T009 are sequential anchors.
- Phase 3 (US1): T017–T021 and T025–T028 are [P]; T022/T023/T024/T029 are sequential.
- Phase 4 (US2): T036–T038 are [P]; the migrations T030–T035 land sequentially because they touch shared files (App.tsx, pages).
- Phase 5 (US3): T041–T043 and T049–T052 are [P]; the migrations and UI add follow.
- Phase 6 (US4): mostly sequential since the deletions affect the repo state observed by subsequent grep tasks.

---

## Parallel Example: User Story 1 (after Phase 2 complete)

```text
# Independent files — launch in parallel:
Task: "T017 Auth API unit tests in src/api/auth.test.ts"
Task: "T018 AuthContext in src/auth/AuthContext.tsx"
Task: "T019 ProtectedRoute in src/auth/ProtectedRoute.tsx"
Task: "T020 LoginPage in src/auth/LoginPage.tsx"
Task: "T021 RegisterPage in src/auth/RegisterPage.tsx"
```

`T016` (auth API module) and `T022`/`T023`/`T024` (App wiring + routes + logout button) are sequential anchors.

---

## Implementation Strategy

### MVP First (US1 only)

1. Phase 1 Setup (T001–T005).
2. Phase 2 Foundational (T006–T015).
3. Phase 3 US1 (T016–T029).
4. **STOP and validate**: Quickstart §5 passes; AUTH-protected views still work via existing `services/api.ts` so the rest of the app keeps running. Demo a registered user signing in, refreshing automatically, and signing out.

### Incremental Delivery

1. Setup + Foundational ready.
2. US1 → demo authenticated session against the new API.
3. US2 → demo player research reading from the new API (legacy `services/api.ts` reads removed).
4. US3 → demo personalization writing to the new API (legacy `lineupService.ts` removed).
5. US4 → demo a clean repo: `backend/` gone, no Postgres in compose, `npm start` is the whole stack.
6. Polish.

### Parallel Team Strategy

After Phase 2 lands:

- Developer A: US1 (auth UI + flows).
- Developer B: US2 (player research migration), pre-mocked auth via MSW.
- Developer C: US3 (scoring configs + lineups + saved searches), pre-mocked auth via MSW.
- All three converge on US4 once their migrations are merged.

---

## Notes

- [P] = different file from any other Phase task, no incomplete-task dependency.
- [Story] label maps task to spec.md user stories for traceability.
- Each user story is independently completable and testable per the spec's acceptance criteria.
- All hand-execute Quickstart tasks (T029, T039, T053, T061, T065) require the live JellyBaseballV2 API on `http://localhost:5000`.
- Commit at each task or logical group. Stop at any checkpoint to demo or merge.
- Avoid: re-introducing `axios`/`fetch` outside `src/api/`; touching `types.generated.ts` by hand; coupling US2/US3 page code to `services/api.ts` (those imports must end up in `src/api/`).
