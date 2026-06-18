# Known Gaps — Feature 003 API Migration

Audit of UI flows against missing or no-op JellyBaseballV2 API endpoints (spec.md FR-017).

## Audit Method

Grepped all `src/pages/**` and `src/features/**` for direct API calls, checked each page's imports, and compared rendered affordances against the API contract.

## Findings

### Scoring Configs — No Edit or Delete

**Contract:** `GET /api/scoring-configs`, `POST /api/scoring-configs`, `GET /api/scoring-configs/:id` only.

**UI audit:**
- `ScoringConfigsListPage.tsx` — list only; no edit/delete buttons. **ABSENT — OK.**
- `ScoringConfigFormPage.tsx` — create-only form; no edit/update path. **ABSENT — OK.**
- Old "Activate" button (previously in `ScoringConfigsListPage`) has been removed. **ABSENT — OK.**

### Saved Searches — No Delete

**Contract:** `GET /api/saved-searches`, `POST /api/saved-searches` only.

**UI audit:**
- `SavedSearches.tsx` — lists searches with Apply button; no delete affordance. **ABSENT — OK.**

### Lineups — League-Scoped Re-Architecture Deferred

**Contract:** Lineup endpoints are fully league-scoped at `/api/leagues/{leagueId}/teams/me/...`. A league selector UI is required before the lineup editor can be rendered.

**UI audit:**
- `LineupsPage.tsx` / `LineupList.tsx` — renders "Lineups are league-based" placeholder. **STUBBED — intentional.**
- `LineupEditorPage.tsx` / `LineupEditor.tsx` — renders "Lineup Editor Coming Soon" placeholder. **STUBBED — intentional.**

**Follow-up:** Build a league selector and wire up `useLineupQuery` / `useSetLineupSlotMutation` in a future feature branch.

### Account Settings — MFA / Profile Update / Account Delete

**Contract:** `PATCH /api/users/me` and `DELETE /api/users/me` exist per `contracts/auth.md`. MFA endpoints are not in the current contract surface.

**UI audit:**
- `AccountSettingsPage.tsx` — uses `useAuth()` only; no direct API calls. Displays read-only profile info. No MFA controls, no delete button. **ABSENT — OK for now.**

**Follow-up:** Wire `PATCH /api/users/me` to an edit form if profile updates are a future requirement.

## Summary

All interactive UI flows that would target missing endpoints are either **absent** or **stubbed** with an informational placeholder. No active network call targets a missing endpoint.
