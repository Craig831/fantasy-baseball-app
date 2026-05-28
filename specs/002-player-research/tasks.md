# Tasks: Player Research (Updated for New Requirements)

**Input**: Design documents from `/specs/002-player-research/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/player-research-api.yaml

**Tests**: Tests are NOT explicitly requested in the specification. Test tasks are excluded per specification guidelines.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

**Note**: This tasks.md reflects the UPDATED specification requirements:
- Horizontal filter panel with Apply/Clear button controls
- Dynamic column display based on scoring configuration
- Filter state management (pending/applied pattern)
- Updated API parameters (statisticType, positions array, season)
- New response format (totalPoints, pointsPerGame, teamAbbr)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Based on plan.md project structure:
- **Backend**: `backend/src/`
- **Frontend**: `src/`
- **Tests**: `backend/tests/`, `tests/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and module structure

- [x] T001 Update Prisma schema for SavedSearch model with filterVersion 2 in backend/prisma/schema.prisma
- [x] T002 Run Prisma migration for SavedSearch schema updates
- [x] T003 [P] Add React ARIA library dependency to frontend package.json for accessibility
- [x] T004 [P] Add lodash.isEqual dependency to frontend package.json for filter state management
- [x] T005 [P] Create filter state types in src/features/player-research/types/filter-state.ts
- [x] T006 [P] Create player result types with new schema in src/features/player-research/types/player-result.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure updates for new filter panel and dynamic columns

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T007 Update FilterCriteria DTO with new parameters (statisticType, positions array, season) in backend/src/modules/player-research/dto/filter-criteria.dto.ts
- [x] T008 Update PlayerResult DTO with new fields (totalPoints, pointsPerGame, teamAbbr) in backend/src/modules/player-research/dto/player-result.dto.ts
- [x] T009 Create column configuration resolver service in backend/src/modules/player-research/services/column-configuration.service.ts
- [x] T010 [P] Update GET /api/players endpoint to accept new filter parameters in backend/src/modules/player-research/player-research.controller.ts
- [x] T011 [P] Update player search service to handle statisticType filter in backend/src/modules/player-research/player-research.service.ts
- [x] T012 [P] Update player search service to handle positions array filter in backend/src/modules/player-research/player-research.service.ts
- [x] T013 [P] Update player search service to handle season filter in backend/src/modules/player-research/player-research.service.ts
- [x] T014 Implement team abbreviation mapping (full name → 3-letter code) in backend/src/modules/player-research/player-research.service.ts
- [x] T015 Implement player name formatting (lastname, firstname) in backend/src/modules/player-research/player-research.service.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Basic Player Search and Filtering (Priority: P1) 🎯 MVP

**Goal**: Enable users to search and filter baseball players using standard criteria with horizontal filter panel and explicit Apply/Clear button controls

**Independent Test**: Log in, access player research page, modify filters in horizontal panel, click Apply button, verify filtered list displays. Verify Clear button resets to defaults. Verify filters don't execute until Apply clicked.

### Implementation for User Story 1

**Backend - Filter API Updates**

- [x] T016 [US1] Add validation for new filter parameters (statisticType enum, season range) in backend/src/modules/player-research/dto/filter-criteria.dto.ts
- [x] T017 [US1] Update filter query builder to use positions array instead of single position in backend/src/modules/player-research/player-research.service.ts
- [x] T018 [US1] Update filter query builder to filter by season year in backend/src/modules/player-research/player-research.service.ts
- [x] T019 [US1] Update response format to return teamAbbr instead of full team name in backend/src/modules/player-research/player-research.service.ts

**Frontend - Horizontal Filter Panel UI (3-line layout)**

- [x] T020 [P] [US1] REDESIGN FilterPanel component with horizontal 3-line layout in src/components/player-research/FilterPanel.tsx
- [x] T021 [P] [US1] Implement statistic type toggle control (batting/pitching) on line 1 in FilterPanel
- [x] T022 [P] [US1] Implement season dropdown on line 1 in FilterPanel
- [x] T023 [P] [US1] Implement status dropdown on line 1 in FilterPanel
- [x] T024 [P] [US1] Implement date range inputs on line 1 in FilterPanel
- [x] T025 [P] [US1] Implement position checkboxes on line 2 in FilterPanel
- [x] T026 [US1] Implement Apply and Clear buttons (right-justified) on line 3 in FilterPanel

**Frontend - Filter State Management (Pending/Applied Pattern)**

- [x] T027 [US1] CREATE usePlayerFilters hook with pending/applied state pattern in src/hooks/usePlayerFilters.ts
- [x] T028 [US1] Implement isDirty calculation (lodash.isEqual) in usePlayerFilters hook
- [x] T029 [US1] Implement button enabling logic (Apply enabled when isDirty, Clear enabled when non-default) in usePlayerFilters hook
- [x] T030 [US1] Implement filter validation (date range, season) in usePlayerFilters hook
- [x] T031 [US1] Implement Clear button behavior (reset to defaults: batting, all positions, current season, active) in usePlayerFilters hook
- [x] T032 [US1] Implement Apply button behavior (copy pending to applied, trigger search) in usePlayerFilters hook
- [x] T033 [US1] Implement default filter values in usePlayerFilters hook

**Frontend - Player Listing Updates**

- [ ] T034 [US1] Update PlayerListing to display teamAbbr instead of full team name in src/components/player-research/PlayerListing.tsx
- [ ] T035 [US1] Update PlayerListing to format player names as "Lastname, Firstname" in src/components/player-research/PlayerListing.tsx
- [ ] T036 [US1] Update player-research service to use new filter parameters in src/services/player-research.service.ts
- [ ] T037 [US1] Update usePlayerResults hook to only fetch on Apply (not on filter change) in src/hooks/usePlayerResults.ts

**Accessibility (WCAG 2.1 AA)**

- [x] T038 [P] [US1] Add fieldset and legend to filter panel for grouping in FilterPanel
- [x] T039 [P] [US1] Implement statistic type toggle as radio group with role="radiogroup" and aria-checked in FilterPanel
- [x] T040 [P] [US1] Add aria-disabled to Apply/Clear buttons based on enabled state in FilterPanel
- [x] T041 [P] [US1] Implement keyboard navigation for toggle control (arrow keys) in FilterPanel
- [x] T042 [P] [US1] Add focus indicators (2px outline, 4.5:1 contrast) to all interactive elements in FilterPanel
- [x] T043 [P] [US1] Add aria-live="polite" region for filter application announcements in FilterPanel
- [x] T044 [P] [US1] Ensure 44x44px touch targets for all buttons and checkboxes (mobile-first) in FilterPanel
- [x] T045 [P] [US1] Add ARIA labels to all filter controls (season, status, date inputs) in FilterPanel

**Integration**

- [x] T046 [US1] Wire FilterPanel to usePlayerFilters hook
- [ ] T047 [US1] Wire Apply button to trigger usePlayerResults fetch with applied filters
- [ ] T048 [US1] Wire Clear button to reset usePlayerFilters state and refetch with defaults
- [ ] T049 [US1] Update URL query parameters on Apply (shareable searches) in PlayerResearch page

**Checkpoint**: User Story 1 complete - users can apply filters via horizontal panel with Apply/Clear buttons and view filtered players

---

## Phase 4: User Story 2 - Player Performance Scoring (Priority: P2)

**Goal**: Enable users to see calculated scores with dynamic column display showing only statistics included in the active scoring configuration

**Independent Test**: Select active scoring configuration, search for players, verify PTS and PPG columns display. Verify only statistical columns included in scoring config are shown. Change scoring config, verify columns adjust dynamically.

### Implementation for User Story 2

**Backend - Score Calculation & Dynamic Columns**

- [ ] T050 [US2] Implement totalPoints calculation in backend/src/modules/player-research/player-research.service.ts
- [ ] T051 [US2] Implement pointsPerGame calculation in backend/src/modules/player-research/player-research.service.ts
- [ ] T052 [US2] Implement column configuration resolver (determine visible stats from scoring config) in backend/src/modules/player-research/services/column-configuration.service.ts
- [ ] T053 [US2] Filter returned statistics object to only include scored stats in backend/src/modules/player-research/player-research.service.ts
- [ ] T054 [US2] Add Redis caching for calculated scores with key scores:{userId}:{configId}:{playerId}:{dateRange} in backend/src/modules/player-research/player-research.service.ts
- [ ] T055 [US2] Implement cache invalidation on scoring configuration change in backend/src/modules/player-research/player-research.service.ts

**Frontend - Score Display & Dynamic Columns**

- [ ] T056 [P] [US2] Add PTS (totalPoints) column to PlayerListing in src/components/player-research/PlayerListing.tsx
- [ ] T057 [P] [US2] Add PPG (pointsPerGame) column to PlayerListing in src/components/player-research/PlayerListing.tsx
- [ ] T058 [US2] CREATE dynamic column resolver function based on scoring config in src/components/player-research/PlayerListing.tsx
- [ ] T059 [US2] Implement batter stat column definitions (GP, AB, H, 2B, 3B, HR, R, RBI, BB, K, SB, CS) in PlayerListing
- [ ] T060 [US2] Implement pitcher stat column definitions (GP, GS, W, L, S, H, ER, BB, K) in PlayerListing
- [ ] T061 [US2] Implement conditional column rendering (only show stats in scoring config) in PlayerListing
- [ ] T062 [US2] Implement sticky columns for Player Name, Pos, Team using CSS position: sticky in PlayerListing
- [ ] T063 [US2] Implement number formatting (whole numbers for counts, 3 decimals for averages) in PlayerListing
- [ ] T064 [US2] Update sort functionality to include PTS and PPG columns in PlayerListing
- [ ] T065 [US2] Set default sort to totalPoints descending in PlayerListing

**Frontend - Score Breakdown**

- [ ] T066 [P] [US2] Create ScoreBreakdown component (modal) in src/components/player-research/ScoreBreakdown.tsx
- [ ] T067 [US2] Implement score breakdown display (stat × points = score) in ScoreBreakdown component
- [ ] T068 [US2] Wire ScoreBreakdown to totalPoints column click in PlayerListing
- [ ] T069 [US2] Fetch score breakdown from existing GET /api/players/{id}/score-breakdown endpoint

**Scoring Configuration Integration**

- [ ] T070 [US2] Add scoring configuration selector dropdown to page header in PlayerResearch page
- [ ] T071 [US2] Implement scoring config change handler (refetch with new configId) in usePlayerResults hook
- [ ] T072 [US2] Implement column update on scoring config change in PlayerListing
- [ ] T073 [US2] Add loading skeleton during score recalculation in PlayerListing

**Accessibility**

- [ ] T074 [P] [US2] Add aria-sort attributes to sortable column headers in PlayerListing
- [ ] T075 [P] [US2] Implement aria-live="polite" announcement for column changes in PlayerListing
- [ ] T076 [P] [US2] Add keyboard navigation and focus management to ScoreBreakdown modal
- [ ] T077 [P] [US2] Ensure ScoreBreakdown modal has proper ARIA roles and labels

**Responsive Design**

- [ ] T078 [US2] Implement responsive column breakpoints (desktop: all, tablet: top 6, mobile: base only) in PlayerListing

**Checkpoint**: User Stories 1 AND 2 complete - users can view scored players with dynamic columns based on scoring configuration

---

## Phase 5: User Story 3 - Save Custom Search Criteria (Priority: P3)

**Goal**: Enable users to save frequently-used filter combinations for quick access

**Independent Test**: Apply filters, save search with name, navigate away, return, load saved search, verify filters auto-apply instantly.

### Implementation for User Story 3

**Backend - Saved Search API (FilterVersion 2 Schema)**

- [ ] T079 [US3] Update SavedSearch entity to support filterVersion 2 schema in backend/src/modules/player-research/entities/saved-search.entity.ts
- [ ] T080 [US3] Update CreateSavedSearchDto with filterVersion 2 fields in backend/src/modules/player-research/dto/create-saved-search.dto.ts
- [ ] T081 [US3] Update UpdateSavedSearchDto with filterVersion 2 fields in backend/src/modules/player-research/dto/update-saved-search.dto.ts
- [ ] T082 [US3] Add filter schema validation for filterVersion 2 in backend/src/modules/player-research/player-research.service.ts
- [ ] T083 [US3] Update POST /api/saved-searches to handle new filter structure in backend/src/modules/player-research/player-research.controller.ts
- [ ] T084 [US3] Update PUT /api/saved-searches/{id} to handle new filter structure in backend/src/modules/player-research/player-research.controller.ts

**Frontend - Saved Search UI**

- [ ] T085 [P] [US3] Update SavedSearches component for filterVersion 2 in src/components/player-research/SavedSearches.tsx
- [ ] T086 [P] [US3] Update useSavedSearches hook to handle new filter structure in src/hooks/useSavedSearches.ts
- [ ] T087 [US3] Update load saved search behavior to populate new filter controls (statisticType toggle, season, positions array) in useSavedSearches hook
- [ ] T088 [US3] Update save search functionality to capture current filterVersion 2 state in useSavedSearches hook
- [ ] T089 [US3] Ensure saved search auto-clicks Apply after loading filters in useSavedSearches hook
- [ ] T090 [US3] Update saved search display to show filter details (statisticType, positions, season) in SavedSearches component

**Migration Support**

- [ ] T091 [US3] Implement backward compatibility for filterVersion 1 saved searches in backend/src/modules/player-research/player-research.service.ts
- [ ] T092 [US3] Add migration logic to convert v1 filters to v2 on load in useSavedSearches hook

**Checkpoint**: All user stories complete - users can save, load, edit, and delete custom search criteria with new filter structure

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements affecting multiple user stories

- [ ] T093 [P] Verify all WCAG 2.1 AA color contrast ratios (4.5:1 text, 3:1 UI) across all components
- [ ] T094 [P] Test with NVDA screen reader (Windows) per research.md guidelines
- [ ] T095 [P] Test with VoiceOver screen reader (Mac) per research.md guidelines
- [ ] T096 [P] Run axe-core automated accessibility tests on PlayerResearch page
- [ ] T097 [P] Implement error boundary for player research feature in src/features/player-research/
- [ ] T098 [P] Add comprehensive error messages for all API failures in PlayerResearch page
- [ ] T099 [P] Implement graceful degradation when MLB API unavailable (show cached data with banner) in backend
- [ ] T100 [P] Add performance monitoring for score calculation (target <2s) in backend
- [ ] T101 [P] Verify database indices per data-model.md (Player: position, team, status; PlayerStatistic: playerId, season, dateRange, GIN on statistics JSONB)
- [ ] T102 [P] Implement retry logic with exponential backoff for MLB-StatsAPI in backend/src/modules/mlb-stats/
- [ ] T103 [P] Add circuit breaker pattern for external API calls in backend/src/modules/mlb-stats/
- [ ] T104 [P] Implement comprehensive logging for debugging in player-research module
- [ ] T105 [P] Add application-level last updated timestamp display in PlayerResearch page header
- [ ] T106 Code review and refactoring across all updated components
- [ ] T107 [P] Implement React.memo for PlayerListing row components for performance
- [ ] T108 [P] Security review: Validate all filter inputs prevent injection attacks
- [ ] T109 Run quickstart.md validation scenarios (Scenarios 1-3 with updated requirements)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately (6 tasks)
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories (9 tasks)
- **User Stories (Phase 3-5)**: All depend on Foundational completion
  - Can proceed in parallel if staffed
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Phase 6)**: Depends on desired user stories being complete (17 tasks)

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories (34 tasks)
- **User Story 2 (P2)**: Can start after Foundational - Builds on US1 player listing but scoring is independent (29 tasks)
- **User Story 3 (P3)**: Can start after Foundational - Operates on US1 filters but saves independently (14 tasks)

### Within Each User Story

- Backend API updates before frontend API calls
- DTOs before controllers
- Hooks before components
- Components before integration
- Core functionality before accessibility
- Core functionality before responsive design

### Parallel Opportunities

- **Setup**: All 6 tasks can run in parallel
- **Foundational**: T007-T015 can run in parallel after schema updates
- **Within US1**: T016-T019 (backend), T020-T026 (filter panel), T038-T045 (accessibility) can run in parallel at appropriate stages
- **Within US2**: T050-T055 (backend), T056-T065 (columns), T074-T077 (accessibility) can run in parallel
- **Within US3**: T079-T084 (backend), T085-T090 (frontend) can run in parallel
- **Polish**: Most tasks (T093-T108) can run in parallel

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (6 tasks)
2. Complete Phase 2: Foundational (9 tasks) - CRITICAL
3. Complete Phase 3: User Story 1 (34 tasks)
4. **STOP and VALIDATE**:
   - Test horizontal filter panel with Apply/Clear buttons
   - Verify filters don't execute until Apply clicked
   - Test keyboard navigation and screen reader
   - Verify team abbreviations and name formatting
5. Deploy/demo if ready

**Total MVP tasks**: 49 tasks

### Incremental Delivery

1. **Foundation** (Phase 1 + 2): 15 tasks → Schema and API updates ready
2. **MVP** (+ User Story 1): 34 tasks → Horizontal filter panel working (49 total)
3. **Scoring** (+ User Story 2): 29 tasks → Add dynamic columns and scores (78 total)
4. **Saved Searches** (+ User Story 3): 14 tasks → Add save/load with v2 schema (92 total)
5. **Polish** (Phase 6): 17 tasks → Production-ready (109 total)

### Parallel Team Strategy

With multiple developers:

1. **Foundation Together** (Phase 1 + 2): Complete setup
2. **After Foundational**:
   - Developer A: User Story 1 (Filter Panel)
   - Developer B: User Story 2 (Scoring) - can start after T015
   - Developer C: User Story 3 (Saved Searches) - can start after T015
3. Stories integrate independently
4. **Team Together**: Polish phase

---

## Summary

- **Total Tasks**: 109
- **Setup Phase**: 6 tasks
- **Foundational Phase**: 9 tasks (BLOCKS all stories)
- **User Story 1** (MVP): 34 tasks (Horizontal Filter Panel with Apply/Clear)
- **User Story 2**: 29 tasks (Dynamic Columns & Scoring)
- **User Story 3**: 14 tasks (Saved Searches v2)
- **Polish Phase**: 17 tasks
- **Parallel Opportunities**: ~50 tasks marked [P]
- **MVP Scope**: Phases 1-3 (49 tasks) delivers horizontal filter panel with explicit Apply/Clear button controls

---

## Notes

- This tasks.md reflects the UPDATED specification with horizontal filter panel and dynamic columns
- Previous implementation had vertical filter panel with auto-apply - this is being redesigned
- Filter state management uses pending/applied pattern (not auto-apply)
- Dynamic columns filter based on scoring configuration (not fixed columns)
- SavedSearch schema updated to filterVersion 2 (statisticType, positions array, season)
- Player names formatted as "Lastname, Firstname"
- Team abbreviations are 3-letter codes (NYY, LAA, COL)
- Tests not included per specification (no explicit test requirement)
- Accessibility (WCAG 2.1 AA) is critical per constitution
- [P] tasks can run in parallel (different files, no dependencies)
- [Story] label maps to user stories (US1, US2, US3)
