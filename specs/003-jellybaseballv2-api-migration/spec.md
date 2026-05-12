# Feature Specification: JellyBaseballV2 API Migration

**Feature Branch**: `003-jellybaseballv2-api-migration`
**Created**: 2026-05-06
**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Authenticated Sessions Against the External API (Priority: P1)

A user can register a new account, log in, remain authenticated across token expirations and page reloads, and log out — all using the external API as the sole source of truth for identity. No local user database participates in authentication.

**Why this priority**: Authentication is the foundation. Every other API interaction requires a valid access token, so without this slice nothing else can be exercised end-to-end. Delivering this slice alone proves the new API integration is viable.

**Independent Test**: Register a new email/password account, log in, leave the application open long enough for the access token to expire, perform a protected action and observe it succeed without manual re-authentication, reload the page and confirm the session survives, then log out and confirm subsequent protected actions are blocked.

**Acceptance Scenarios**:

1. **Given** the application is open and no user is signed in, **When** a new user submits valid registration details, **Then** they are logged in and can access protected views.
2. **Given** a signed-in user whose access token has expired, **When** the application makes a request that returns an authentication failure, **Then** the application transparently obtains a new access token and retries the original request without disrupting the user.
3. **Given** a signed-in user, **When** they reload the page, **Then** their session is restored without prompting for credentials, provided the long-lived refresh credential is still valid.
4. **Given** a signed-in user, **When** they log out, **Then** all credentials are cleared from the client and the long-lived refresh credential is revoked at the API.
5. **Given** a user whose refresh credential has expired or been revoked, **When** the application attempts to refresh, **Then** the user is returned to the login screen with a clear message.

---

### User Story 2 - Player Research Reads From the External API (Priority: P2)

A user can search, filter, sort, and view detail for MLB players, with all data coming from the external API. The existing player research experience continues to function with no observable behavioral regressions for the user.

**Why this priority**: Player research is the primary use case for the application. Once authentication is in place, this slice replaces the most-trafficked data path and proves the migration handles read-heavy workloads correctly.

**Independent Test**: After authenticating, navigate to player research, exercise search/filter/sort, open one or more player detail views, and confirm that all displayed data — players, teams, game statistics — reflects what the external API returns. Confirm that the application makes no requests to a local database service.

**Acceptance Scenarios**:

1. **Given** a signed-in user, **When** they open player research, **Then** the player list, team affiliations, and statistical fields are populated from the external API.
2. **Given** a signed-in user on player research, **When** they apply name, position, team, or availability filters, **Then** results match the filter criteria as resolved by the external API.
3. **Given** a signed-in user, **When** they open a player detail view, **Then** the player's profile and game-level statistics are fetched from the external API.
4. **Given** the external API is reachable, **When** a player research view is loaded, **Then** no request is made to any local database service, and no local database is required to be running.

---

### User Story 3 - User-Owned Data Persists via the External API (Priority: P3)

A user can create, update, and retrieve their personal scoring configurations, lineups, and saved searches. All such data is persisted by the external API and survives sign-out and sign-in cycles.

**Why this priority**: Personalization features depend on auth (US1) and round out the migration. They are independently demonstrable once auth works, and they exercise write paths the read-focused US2 does not.

**Independent Test**: After authenticating, create a scoring configuration, save a lineup, and save a player-search filter. Sign out, sign back in, and confirm all three artifacts are present and unchanged. Modify each, confirm updates persist across a sign-out/sign-in cycle.

**Acceptance Scenarios**:

1. **Given** a signed-in user, **When** they create a personal scoring configuration, **Then** it is persisted by the external API and retrievable in a later session.
2. **Given** a signed-in user, **When** they save a lineup for a given week, **Then** the lineup is retrievable in a later session and reflects any subsequent edits.
3. **Given** a signed-in user, **When** they save a player-search filter, **Then** the filter is retrievable in a later session and re-applies the same criteria.
4. **Given** the external API rejects a write with a validation error, **When** the user submits the offending input, **Then** the user sees a human-readable explanation of what went wrong.

---

### User Story 4 - Repository Contains No Local Backend or Database Tooling (Priority: P4)

The repository contains only the web application. There is no local backend application, no database schema or migrations, no database seed scripts, and no database service in container orchestration. The web application is the sole runtime artifact in this repository.

**Why this priority**: This is the cleanup story. The other slices can be developed against an unfinished migration where the legacy backend still exists. The branch is not done until the legacy code is gone, eliminating the risk of two divergent sources of truth and reducing maintenance surface.

**Independent Test**: Inspect the repository. Confirm there is no backend application directory, no ORM schema, no migration files, no database seed scripts, and no database service definition in container orchestration. Run the web application against the external API with no other services running locally.

**Acceptance Scenarios**:

1. **Given** the repository, **When** its contents are inspected, **Then** no local backend application, ORM schema, migration files, or seed scripts exist anywhere in the tree.
2. **Given** the container orchestration definitions, **When** they are inspected, **Then** they do not include a database service or a local backend service.
3. **Given** a developer with only the external API running, **When** they start the web application, **Then** it runs and is fully usable with no other local services required.
4. **Given** the application is running, **When** any user action is performed, **Then** no connection is made to a local database from the application.

---

### Edge Cases

- The external API is unreachable when the application starts or during a session — the user must see a clear, actionable error message rather than indefinite loading.
- The access credential expires between two adjacent requests — the application must transparently refresh and retry the original request.
- The refresh credential is revoked or expired — the application must clear all credentials and return the user to the login screen.
- Two browser tabs each detect an expired access credential at the same moment — only one refresh should be in flight; the second tab must use the resulting fresh credential rather than racing.
- The API returns a validation error containing multiple field-level messages concatenated into a single string — the application must display them in a way that lets the user identify each problem.
- The API returns a generic 500 error — the application must show a generic error message and not leak server internals.
- A user attempts to access a resource that does not exist or that they do not own — the application must show a "not found" experience without revealing whether the resource exists for someone else.
- An endpoint required by a UI flow does not yet exist on the API (e.g., submitting a draft pick) — that flow must be either visibly out of scope in the UI or scoped to read-only views, never silently broken.
- Existing user records or other application data in the legacy local database — these are not migrated; the application starts fresh against the API.
- The API returns one of the opaque JSON-string fields as `"{}"` or `"[]"` (the documented empty default) — the application must treat this as "no value yet" and render appropriate UI rather than failing to parse.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The application MUST authenticate users against the external API, supporting account registration, login, logout, and transparent renewal of expired access credentials.
- **FR-002**: Access credentials MUST NOT persist across browser reloads, while long-lived refresh credentials MUST persist across reloads up to their documented lifetime.
- **FR-003**: When an authenticated request fails because the access credential has expired, the application MUST attempt one transparent refresh and retry of the original request before surfacing an error to the user.
- **FR-004**: When the refresh credential is rejected, the application MUST clear all stored credentials and return the user to the login screen with a clear message.
- **FR-005**: The application MUST attach the current access credential to every authenticated request to the external API.
- **FR-006**: All player, team, league, scoring-configuration, lineup, and saved-search data MUST be read from and written to the external API.
- **FR-007**: The application MUST NOT make any database connections or include any database driver or ORM at runtime.
- **FR-008**: The repository MUST NOT contain a local backend application, ORM schema, migration files, seed scripts, or any other database schema-management artifact.
- **FR-009**: Container orchestration definitions MUST NOT include a database service or a local backend service.
- **FR-010**: The application MUST derive its data contracts from the external API's published machine-readable schema, so that mismatches between what the application sends and what the API expects are caught before the code ships.
- **FR-011**: The application MUST correctly serialize and deserialize the documented opaque JSON-string fields at the API boundary, treating documented empty defaults (`"{}"` or `"[]"`) as "no value yet" rather than as parse failures.
- **FR-012**: When the external API is unreachable on application startup, the application MUST present a clear, actionable error message within 5 seconds rather than appearing to load indefinitely.
- **FR-013**: When the external API returns a validation error with multiple field-level messages, the application MUST display them in a way that lets the user identify and correct each problem.
- **FR-014**: When the external API returns a generic server error, the application MUST display a generic, user-friendly error message and not surface internal details.
- **FR-015**: The base URL of the external API MUST be configurable for each environment without code changes.
- **FR-016**: The application MUST coordinate concurrent token refresh attempts so that only one refresh is in flight at a time and other in-flight requests reuse the resulting credential.
- **FR-017**: For application capabilities that depend on API endpoints that do not yet exist (such as submitting a draft pick or receiving real-time updates), the user interface MUST either omit those capabilities or present them as explicitly read-only — never as broken interactive flows.

### Key Entities

- **User Account**: An authenticated identity owned by the external API. The application holds short-lived and long-lived credentials referencing this identity but does not store the account itself.
- **Player**: An MLB player with profile and statistical data, sourced read-only from the external API.
- **Team**: An MLB team referenced by players and league rosters, sourced read-only from the external API.
- **League**: A fantasy league the user belongs to, owned by the external API. Used to scope player availability, rosters, and other league-bound queries.
- **Scoring Configuration**: A user-defined set of stat-category weightings used by the personal lineup builder. Persisted by the external API.
- **Lineup**: A weekly arrangement of players in roster slots for one of the user's teams. Persisted by the external API.
- **Saved Search**: A named filter configuration for player search. Persisted by the external API.
- **Opaque JSON Field**: One of the five documented fields (position slots, stat categories, draft order, lineup-builder categories, saved-search filters) that the API stores as a JSON string. The application is responsible for parsing and serializing the agreed-upon shapes at the boundary.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can register, log in, exercise player research and personalization features for a session that exceeds the access-credential lifetime, and log out — without ever being prompted to re-authenticate mid-session, provided their long-lived credential remains valid.
- **SC-002**: All player-research and scoring features that worked before the migration continue to work after the migration, verified by running every existing acceptance scenario.
- **SC-003**: The repository contains zero local backend application code, zero database schema or migration files, zero seed scripts, and zero local database services in container orchestration.
- **SC-004**: A new developer can run the web application end-to-end with only the external API running locally — no other local services required.
- **SC-005**: When the external API is unavailable, the user sees a clear, actionable error message within 5 seconds of attempting an action, rather than indefinite loading or a silent failure.

## Assumptions

- The external API is the sole source of truth for users, players, teams, leagues, scoring configurations, lineups, and saved searches; no parallel writes occur to a legacy local database during or after the migration.
- Existing user records and other application data in the legacy local database are discarded; the migration starts fresh against the external API.
- The external API publishes a machine-readable schema that the application can use to generate type-checked data contracts.
- The external API authenticates clients via short-lived access credentials and long-lived refresh credentials returned in response bodies (not cookies).
- The external API's allowed-origin configuration includes the application's origin for the development and target environments.
- The five opaque JSON fields documented by the API will be parsed and serialized client-side following the recommended shapes documented by the API.
- Endpoints that the application calls either exist today on the external API or are documented gaps with explicit out-of-scope handling in this specification.

## Dependencies

- The external API must be running and reachable from the user's browser at a configured base URL.
- The external API's published schema must be accessible for the application's type-generation step.
- The external API's allowed-origin configuration must include the application's origin.

## Accepted Constitution Deviations

These are documented, knowing departures from the project constitution. Each is accepted for the scope of this feature only and tracked for follow-up work.

### Multi-factor authentication (MFA)

**Constitution principle**: §II Functional Principles — "User authentication MUST use industry-standard, secure methods, including multi-factor authentication (MFA) and secure password management."

**Status on this branch**: Not implemented.

**Reason**: The external JellyBaseballV2 API exposes only single-factor email/password authentication. No MFA endpoints are present in the API's OpenAPI document or in `JellyBaseballV2/docs/web-client/AUTH.md`. Implementing MFA in the web client without server support is not possible.

**Mitigations applied**:
- Short-lived access tokens (15 minutes) per AUTH.md.
- Refresh token rotation on every refresh; previous refresh token is invalidated server-side.
- Server-side refresh-token revocation on logout.
- Client-side password rules mirroring the API (minimum 8 characters, at least one digit).

**Follow-up**: A separate future feature will add MFA once JellyBaseballV2 exposes the necessary endpoints (e.g., enrollment, challenge, verification). That feature will pair an API change with a corresponding web-client change.

### Refresh token in browser `localStorage`

**Constitution principle**: §IV Security Principles — "Secure data storage: User information, especially sensitive data, MUST be stored securely using encryption and best-practice security measures."

**Status on this branch**: Refresh token is stored unencrypted in browser `localStorage` under key `jb2:refreshToken`.

**Reason**: The external JellyBaseballV2 API returns tokens in the response body and does not set `httpOnly` cookies (per AUTH.md). With cookies off the table, the only durable client storage that survives a page reload is `localStorage` or `sessionStorage`. `sessionStorage` is rejected because it would force re-login on every browser-session close, contradicting US1 acceptance scenario #3 ("session is restored without prompting for credentials"). Encrypting the value in `localStorage` is rejected as encryption theater — any script with access to the page can also access the decryption routine, so it does not raise the bar against XSS.

**Mitigations applied**:
- Short-lived access tokens (15 minutes); only the long-lived refresh token sits at rest.
- Refresh token rotation on every refresh; the old refresh token is invalidated server-side.
- Server-side refresh-token revocation on logout (with refresh token in the request body, per AUTH.md).
- Single-flight refresh in the client interceptor to avoid concurrent-refresh races.
- Immediate clear of all credentials on refresh failure.
- General XSS defenses inherited from React's default escaping; no `dangerouslySetInnerHTML` introduced by this branch.

**Follow-up**: A separate future feature will move auth to `httpOnly` cookies once JellyBaseballV2 supports them. That feature will replace the in-memory access token + `localStorage` refresh token with cookie-based session handling.

### Granular account control (view, update, delete)

**Constitution principle**: §II Functional Principles — "Granular account control: Users MUST have full control over their account information, privacy settings, and data. This includes the right to view, update, or delete their data and account."

**Status on this branch**: Account *view* is implemented via `GET /api/users/me`. Account *update* and *delete* are not implemented.

**Reason**: The external JellyBaseballV2 API does not currently expose endpoints for updating profile fields (name, email, password change) or deleting an account. Without server endpoints, these operations cannot be performed by the web client.

**Mitigations applied**:
- The current user's profile is visible at all times via `GET /api/users/me`.
- Logout revokes the active refresh token server-side, so a user who wants to terminate a session has a working tool.

**Follow-up**: A separate future feature will add account-management UI once JellyBaseballV2 exposes the necessary endpoints (profile update, password change, account deletion).

### Client-side observability (logs, metrics, tracing)

**Constitution principle**: §V Operational Principles — "Observability: The system MUST be fully observable, providing insights into logs, metrics, and tracing to assist with debugging and performance optimization."

**Status on this branch**: No client-side observability is wired up. Server-side observability remains the responsibility of the JellyBaseballV2 API.

**Reason**: Real client-side observability requires a telemetry backend (Sentry, Datadog, OpenTelemetry collector, or similar) that has not been chosen for this project. Capturing errors only into the browser console would be theater — it produces no operational signal and risks creating a false sense of safety.

**Mitigations applied**:
- The browser console retains its default unhandled-exception and network-error reporting during development.
- All API errors flow through a single mapper (`src/api/errors.ts`) and a single notifier (`src/components/common/ApiErrorNotifier.tsx`), so a future telemetry hook has a small, well-defined surface to attach to.

**Follow-up**: A separate future feature will pick a telemetry vendor and wire client-side error, performance, and user-action capture. That feature will reuse the existing single mapper / single notifier surfaces as integration points.

---

## Out of Scope

- Real-time push notifications for draft picks, waiver resolution, or trade updates. Polling is used as a workaround per API documentation.
- Submitting a draft pick from the application. The API does not expose this endpoint; only commissioner draft controls (start, pause, resume) and read-only views of the draft state are in scope.
- Email-based league invitations. The API treats invitation email as a no-op; only share-link UI is in scope.
- Player news feed. The API treats news as a no-op; the news section is omitted from the UI.
- Migrating existing legacy local-database user records into the external API.
- Any administrative or operator-only capabilities that are not exposed by the external API.
- Trade proposals, counter-offers, vote-based review, and the trading block. The API exposes these endpoints but no UI is built or migrated on this branch; deferred to a future feature.
- Waiver claims, FAAB bids, and waiver-priority adjustments. The API exposes these endpoints but no UI is built or migrated on this branch; deferred to a future feature. Free-agent *add* (when a player is not on waivers) remains in scope and is delivered via the teams API module.
