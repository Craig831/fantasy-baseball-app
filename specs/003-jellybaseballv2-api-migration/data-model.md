# Data Model: JellyBaseballV2 API Migration

**Feature**: 003-jellybaseballv2-api-migration
**Date**: 2026-05-07
**Source of truth**: The external API's OpenAPI document at `/swagger/v1/swagger.json`. The TypeScript types in `frontend/src/api/types.generated.ts` are the canonical client-side shapes — this document is a human-readable index.

This repository does **not** own any database schema. All entities below are owned by the JellyBaseballV2 API; the web client only reads and writes them through the documented endpoints.

---

## 1. Identity

### AuthSession (client-only; not a server entity)
A purely client-side aggregate that represents the current authenticated session. Lives in `src/api/tokens.ts`.

| Field | Type | Lifetime | Notes |
|---|---|---|---|
| `accessToken` | `string` (JWT) | In-memory only | Cleared on tab close, full reload, or logout |
| `refreshToken` | `string` (opaque) | `localStorage` | Key: `jb2:refreshToken`; rotated on every refresh |
| `claims` | `JwtPayload` | Derived from `accessToken` | `{ sub, email, role, exp, jti }` |
| `expiresAt` | `Date` | Derived | Used to decide whether to pre-emptively refresh |

**Transitions**: `none → SignedIn` via register or login; `SignedIn → SignedIn` via refresh (rotating tokens); `SignedIn → none` via logout, refresh failure, or explicit user clear.

### UserProfile (`UserProfileDto`)
The current user's public profile, fetched at `GET /api/users/me`. Only the *current* user's name is resolvable; other users are referenced by team name only (per KNOWN-GAPS.md).

Key fields: `id` (GUID), `email`, `firstName?`, `lastName?`, `avatarUrl?` (root-relative — prefix with `VITE_API_BASE_URL` for display).

---

## 2. Baseball reference data (read-only)

These entities back player research (US2). All sourced from the API's MLB-StatsAPI–fed tables.

### Player (`PlayerSummaryDto`, `PlayerProfileDto`)
A single MLB player. Searched via `GET /api/players` with filters: `nameQuery`, `positionId`, `mlbTeamId`, `statusCode`, `availability` (`All` | `FreeAgent` | `Owned`), `leagueId`. Detail at `GET /api/players/{id}`. The `news` field is always `[]` (NoOp service per KNOWN-GAPS.md).

### Team (`TeamSummaryDto`)
An MLB team. Used for filter dropdowns and as a foreign key on player records.

### PlayerGame (`PlayerGameDto`)
A single player's stat line for one game. **Note**: `inningsPitched` is stored as **total outs**, not innings. Display formatting is `Math.floor(outs/3) + '.' + (outs % 3)`. The JellyScore formula uses raw outs internally — do not pre-divide.

### JellyScore (computed, not a DTO)
Hardcoded server-side formula (see WORKFLOWS.md). Returned as part of `PlayerGameDto`. The web client displays it but does not compute it.

---

## 3. League domain (US2/US3 reads, US3 writes)

Most fantasy features are scoped to a league the user belongs to.

### League (`LeagueDto`)
A fantasy league. Lifecycle: `Setup → Active` (auto-transitions when draft completes) `→ Archived`. Created via `POST /api/leagues`; archived via `POST /api/leagues/{id}/archive` (commissioner only). Key fields: `id`, `name`, `season`, `leagueType` (`HeadToHead` | `Rotisserie` | `Categories`), `status`, `commissionerUserId`, `maxTeams`.

### LeagueMember (`LeagueMemberDto`)
A user's membership in one league. Status: `Active` | `Inactive` | `Removed`. Carries `teamName` (the canonical identity for non-self users — see KNOWN-GAPS.md), `faabBudgetRemaining`.

### LeagueInvitation (`LeagueInvitationDto`)
Lifecycle: `Pending → Accepted | Revoked | Expired`. Email field is accepted but no email is sent — share-link UI only. Anonymous preview at `GET /api/leagues/invite/{token}`.

### Settings: roster, scoring, draft

#### RosterSettingsDto
Endpoint: `GET|PUT /api/leagues/{id}/settings/roster`. Holds `positionSlotsJson` (opaque JSON string — see §6).

#### ScoringSettingsDto
Endpoint: `GET|PUT /api/leagues/{id}/settings/scoring`. Holds `statCategoriesJson` (opaque). Display-only today: hardcoded server formula governs actual JellyScore.

#### DraftSettingsDto
Endpoint: `GET /api/leagues/{id}/settings/draft`. Holds `draftType`, `draftStatus`, `draftDate`, `pickTimerSeconds`, `draftOrderJson`. Order set via `PUT /api/leagues/{id}/settings/draft/order` with `{ memberIds: number[] }`. Status transitions: `NotStarted → InProgress → Paused → InProgress → Completed`. **No pick endpoint exists** — UI scope is read-only and commissioner controls.

---

## 4. Team & Roster

### FantasyTeam (`TeamDashboardDto`, `TeamRosterDto`)
The user's team in a given league. Dashboard at `GET /api/leagues/{leagueId}/teams/me/dashboard` (authoritative source for `currentWeek`).

### RosterSpot (`RosterSpotDto`)
A roster slot occupied by a player. Status: `Active` | `Bench` | `InjuredReserve`. Move via `PUT /api/leagues/{leagueId}/teams/me/roster/move` with `{ rosterSpotId, newStatus }`. `InjuredReserve` requires the player to have an injury status from the MLB feed.

### Lineup (`TeamLineupDto`, `TeamLineupSlotDto`)
Weekly lineup. Read at `GET /api/leagues/{leagueId}/teams/me/lineup/{week}`; set a slot via `PUT /api/leagues/{leagueId}/teams/me/lineup` with `{ week, slotPosition, mlbPlayerId }`. `isLocked: true` means the game has started — no further changes.

---

## 5. Player acquisition

### FreeAgentAdd
`POST /api/leagues/{leagueId}/free-agents/add` with `{ addPlayerId, dropRosterSpotId? }`. Returns `RosterSpotDto`. 400 if roster full and no drop specified.

### WaiverClaim (`WaiverClaimDto`)
Lifecycle: `Pending → Awarded | Failed | Withdrawn`. FAAB type adds `bidAmount`. Server-side processing on schedule; client polls per KNOWN-GAPS.md.

### TradeProposal (`TradeProposalDto`)
Lifecycle: `Pending → Accepted | Rejected | Countered | Vetoed | Expired`. Counter creates a new proposal and links via `parentProposalId`; treat `Countered` as terminal in UI. Vote-based review (`LeagueVote`) uses `POST /trades/{id}/vote`.

### TradingBlock
`POST /trading-block` flags one of your players as available; `GET /trading-block` lists league members' flagged players. No proposal is created automatically.

---

## 6. Personal (per-user, league-independent)

### ScoringConfig (`ScoringConfigDto`)
Personal lineup-builder scoring weightings. **Not connected to league scoring.** Endpoint: `GET|POST /api/scoring-configs`, `GET /api/scoring-configs/{id}`. Holds `categoriesJson` (opaque).

### SavedSearch (`SavedSearchDto`)
Saved player-search filter. Endpoint: `GET|POST /api/saved-searches`. Holds `filtersJson` (opaque, **must contain `"filterVersion": 2`**).

---

## 7. Opaque JSON-string fields (boundary contract)

The API stores these as untyped strings; the web client owns the shape. Each field's recommended shape is documented in `JSON-BLOBS.md`. Helpers live in `src/api/jsonBlobs.ts`.

| Field | Carrier DTO | Endpoint | Empty default | Validation |
|---|---|---|---|---|
| `positionSlotsJson` | `RosterSettingsDto` | `/api/leagues/{id}/settings/roster` | `"{}"` | Must be valid JSON; shape not server-validated |
| `statCategoriesJson` | `ScoringSettingsDto` | `/api/leagues/{id}/settings/scoring` | `"{}"` | Must be valid JSON; shape not server-validated |
| `draftOrderJson` | `DraftSettingsDto` | `/api/leagues/{id}/settings/draft/order` (set) | `"[]"` | Array of `LeagueMember.id` integers |
| `categoriesJson` | `ScoringConfigDto` | `/api/scoring-configs` | n/a (always non-empty on create) | Must be valid JSON |
| `filtersJson` | `SavedSearchDto` | `/api/saved-searches` | n/a | **Must contain `"filterVersion": 2`** — server returns 400 otherwise |

Client-side TypeScript shapes (defined in `src/api/jsonBlobs.ts`):

```ts
interface PositionSlot     { positionCode: string; slots: number; }
interface StatCategoryWeight { statKey: string; pointValue: number; }
type     DraftOrder        = number[];
interface SavedSearchFilters {
  filterVersion: 2;
  nameQuery: string | null;
  positionId: number | null;
  mlbTeamId: number | null;
  statusCode: string | null;
  availability: 'All' | 'FreeAgent' | 'Owned' | null;
}
```

Empty defaults (`"{}"` / `"[]"`) parse to `null`, signalling "not yet configured" to the UI.

---

## 8. Validation rules carried into the client

These rules live in the API but the client must mirror them to avoid round-trips on common errors:

- Password: minimum 8 characters, at least one digit (AUTH.md).
- `SavedSearch.filtersJson`: must include `filterVersion: 2`.
- Lineup slot move on a locked slot: blocked client-side using `isLocked`.
- Roster move to `InjuredReserve` when the player has no injury status: server returns 400; surface the API's `detail` message.
- League create: `maxTeams` must be 2–30 (per ERRORS.md example).

Anything not validated client-side surfaces via the RFC 7807 error mapper.

---

## 9. State transitions (summary)

| Entity | Transitions | Trigger |
|---|---|---|
| `AuthSession` | `none → SignedIn` | Register / login |
| `AuthSession` | `SignedIn → SignedIn` (token rotation) | Refresh |
| `AuthSession` | `SignedIn → none` | Logout / refresh failure |
| `League.status` | `Setup → Active` | Draft auto-completes |
| `League.status` | `(Setup|Active) → Archived` | `POST /archive` |
| `Draft.status` | `NotStarted → InProgress → Paused → InProgress → Completed` | Commissioner controls |
| `Invitation.status` | `Pending → Accepted | Revoked | Expired` | Join / revoke / TTL |
| `WaiverClaim.status` | `Pending → Awarded | Failed | Withdrawn` | Server processing / client withdraw |
| `TradeProposal.status` | `Pending → Accepted | Rejected | Countered | Vetoed | Expired` | Various |
| `RosterSpot.status` | `Active ↔ Bench ↔ InjuredReserve` | `PUT /roster/move` |

---

## 10. Excluded from the data model

- Local user accounts in legacy Postgres — not migrated; out of scope.
- A standalone client-side database (IndexedDB, etc.) — none used; TanStack Query in-memory cache only.
- Server-side audit log — owned by the API; not surfaced in the client.
