# Implementation Plan: Player Research and Scoring Platform

**Branch**: `001-player-research-scoring` | **Date**: 2025-10-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-player-research-scoring/spec.md`

## Summary

Build a baseball-focused fantasy sports platform where registered users can create custom scoring configurations, research MLB players with advanced filtering, and create scored lineups. The platform will feature:
- Secure user account management with MFA support
- Custom scoring system configuration for baseball statistics
- Player research with hourly-updated MLB data
- Lineup creation and post-game actual vs. projected scoring
- Mobile-first responsive design with WCAG Level AA accessibility
- RESTful API architecture using MLB-StatsAPI for player data

## Technical Context

**Language/Version**: TypeScript 5.0+ / Node.js 20 LTS
**Primary Dependencies**:
- Backend: NestJS 10+ (TypeScript REST API), Prisma (ORM), Passport.js (auth), class-validator
- Frontend: React 18+, TypeScript, TailwindCSS (mobile-first styling), TanStack Query (data fetching)
- Auth: bcrypt (password hashing), jsonwebtoken (JWT), speakeasy (MFA/TOTP)
- Data Source: mlb-stats-api (npm package for MLB data) with abstraction for future ESPN API migration
- Testing: Jest (backend + frontend), Supertest (API integration tests), React Testing Library

**Storage**: PostgreSQL 15+ (relational data with JSONB for flexible scoring configs)
**Testing**: Jest with ts-jest for backend; Jest + React Testing Library for frontend
**Target Platform**:
- Backend: Linux server (Docker containers, Node.js runtime)
- Frontend: Modern browsers (Chrome, Firefox, Safari, Edge - latest 2 versions)
- Mobile: iOS (latest 2 versions), Android (latest 2 versions) via responsive web

**Project Type**: Web application (separate frontend + backend with shared API)
**Performance Goals**:
- API p95 latency <200ms
- Player research queries <500ms for 1000+ player dataset
- Frontend first contentful paint <1.5s on 3G
- Lighthouse performance score 90+, accessibility score 95+

**Constraints**:
- WCAG 2.1 Level AA compliance mandatory
- All PII encrypted at rest (AES-256)
- Hourly MLB data sync (cron job via NestJS @Cron decorator)
- Post-game only actual scoring
- 1000 concurrent users target

**Scale/Scope**:
- Initial: 1000-5000 users, ~1000 MLB players, ~30 teams
- Growth: 50k users, multi-season historical data
- Horizontal scaling via stateless API + PostgreSQL read replicas + Redis caching

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. User Experience (UX) and Interface (UI) Principles

✅ **User-centric design**: All features start from user stories (P1-P5). Acceptance scenarios validate user goals.
✅ **Accessibility first**: WCAG 2.1 Level AA required (FR-031). Lighthouse accessibility score 95+ (SC-007).
✅ **Mobile-first approach**: TailwindCSS mobile-first utilities. Performance targets include 3G mobile (SC-012).
✅ **Consistent design language**: Single React component library. TailwindCSS ensures consistency across screens.

**Status**: PASS - All UI principles addressed in design.

### II. Functional Principles (User Accounts)

✅ **User account as core identity**: All data (scoring configs, lineups) tied to User entity (FR-001-007).
✅ **Simplified onboarding**: Email + password only at signup. Email verification via link (FR-002).
✅ **Secure authentication**: MFA via TOTP (FR-003), bcrypt password hashing (cost 12), JWT-based sessions.
✅ **Granular account control**: View/update/delete account (FR-005). GDPR-compliant data export/deletion.

**Status**: PASS - All account principles met.

### III. Technical Principles

✅ **API-first development**: RESTful API with OpenAPI spec (FR-028, FR-030). Frontend/mobile consume same API.
✅ **Performance-driven**: p95 <200ms (SC-009), research <500ms (SC-003), FCP <1.5s (SC-012).
✅ **Scalable architecture**: Stateless API, horizontal scaling, PostgreSQL read replicas, Redis caching layer.
✅ **Cross-platform compatibility**: Modern browsers + mobile web (FR-034, FR-035). Responsive design.

**Status**: PASS - All technical principles satisfied.

### IV. Security Principles

✅ **Data privacy by design**: Minimal data collection. No unnecessary PII. Explicit consent for data use.
✅ **Secure by default**: Parameterized queries via Prisma (SQL injection prevention), class-validator input validation, helmet middleware (CSP headers, XSS prevention), @nestjs/throttler rate limiting.
✅ **Regular security audits**: Dependency scanning (npm audit, Dependabot), SAST tooling (ESLint security plugins), quarterly reviews planned.
✅ **Secure data storage**: bcrypt password hashing (cost 12), field-level encryption for sensitive PII, TLS in transit.

**Status**: PASS - All security measures in place.

### V. Operational Principles

✅ **Reliability and uptime**: 99.5% uptime target (SC-005). Health checks, auto-restart, load balancing.
✅ **Observability**: Structured logging (Winston with JSON), Prometheus metrics (@willsoto/nestjs-prometheus), distributed tracing (OpenTelemetry), alerting.
✅ **Auditable**: AuditLog entity captures all auth events (FR-007) and data modifications (SC-011).

**Status**: PASS - All operational requirements addressed.

### Guiding Questions Evaluation

1. **Does this feature respect user privacy and data security?**
   - ✅ YES: MFA, encryption at rest/transit, minimal data collection, GDPR compliance, audit logging.

2. **Is this design accessible to all users, including those with disabilities?**
   - ✅ YES: WCAG 2.1 Level AA mandatory, semantic HTML, ARIA labels, keyboard navigation, screen reader support.

3. **Will this implementation perform well on both web and mobile clients?**
   - ✅ YES: Mobile-first CSS, p95 <200ms API, FCP <1.5s on 3G, lazy loading, optimized queries, Redis caching.

4. **How does this feature contribute to a simple and intuitive user experience?**
   - ✅ YES: Clear user stories, guided workflows (onboarding → scoring → research → lineup), contextual help, progressive disclosure.

5. **Can this feature scale with a growing user base?**
   - ✅ YES: Stateless API (horizontal scaling), PostgreSQL read replicas, Redis caching, hourly batch data sync, CDN for static assets.

**Overall Constitution Check**: ✅ PASS - All principles satisfied. No violations requiring justification.

## Project Structure

### Documentation (this feature)

```text
specs/001-player-research-scoring/
├── spec.md              # Feature specification with user stories
├── plan.md              # This file (implementation plan)
├── research.md          # Phase 0: Technology research and decisions
├── data-model.md        # Phase 1: Entity-relationship design
├── quickstart.md        # Phase 1: Integration test scenarios
├── contracts/           # Phase 1: OpenAPI REST API specifications
│   ├── auth.openapi.yaml
│   ├── scoring.openapi.yaml
│   ├── players.openapi.yaml
│   └── lineups.openapi.yaml
└── tasks.md             # Phase 2: Task breakdown (generated by /speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts      # Registration, login, logout, MFA
│   │   │   ├── auth.service.ts         # Auth business logic
│   │   │   ├── strategies/
│   │   │   │   ├── jwt.strategy.ts     # JWT validation
│   │   │   │   └── local.strategy.ts   # Email/password validation
│   │   │   ├── guards/
│   │   │   │   ├── jwt-auth.guard.ts   # Protect routes
│   │   │   │   └── mfa.guard.ts        # MFA validation
│   │   │   ├── decorators/
│   │   │   │   └── current-user.ts     # Get authenticated user
│   │   │   └── dto/
│   │   │       ├── register.dto.ts
│   │   │       ├── login.dto.ts
│   │   │       └── mfa.dto.ts
│   │   ├── users/
│   │   │   ├── users.controller.ts     # User account management
│   │   │   ├── users.service.ts
│   │   │   ├── entities/
│   │   │   │   └── user.entity.ts      # Prisma model reference
│   │   │   └── dto/
│   │   │       ├── update-user.dto.ts
│   │   │       └── user-response.dto.ts
│   │   ├── scoring/
│   │   │   ├── scoring.controller.ts   # Scoring config CRUD
│   │   │   ├── scoring.service.ts      # Scoring calculation engine
│   │   │   ├── entities/
│   │   │   │   └── scoring-config.entity.ts
│   │   │   └── dto/
│   │   │       ├── create-scoring.dto.ts
│   │   │       └── update-scoring.dto.ts
│   │   ├── players/
│   │   │   ├── players.controller.ts   # Player research endpoints
│   │   │   ├── players.service.ts      # Search, filter, scoring
│   │   │   ├── providers/
│   │   │   │   ├── player-data.interface.ts
│   │   │   │   ├── mlb-stats.provider.ts    # Current: mlb-stats-api
│   │   │   │   └── espn-api.provider.ts     # Future: ESPN API
│   │   │   ├── entities/
│   │   │   │   ├── player.entity.ts
│   │   │   │   └── player-statistic.entity.ts
│   │   │   └── dto/
│   │   │       ├── player-filter.dto.ts
│   │   │       └── player-response.dto.ts
│   │   ├── lineups/
│   │   │   ├── lineups.controller.ts   # Lineup CRUD
│   │   │   ├── lineups.service.ts      # Validation, scoring calculation
│   │   │   ├── entities/
│   │   │   │   ├── lineup.entity.ts
│   │   │   │   └── lineup-slot.entity.ts
│   │   │   └── dto/
│   │   │       ├── create-lineup.dto.ts
│   │   │       └── update-lineup.dto.ts
│   │   ├── audit/
│   │   │   ├── audit.service.ts        # Audit log creation
│   │   │   ├── entities/
│   │   │   │   └── audit-log.entity.ts
│   │   │   └── interceptors/
│   │   │       └── audit.interceptor.ts
│   │   └── jobs/
│   │       ├── jobs.module.ts
│   │       └── sync-mlb-data.service.ts # @Cron hourly job
│   ├── common/
│   │   ├── decorators/
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts
│   │   ├── interceptors/
│   │   │   └── logging.interceptor.ts
│   │   ├── pipes/
│   │   │   └── validation.pipe.ts
│   │   └── middleware/
│   │       ├── rate-limit.middleware.ts
│   │       └── helmet.middleware.ts
│   ├── config/
│   │   ├── database.config.ts          # Prisma configuration
│   │   ├── jwt.config.ts
│   │   └── app.config.ts
│   ├── prisma/
│   │   ├── schema.prisma               # Database schema
│   │   ├── migrations/
│   │   └── seed.ts
│   ├── app.module.ts
│   └── main.ts                         # NestJS bootstrap
├── test/
│   ├── unit/
│   ├── integration/
│   │   └── *.e2e-spec.ts
│   └── jest-e2e.json
├── Dockerfile
├── package.json
├── tsconfig.json
└── nest-cli.json


├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── SignupForm.tsx
│   │   │   └── MFASetup.tsx
│   │   ├── scoring/
│   │   │   ├── ScoringConfigForm.tsx
│   │   │   └── ScoringConfigList.tsx
│   │   ├── players/
│   │   │   ├── PlayerSearch.tsx
│   │   │   ├── PlayerFilters.tsx
│   │   │   ├── PlayerTable.tsx
│   │   │   └── PlayerDetail.tsx
│   │   ├── lineups/
│   │   │   ├── LineupEditor.tsx
│   │   │   ├── PositionSlot.tsx
│   │   │   ├── LineupList.tsx
│   │   │   └── LineupScore.tsx
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Navigation.tsx
│   │   │   └── Footer.tsx
│   │   └── common/
│   │       ├── Button.tsx
│   │       ├── Input.tsx
│   │       ├── Modal.tsx
│   │       └── Spinner.tsx
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── SignupPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── ScoringPage.tsx
│   │   ├── PlayersPage.tsx
│   │   ├── LineupsPage.tsx
│   │   └── AccountPage.tsx
│   ├── services/
│   │   ├── api.ts                      # Axios client with interceptors
│   │   ├── authService.ts
│   │   ├── scoringService.ts
│   │   ├── playerService.ts
│   │   └── lineupService.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── usePlayers.ts
│   │   └── useLineup.ts
│   ├── utils/
│   │   ├── validation.ts
│   │   ├── formatting.ts
│   │   └── accessibility.ts
│   ├── types/
│   │   ├── user.ts
│   │   ├── scoring.ts
│   │   ├── player.ts
│   │   └── lineup.ts
│   ├── App.tsx
│   ├── index.tsx
│   └── index.css
├── tests/
│   └── *.test.tsx
├── Dockerfile
├── package.json
├── tsconfig.json
└── tailwind.config.js

infrastructure/
├── docker-compose.yml                  # Local development environment
├── nginx.conf                          # Reverse proxy configuration
└── prometheus.yml                      # Monitoring configuration
```

**Structure Decision**: Web application (Option 2) selected. Separate backend (NestJS TypeScript) and frontend (React TypeScript) with shared RESTful API. This aligns with API-first development principle and enables independent scaling of backend. Mobile support via responsive web (not native apps per out-of-scope). NestJS modular architecture provides clear separation of concerns and built-in OpenAPI documentation generation.

## Complexity Tracking

No constitution violations. This section is not applicable.

---

**Phase 0 (research.md) and Phase 1 (data-model.md, contracts/, quickstart.md) artifacts follow.**
