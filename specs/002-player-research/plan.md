# Implementation Plan: Player Research

**Branch**: `002-player-research` | **Date**: 2025-11-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-player-research/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Player research functionality enables users to search and filter baseball players using customizable criteria (statistic type, position, season, status, date range), view calculated scores based on custom scoring configurations, and save frequently-used filter combinations for quick access. The interface features a horizontal filter panel positioned above the player listing with explicit Apply/Clear button controls, and dynamically displays statistical columns based on the active scoring configuration and player position type (batter/pitcher).

## Technical Context

**Language/Version**: TypeScript 5.0+ / Node.js 20 LTS
**Primary Dependencies**: NestJS 11 (backend), React 18 (frontend), Prisma ORM 6, MLB-StatsAPI
**Storage**: PostgreSQL 15+ with JSONB for flexible scoring configurations
**Testing**: Jest (unit, integration, contract tests)
**Target Platform**: Web browsers (desktop and mobile), mobile-first responsive design
**Project Type**: Web application (backend API + frontend client)
**Performance Goals**:
- Filter application: <5 seconds
- Score recalculation: <2 seconds
- Saved search loading: <3 seconds
- Results display: Support 25+ players simultaneously
- Data freshness: Hourly refresh during active game days

**Constraints**:
- Must integrate with existing MLB-StatsAPI for player data
- Must work with existing scoring configuration system (feature 001)
- Must support WCAG accessibility standards
- Must function on mobile devices with horizontal filter layout

**Scale/Scope**:
- Multi-user system with user-specific saved searches
- Support all active MLB players (~1000+ players)
- Multiple scoring configurations per user
- Pagination for large result sets (>50 players)
- Historical season data access

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Guiding Questions Evaluation

**1. Does this feature respect user privacy and data security?**
✅ **YES** - Saved searches are user-specific and require authentication. No sharing of personal search criteria. Filter selections processed server-side with proper input validation to prevent injection attacks.

**2. Is this design accessible to all users, including those with disabilities?**
⚠️ **NEEDS VERIFICATION** - The horizontal filter panel layout and data table must meet WCAG 2.1 AA standards. Specific considerations:
- Keyboard navigation for all filter controls
- Screen reader compatibility for toggle controls and checkboxes
- Proper ARIA labels for dynamically changing columns
- Sufficient color contrast for Apply/Clear button states (enabled/disabled)
- Focus indicators for all interactive elements
**Action**: Document accessibility requirements in research.md and verify in implementation

**3. Will this implementation perform well on both web and mobile clients?**
✅ **YES** - Mobile-first design approach with horizontal filter layout optimized for smaller screens. Performance targets (<5s filter, <2s scoring) ensure responsive experience. Pagination prevents excessive data rendering. Same API serves both platforms ensuring consistency.

**4. How does this feature contribute to a simple and intuitive user experience?**
✅ **YES** - Explicit Apply/Clear buttons with smart enabling logic prevent confusion about filter state. Dynamic column display reduces visual clutter by showing only relevant statistics. Team abbreviations (3-letter codes) improve scannability. Saved searches reduce repetitive data entry for power users.

**5. Can this feature scale with a growing user base?**
✅ **YES** - Database indexing on common filter fields (position, team, season). Pagination limits result sets. Hourly batch updates reduce real-time data fetching load. Scoring calculations can be cached or pre-computed. PostgreSQL supports horizontal scaling if needed.

### Gates Summary

**Pre-Research Gate Status**: ⚠️ **CONDITIONAL PASS**
- **Blocker**: None
- **Required Action**: Accessibility research must confirm WCAG compliance approach for filter panel and dynamic tables before Phase 1 design

**Post-Design Gate Status**: ✅ **PASS**
- **Accessibility Verification**: Research confirmed WCAG 2.1 AA compliance approach using React ARIA patterns and semantic HTML (see research.md section 2)
- **Design Artifacts Complete**:
  - ✅ data-model.md: Filter panel state, saved search v2 schema, column configuration
  - ✅ contracts/player-research-api.yaml: Updated with new filter parameters (statisticType, positions array, season) and response schema (totalPoints, pointsPerGame, teamAbbr)
  - ✅ quickstart.md: Integration scenarios showing filter panel behavior, Apply/Clear button logic, and dynamic columns
  - ✅ research.md: Accessibility compliance, filter state management, dynamic column display patterns
- **Constitution Compliance**:
  - ✅ Privacy/Security: User-scoped saved searches, server-side input validation
  - ✅ Accessibility: WCAG 2.1 AA compliance approach documented and verified
  - ✅ Performance: Mobile-first design, pagination, caching strategy
  - ✅ User Experience: Explicit Apply/Clear button logic, dynamic columns reduce clutter
  - ✅ Scalability: Database indexing, pagination, batch processing for score calculation

## Project Structure

### Documentation (this feature)

```text
specs/002-player-research/
├── spec.md              # Feature specification with updated filter/column requirements
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output - accessibility, filtering patterns, MLB-StatsAPI
├── data-model.md        # Phase 1 output - filter state, player results, saved searches
├── quickstart.md        # Phase 1 output - integration scenarios
├── contracts/           # Phase 1 output - REST API contracts (OpenAPI)
│   └── player-research-api.yaml
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── player-research/
│   │   ├── player-research.module.ts
│   │   ├── player-research.controller.ts
│   │   ├── player-research.service.ts
│   │   ├── dto/
│   │   │   ├── filter-criteria.dto.ts
│   │   │   ├── player-result.dto.ts
│   │   │   └── saved-search.dto.ts
│   │   └── entities/
│   │       └── saved-search.entity.ts
│   ├── scoring/                    # Existing from feature 001
│   ├── players/
│   │   ├── players.module.ts
│   │   ├── players.service.ts
│   │   └── entities/
│   │       └── player.entity.ts
│   └── mlb-stats/
│       ├── mlb-stats.module.ts
│       └── mlb-stats.service.ts    # MLB-StatsAPI integration
└── tests/
    ├── unit/
    │   └── player-research/
    ├── integration/
    │   └── player-research/
    └── contract/
        └── player-research-api.spec.ts


├── src/
│   ├── features/
│   │   └── player-research/
│   │       ├── components/
│   │       │   ├── FilterPanel.tsx
│   │       │   ├── PlayerListing.tsx
│   │       │   ├── SavedSearches.tsx
│   │       │   └── ScoreBreakdown.tsx
│   │       ├── hooks/
│   │       │   ├── usePlayerFilters.ts
│   │       │   ├── usePlayerResults.ts
│   │       │   └── useSavedSearches.ts
│   │       ├── services/
│   │       │   └── player-research.service.ts
│   │       └── types/
│   │           ├── filter-state.ts
│   │           └── player-result.ts
│   ├── components/              # Shared UI components
│   └── services/                # Shared API client
└── tests/
    ├── unit/
    │   └── player-research/
    └── integration/
        └── player-research/
```

**Structure Decision**: Web application structure selected based on existing backend (NestJS) and frontend (React) from feature 001. Player research is implemented as a new module in both layers consuming the shared API. Frontend uses feature-based organization for component isolation. Backend uses NestJS module pattern for dependency injection and testing.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations identified. Accessibility verification (Question 2) is a standard requirement, not a violation. Research phase will document compliance approach.

## Phase 0: Research (Next Step)

Research tasks to be addressed in `research.md`:

1. **Accessibility Compliance**: Research WCAG 2.1 AA requirements for:
   - Horizontal filter panels with toggle controls
   - Dynamic data tables with changing column headers
   - Enabled/disabled button states with visual and semantic indicators
   - Keyboard navigation patterns for complex filter forms

2. **MLB-StatsAPI Integration**: Document API endpoints for:
   - Player roster data (position, team, status)
   - Historical and current season statistics
   - Rate limiting and caching strategies
   - Data freshness guarantees

3. **Filter State Management**: Research patterns for:
   - Tracking pending vs. applied filter state (React best practices)
   - Determining button enabled/disabled logic
   - URL state synchronization for shareable searches
   - Form validation for date ranges and combinations

4. **Dynamic Column Display**: Research approaches for:
   - Conditionally rendering table columns based on scoring configuration
   - Maintaining sort state when columns change
   - Responsive table design for mobile with 12+ columns
   - Virtual scrolling or pagination for large datasets

5. **Score Calculation Performance**: Research strategies for:
   - Client-side vs. server-side score calculation
   - Caching calculated scores
   - Incremental updates when configuration changes
   - Batch processing for large result sets

## Phase 1: Design (After Research)

Design artifacts to be generated:

1. **data-model.md**: Entity definitions for:
   - SavedSearch (user ID, name, filter criteria JSON, scoring config ID)
   - FilterPanelState (pending filters, applied filters, button states)
   - PlayerResult (player data, statistics, calculated scores, metadata)
   - ColumnConfiguration (visible columns based on position and scoring config)

2. **contracts/player-research-api.yaml**: REST API endpoints for:
   - `GET /api/players/search` - Filter and retrieve players
   - `POST /api/players/score` - Calculate scores for filtered players
   - `GET /api/saved-searches` - List user's saved searches
   - `POST /api/saved-searches` - Create new saved search
   - `PUT /api/saved-searches/{id}` - Update saved search
   - `DELETE /api/saved-searches/{id}` - Delete saved search
   - `GET /api/players/filters/options` - Available filter options (teams, positions, seasons)

3. **quickstart.md**: Integration scenarios including:
   - New user applying filters and viewing results
   - Existing user loading a saved search
   - User changing scoring configuration and seeing scores update
   - Mobile user interacting with horizontal filter panel

## Next Steps

1. Complete Phase 0 research (generate research.md)
2. Re-evaluate Constitution Check based on research findings
3. Complete Phase 1 design (generate data-model.md, contracts/, quickstart.md)
4. Update agent context with any new technologies discovered during research
5. Proceed to `/speckit.tasks` for task generation
