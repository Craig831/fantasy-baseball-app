# Research: Player Research and Scoring Platform

**Feature**: 001-player-research-scoring
**Date**: 2025-10-24
**Phase**: 0 - Technology Research and Architecture Decisions

## Overview

This document captures research findings, technology choices, and architectural decisions for the Player Research and Scoring Platform. All decisions are informed by the project constitution's five core principles and performance/security requirements.

## Technology Stack Decisions

### Backend Framework: NestJS

**Decision**: Use NestJS 10+ as the backend framework

**Rationale**:
- **TypeScript-first**: Provides end-to-end type safety with React frontend, reducing runtime errors
- **Built-in OpenAPI**: `@nestjs/swagger` decorators auto-generate OpenAPI 3.0 spec (FR-030 requirement)
- **Modular architecture**: Clear separation of concerns aligns with maintainability goals
- **Dependency injection**: Simplifies testing and enables provider abstraction for MLB data sources
- **Passport.js integration**: `@nestjs/passport` provides robust authentication strategies (JWT, local)
- **Enterprise adoption**: Used by Adidas, Roche, Decathlon - proven at scale
- **Performance**: Built on Express/Fastify, handles 1000+ concurrent users easily

**Alternatives Considered**:
- **Express + TypeScript**: Rejected due to lack of built-in structure, manual OpenAPI generation
- **Fastify + TypeScript**: Rejected due to smaller ecosystem and less mature NestJS comparison

### ORM: Prisma

**Decision**: Use Prisma ORM with PostgreSQL

**Rationale**:
- **Type-safe queries**: Auto-generated TypeScript types prevent runtime SQL errors
- **Migration management**: Prisma Migrate handles schema evolution safely
- **Performance**: Optimized query engine, supports connection pooling
- **JSONB support**: Scoring configurations stored as flexible JSONB (PostgreSQL feature)
- **Audit trail**: Built-in created/updated timestamps, easy to extend for audit logging
- **Developer experience**: Prisma Studio for database inspection, excellent VS Code extension

**Alternatives Considered**:
- **TypeORM**: Rejected due to decorator-heavy approach causing performance issues at scale
- **Sequelize**: Rejected due to weaker TypeScript support and verbose configuration

### Frontend Framework: React 18+ with TypeScript

**Decision**: Use React 18 with TypeScript, TailwindCSS, and TanStack Query

**Rationale**:
- **React 18**: Concurrent rendering enables better mobile performance (SC-012 target)
- **TypeScript**: Type safety across backend boundary using shared types
- **TailwindCSS**: Mobile-first utilities, rapid prototyping, consistent design system (constitution principle I)
- **TanStack Query**: Server state management, automatic caching, optimistic updates for lineup editing
- **Accessibility**: React Testing Library enforces accessible patterns, supports WCAG 2.1 Level AA

**Alternatives Considered**:
- **Vue.js**: Rejected to maintain TypeScript consistency, React has larger talent pool
- **Next.js**: Deferred to future iteration; SSR not required for authenticated app, adds complexity

### Authentication Strategy

**Decision**: JWT (JSON Web Tokens) with refresh tokens + TOTP MFA

**Rationale**:
- **Stateless API**: JWTs enable horizontal scaling without shared session storage (constitution principle III)
- **Security**: Short-lived access tokens (15 min) + long-lived refresh tokens (7 days)
- **MFA**: TOTP via `speakeasy` library, compatible with Google Authenticator, Authy (FR-003)
- **Standard compliance**: RFC 7519 (JWT), RFC 6238 (TOTP)
- **Revocation**: Refresh token rotation with database tracking for account deletion (FR-005)

**Implementation**:
- Access token payload: `{ sub: userId, email, roles, iat, exp }`
- Refresh token: Random UUID stored in database with user association
- MFA enforced after successful email/password validation, before access token issuance

**Alternatives Considered**:
- **Session-based auth**: Rejected due to horizontal scaling complications (sticky sessions required)
- **OAuth2/OIDC**: Deferred to future; adds complexity, no third-party providers in MVP

### Data Source: MLB-StatsAPI

**Decision**: Use `mlb-stats-api` npm package with provider abstraction

**Rationale**:
- **Free and open source**: No API key required, official MLB data
- **Comprehensive data**: Player stats, game logs, team info, real-time scores
- **TypeScript support**: `@types/mlb-stats-api` available
- **Active maintenance**: Regular updates during MLB season
- **Abstraction layer**: `IPlayerDataProvider` interface enables future ESPN API migration without service layer changes

**Provider Interface**:
```typescript
interface IPlayerDataProvider {
  searchPlayers(filters: PlayerFilters): Promise<Player[]>;
  getPlayerStats(playerId: string, season: number): Promise<PlayerStatistic[]>;
  syncPlayers(): Promise<void>;
  syncStats(date: Date): Promise<void>;
}
```

**Data Sync Strategy**:
- **Hourly sync**: NestJS `@Cron('0 * * * *')` job fetches latest stats (FR-019)
- **Incremental updates**: Only sync changed players/stats since last sync
- **Post-game scoring**: Batch job runs 2 hours after last game end time
- **Caching**: Redis cache for player search results (5-minute TTL)

**Alternatives Considered**:
- **ESPN API**: Requires scraping (unofficial), rate-limited, IP blocking risks
- **SportsData.io**: Commercial API ($99+/month), unnecessary for MVP

### Database: PostgreSQL 15+

**Decision**: Use PostgreSQL 15+ with JSONB for scoring configurations

**Rationale**:
- **ACID compliance**: Transactions for lineup operations (FR-025)
- **JSONB**: Flexible scoring config storage without schema migrations for new stats
- **Performance**: Indexed JSONB queries for scoring calculations (GIN indexes)
- **Scalability**: Read replicas for player research queries (constitution principle III)
- **Full-text search**: Built-in FTS for player name search (alternative to Elasticsearch for MVP)
- **Data integrity**: Foreign key constraints, check constraints for position validation

**Schema Design**:
- **Users**: uuid primary key, email unique index, bcrypt hash, MFA fields
- **ScoringConfigurations**: JSONB for stat categories, user_id foreign key
- **Players**: Composite index on (team, position) for filter queries
- **Lineups**: Soft delete (deleted_at) for user control (FR-026)

**Alternatives Considered**:
- **MongoDB**: Rejected due to lack of transactional guarantees, harder to enforce relational integrity
- **MySQL**: Rejected due to weaker JSONB performance, less mature full-text search

## Architecture Patterns

### API Design: RESTful with Resource-Oriented URLs

**Decision**: RESTful API following REST constraints

**Endpoints Structure**:
```
POST   /auth/register          # User registration
POST   /auth/login             # Login (returns access + refresh tokens)
POST   /auth/refresh           # Refresh access token
POST   /auth/mfa/setup         # Generate TOTP secret
POST   /auth/mfa/verify        # Verify TOTP code
POST   /auth/logout            # Invalidate refresh token

GET    /users/me               # Get current user profile
PATCH  /users/me               # Update profile
DELETE /users/me               # Delete account (GDPR)

GET    /scoring-configs        # List user's scoring configs
POST   /scoring-configs        # Create new config
GET    /scoring-configs/:id    # Get specific config
PATCH  /scoring-configs/:id    # Update config
DELETE /scoring-configs/:id    # Delete config
PATCH  /scoring-configs/:id/activate  # Set as default

GET    /players                # Search players with filters
GET    /players/:id            # Get player details + stats
GET    /players/:id/stats      # Get detailed stat breakdown

GET    /lineups                # List user's lineups
POST   /lineups                # Create new lineup
GET    /lineups/:id            # Get lineup with scores
PATCH  /lineups/:id            # Update lineup (add/remove players)
DELETE /lineups/:id            # Delete lineup
POST   /lineups/:id/duplicate  # Duplicate lineup
```

**Rationale**:
- Resource-based URLs (nouns, not verbs)
- HTTP verbs map to CRUD operations
- Consistent response format: `{ data, meta?, errors? }`
- Pagination via query params: `?page=1&limit=20`
- Filtering via query params: `?position=SS&team=NYY`
- Sorting via query param: `?sort=score:desc`

### Scoring Calculation Engine

**Decision**: In-memory calculation with database fallback

**Algorithm**:
```typescript
calculatePlayerScore(player: Player, config: ScoringConfig): number {
  let score = 0;
  for (const [stat, points] of Object.entries(config.categories)) {
    const statValue = player.stats[stat] ?? 0;
    score += statValue * points;
  }
  return score;
}
```

**Optimization**:
- **Batch calculation**: Calculate scores for all players in single pass
- **Caching**: Redis cache for config-specific player scores (invalidate hourly)
- **Database view**: Materialized view for common scoring configs (refresh hourly)
- **Frontend caching**: TanStack Query caches player scores with stale-while-revalidate

**Rationale**:
- Simple algorithm (<500ms for 1000 players, meets SC-003)
- No complex aggregations or subqueries
- Config flexibility without schema changes

### Security Implementation

**Password Security**:
- **bcrypt cost**: 12 rounds (2^12 = 4096 iterations)
- **Validation**: Min 12 chars, 1 uppercase, 1 lowercase, 1 number, 1 special
- **Reset flow**: Signed JWT token (30-minute expiry) emailed to user

**API Security**:
- **Rate limiting**: `@nestjs/throttler` - 100 req/15min per IP, 500 req/15min per user
- **Helmet**: CSP headers, XSS protection, HSTS, frame options
- **CORS**: Whitelist frontend domain only
- **Input validation**: `class-validator` on all DTOs, sanitize HTML inputs
- **SQL injection**: Prisma parameterized queries (no raw SQL)

**Data Encryption**:
- **At rest**: PostgreSQL transparent data encryption (TDE) for PII columns
- **In transit**: TLS 1.3 required (nginx configuration)
- **MFA secrets**: Encrypted with app-level key (AES-256-GCM)

### Observability Stack

**Logging**:
- **Winston**: Structured JSON logs to stdout (12-factor app)
- **Log levels**: ERROR (alerts), WARN (review), INFO (audit), DEBUG (dev only)
- **Correlation IDs**: Request ID header propagated through all services

**Metrics**:
- **Prometheus**: `@willsoto/nestjs-prometheus` for NestJS metrics
- **Custom metrics**: API latency (p50, p95, p99), player search time, lineup save time
- **Business metrics**: Active users, lineups created, scoring configs per user

**Tracing**:
- **OpenTelemetry**: Distributed tracing for debugging slow requests
- **Spans**: Database queries, external API calls (MLB-StatsAPI), cache lookups

**Alerting**:
- **PagerDuty**: P1 (API down), P2 (high error rate), P3 (slow responses)
- **Thresholds**: p95 latency >500ms, error rate >1%, uptime <99.5%

## Performance Optimizations

### Database Indexing Strategy

**Indexes**:
```sql
-- User lookups
CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_email_verified ON users(email_verified) WHERE email_verified = true;

-- Player search (most common filters)
CREATE INDEX idx_players_team_position ON players(team, position);
CREATE INDEX idx_players_name_fts ON players USING gin(to_tsvector('english', name));

-- Lineup queries
CREATE INDEX idx_lineups_user_id ON lineups(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_lineup_slots_lineup_id ON lineup_slots(lineup_id);

-- Scoring configs
CREATE INDEX idx_scoring_configs_user_active ON scoring_configs(user_id, is_active);

-- Audit logs
CREATE INDEX idx_audit_logs_user_timestamp ON audit_logs(user_id, created_at DESC);
```

### Caching Strategy

**Redis Cache Layers**:
1. **Player search results**: Key `players:filter:{hash}`, TTL 5 minutes
2. **Player scores**: Key `scores:config:{configId}:player:{playerId}`, TTL 1 hour
3. **User session**: Key `session:{userId}`, TTL matching JWT expiry
4. **API rate limits**: Key `ratelimit:{ip}:{userId}`, TTL 15 minutes

**Cache Invalidation**:
- **Hourly MLB sync**: Invalidate `players:*` and `scores:*` keys
- **Config update**: Invalidate `scores:config:{configId}:*` keys
- **Player update**: Invalidate specific `scores:*:player:{playerId}` keys

### Frontend Performance

**Code Splitting**:
- Route-based splitting: Lazy load pages with `React.lazy()`
- Component-level splitting: Heavy components (PlayerTable, LineupEditor) lazy loaded

**Asset Optimization**:
- **Images**: WebP format, responsive sizes, lazy loading
- **Fonts**: Preload critical fonts, subset Latin characters only
- **Bundle size**: Target <200KB initial JS bundle (gzip)

**Rendering**:
- **Virtualization**: `react-window` for player tables (1000+ rows)
- **Debouncing**: Search input debounced 300ms
- **Optimistic updates**: Lineup changes reflected instantly, rolled back on error

## Deployment Architecture

**Environment Structure**:
- **Development**: Local Docker Compose (Postgres, Redis, backend, frontend)
- **Staging**: AWS ECS Fargate (mirrors production)
- **Production**: AWS ECS Fargate + RDS PostgreSQL + ElastiCache Redis

**Scaling Strategy**:
- **Backend**: Horizontal auto-scaling (CPU >70%, min 2, max 10 tasks)
- **Database**: Vertical scaling (db.t3.medium → db.r5.large), read replicas (2)
- **CDN**: CloudFront for frontend assets (reduces p95 latency)

**Backup & Recovery**:
- **Database**: Automated daily snapshots (7-day retention), point-in-time recovery
- **Disaster recovery**: RTO 1 hour, RPO 5 minutes

## Testing Strategy

**Backend Testing**:
- **Unit tests**: Services, utilities (80% coverage target)
- **Integration tests**: API endpoints with in-memory database
- **Contract tests**: OpenAPI spec validation against implementation
- **E2E tests**: Critical paths (registration, login, lineup creation)

**Frontend Testing**:
- **Component tests**: React Testing Library (accessibility checks)
- **Integration tests**: User flows with mocked API
- **Visual regression**: Percy for UI consistency
- **Performance tests**: Lighthouse CI (enforce scores)

**Load Testing**:
- **Tool**: k6 for API load testing
- **Scenario**: 1000 concurrent users, player search + lineup operations
- **Target**: p95 <200ms, 0% error rate

## Migration Path (Future Considerations)

### Phase 2: Additional Sports

**Architecture changes required**:
- Abstract position validation: `IPositionValidator` interface
- Separate stat category definitions per sport in ScoringConfig
- Sport-specific providers: `BaseballStatsProvider`, `FootballStatsProvider`

### Phase 3: Real-Time Scoring

**Architecture changes required**:
- WebSocket connection for live score updates
- Redis Pub/Sub for score change notifications
- Optimized diff calculation (only changed players)

### Phase 4: ESPN API Migration

**Required changes**:
- Implement `EspnApiProvider` with `IPlayerDataProvider` interface
- Update sync job to use ESPN endpoints
- Add API key management and rate limit handling
- **No changes to service layer or frontend**

## Risks & Mitigation

### Risk: MLB-StatsAPI Rate Limiting

**Likelihood**: Medium | **Impact**: High
**Mitigation**:
- Cache aggressively (5-minute player data)
- Batch sync operations (max 100 players/request)
- Fallback to database for stale data tolerance

### Risk: Scoring Calculation Performance at Scale

**Likelihood**: Medium | **Impact**: Medium
**Mitigation**:
- Materialized views for top 10 scoring configs
- Pre-calculate scores during hourly sync
- Pagination limits (max 100 results per page)

### Risk: User-Generated Content (Future Social Features)

**Likelihood**: Low (out of scope) | **Impact**: High (if added)
**Mitigation**:
- Input sanitization architecture already in place
- Content moderation strategy TBD before feature
- Rate limiting prevents spam

## Compliance & Regulations

### GDPR Compliance

**Data Subject Rights**:
- **Right to access**: GET /users/me/data (export all user data as JSON)
- **Right to erasure**: DELETE /users/me (hard delete after 30-day grace period)
- **Right to portability**: Export includes all lineups, configs, audit logs
- **Consent**: Explicit checkbox during registration, audit logged

### Accessibility Standards

**WCAG 2.1 Level AA Requirements**:
- Color contrast ratio ≥4.5:1 for normal text
- All interactive elements keyboard accessible (tab order logical)
- Form labels and ARIA attributes on all inputs
- Screen reader testing with NVDA and VoiceOver
- Skip navigation links for keyboard users
- Focus indicators visible on all focusable elements

## Summary

All technical decisions align with the project constitution's five core principles:
1. **UX/UI**: Mobile-first CSS, WCAG compliance, consistent design system
2. **Functional**: User-centric auth with MFA, granular account control
3. **Technical**: API-first, performant (<200ms p95), scalable (horizontal scaling)
4. **Security**: Encryption, input validation, audit logging, regular security reviews
5. **Operational**: 99.5% uptime, full observability (logs/metrics/traces)

The NestJS + React + PostgreSQL stack provides a solid foundation for the MVP while maintaining flexibility for future enhancements (additional sports, real-time scoring, ESPN API migration).
