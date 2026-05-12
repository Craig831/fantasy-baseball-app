# Players Contract

**User Story**: US2 — Player Research Reads From the External API
**Source**: `JellyBaseballV2/docs/web-client/` (ENUMS, KNOWN-GAPS, WORKFLOWS)

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/players` | Yes | Paginated player search with filters |
| `GET` | `/api/players/{id}` | Yes | Player detail / profile (`PlayerProfileDto`) |
| `GET` | `/api/players/filters/teams` | Yes | Distinct MLB teams for dropdowns |
| `GET` | `/api/players/filters/positions` | Yes | Distinct positions for dropdowns |
| `GET` | `/api/players/{id}/score-breakdown` | Yes | Score breakdown for a personal scoring config (`?scoringConfigId=`) |

## Query parameters on `GET /api/players`

| Parameter | Type | Notes |
|---|---|---|
| `nameQuery` | `string?` | Free-text name match |
| `positionId` | `number?` | Single position id |
| `mlbTeamId` | `number?` | Single team id |
| `statusCode` | `string?` | Active / IL / etc. |
| `availability` | `'All' | 'FreeAgent' | 'Owned'` | String enum (ENUMS.md) |
| `leagueId` | `number?` | Required when `availability` ≠ `All` |
| `page`, `limit` | `number` | Pagination |
| `sortBy`, `sortOrder` | `string?` | `asc` \| `desc` |

## Notable shapes

- **`PlayerSummaryDto`** in list responses — minimal fields plus current ownership.
- **`PlayerProfileDto`** in detail — full bio, season stats, and `news: []` (always empty per KNOWN-GAPS.md).
- **`PlayerGameDto`** — single-game stat line. `inningsPitched` is **total outs**, not innings — display divisor of 3 (KNOWN-GAPS.md, WORKFLOWS.md). JellyScore in this DTO is server-computed.

## Behaviors

- Pagination shape matches the existing `searchPlayers` consumer in `services/api.ts`. The client maps API pagination metadata into the same `pagination` object the existing UI expects.
- The `availability` filter requires a league context — UI must source the active `leagueId` before enabling free-agent / owned filters.

## Error mapping

| Status | Cause | Client behavior |
|---|---|---|
| 400 | Validation (e.g., bad enum string) | Surface `detail` |
| 401 | Token expired | Silent refresh + retry |
| 404 | Player id not found | Empty / not-found view |

## Out of scope

- Player news (NoOp service).
- Bulk export.
- Custom statistic types beyond what the API exposes.
