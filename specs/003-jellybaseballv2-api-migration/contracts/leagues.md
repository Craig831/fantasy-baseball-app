# Leagues Contract

**User Story**: US2 (reads), US3 (settings writes)
**Source**: `JellyBaseballV2/docs/web-client/WORKFLOWS.md`, `ENUMS.md`

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/api/leagues` | Yes | Leagues the current user belongs to |
| `POST` | `/api/leagues` | Yes | Create a league |
| `GET` | `/api/leagues/{id}` | Yes | League detail |
| `POST` | `/api/leagues/{id}/archive` | Yes (commissioner) | Archive a league |
| `GET` | `/api/leagues/{id}/members` | Yes | All members |
| `GET` | `/api/leagues/{id}/invite-code` | Yes (commissioner) | Permanent invite code |
| `POST` | `/api/leagues/{id}/invitations` | Yes (commissioner) | Generate one-time token |
| `DELETE` | `/api/leagues/{id}/invitations/{invId}` | Yes (commissioner) | Revoke |
| `GET` | `/api/leagues/invite/{token}` | **No** (anonymous) | Preview league before join |
| `POST` | `/api/leagues/join` | Yes | Join with `{ token, teamName }` |
| `GET` | `/api/leagues/{id}/settings/roster` | Yes | `RosterSettingsDto` (incl. `positionSlotsJson`) |
| `PUT` | `/api/leagues/{id}/settings/roster` | Yes (commissioner) | Update roster settings |
| `GET` | `/api/leagues/{id}/settings/scoring` | Yes | `ScoringSettingsDto` (incl. `statCategoriesJson`) |
| `PUT` | `/api/leagues/{id}/settings/scoring` | Yes (commissioner) | Update scoring settings |
| `GET` | `/api/leagues/{id}/settings/draft` | Yes | `DraftSettingsDto` (incl. `draftOrderJson`, `draftStatus`) |
| `PUT` | `/api/leagues/{id}/settings/draft` | Yes (commissioner) | Update draft settings |
| `PUT` | `/api/leagues/{id}/settings/draft/order` | Yes (commissioner) | `{ memberIds: number[] }` |
| `POST` | `/api/leagues/{id}/settings/draft/start` | Yes (commissioner) | Only valid from `NotStarted` |
| `POST` | `/api/leagues/{id}/settings/draft/pause` | Yes (commissioner) | Only valid from `InProgress` |
| `POST` | `/api/leagues/{id}/settings/draft/resume` | Yes (commissioner) | Only valid from `Paused` |

## Notable shapes

- **`LeagueDto`**: includes `commissionerUserId` (GUID — only resolvable to the *current* user). For non-self members, display `teamName` (KNOWN-GAPS.md).
- **`LeagueMemberDto`**: includes `teamName`, `status`, `faabBudgetRemaining`.
- **`DraftSettingsDto.draftOrderJson`**: opaque JSON string — array of `LeagueMember.id` integers (JSON-BLOBS.md §3).
- **`RosterSettingsDto.positionSlotsJson`**: opaque — array of `{ positionCode, slots }` (JSON-BLOBS.md §1).
- **`ScoringSettingsDto.statCategoriesJson`**: opaque — array of `{ statKey, pointValue }` (JSON-BLOBS.md §2). Display-only today.

## Enums

`LeagueType`: `HeadToHead | Rotisserie | Categories`
`LeagueStatus`: `Setup | Active | Archived`
`LeagueMemberStatus`: `Active | Inactive | Removed`
`LeagueInvitationStatus`: `Pending | Accepted | Revoked | Expired`
`DraftType`: `Snake | Auction | Offline`
`DraftStatus`: `NotStarted | Paused | InProgress | Completed`

All sent and received as strings.

## Polling

- While viewing a draft control page with `draftStatus = InProgress`, poll `GET /settings/draft` every 5 s. Stop on unmount or when status reaches `Completed`. Use TanStack Query `refetchInterval`.

## Error mapping

| Status | Title | Cause |
|---|---|---|
| 400 | `Bad Request` | e.g., `"Cannot start draft from status 'InProgress'."` — show `detail` toast |
| 401 | `Unauthorized` | Commissioner action by non-commissioner returned as 401 |
| 404 | `Not Found` | League/member/invitation not found, or current user lacks access |

## Out of scope

- Submitting a draft pick (no endpoint).
- Email-based invitation send (no-op).
- Real-time draft updates (polling only).
