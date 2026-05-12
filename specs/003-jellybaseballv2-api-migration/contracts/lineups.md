# Lineups & Roster Contract

**User Story**: US3 — User-Owned Data Persists via the External API
**Source**: `JellyBaseballV2/docs/web-client/WORKFLOWS.md`

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/leagues/{leagueId}/teams/me/dashboard` | Yes | `TeamDashboardDto` — authoritative `currentWeek` |
| `GET` | `/api/leagues/{leagueId}/teams/me/roster` | Yes | Current roster |
| `PUT` | `/api/leagues/{leagueId}/teams/me/roster/move` | Yes | Move spot between `Active` / `Bench` / `InjuredReserve` |
| `GET` | `/api/leagues/{leagueId}/teams/me/lineup/{week}` | Yes | Weekly lineup |
| `PUT` | `/api/leagues/{leagueId}/teams/me/lineup` | Yes | Set a single slot |
| `POST` | `/api/leagues/{leagueId}/free-agents/add` | Yes | Add a free agent (optional drop) |

## Notable shapes

- **`TeamLineupDto` / `TeamLineupSlotDto`**: `isLocked` indicates the slot's game has started — disable edits in UI.
- **`RosterSpotDto`**: status enum `Active | Bench | InjuredReserve`.

## Request bodies

- `PUT /roster/move`: `{ rosterSpotId: number, newStatus: 'Active' | 'Bench' | 'InjuredReserve' }`
- `PUT /lineup`: `{ week: number, slotPosition: string, mlbPlayerId: number }`
- `POST /free-agents/add`: `{ addPlayerId: number, dropRosterSpotId?: number }`

## Behaviors

- The UI never computes the current week independently — it always reads `currentWeek` from `TeamDashboardDto`.
- Moving to `InjuredReserve` requires the player to have an injury status from the MLB feed. Server returns 400 otherwise — surface `detail`.
- Free-agent add returns 400 when the roster is full and no `dropRosterSpotId` is provided. UI must offer a drop selector before submitting.

## Error mapping

| Status | Cause |
|---|---|
| 400 | Locked slot, invalid status transition, full roster without drop |
| 401 | Auth required |
| 404 | League / team / spot not found, or current user lacks access |

## Out of scope

- Bulk lineup set (one slot at a time).
- Lineup history / weekly archive view (not exposed).
