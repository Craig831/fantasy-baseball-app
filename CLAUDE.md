# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository uses the **Specify framework** - a specification-driven development workflow system that guides feature development from specification through implementation using structured phases and commands.

## Core Workflow Commands

The project uses slash commands (in `.claude/commands/`) that implement the Specify workflow:

### Feature Development Workflow

1. **`/speckit.specify <feature-description>`** - Create a new feature specification
   - Generates a concise short-name for the feature (2-4 words)
   - Creates a numbered feature branch (e.g., `1-user-auth`)
   - Auto-detects next available feature number from remote branches, local branches, and specs/ directories
   - Runs `.specify/scripts/bash/create-new-feature.sh --json --number N --short-name "name" "description"`
   - Creates the initial spec.md file

2. **`/speckit.plan`** - Generate implementation plan with design artifacts
   - Runs `.specify/scripts/bash/setup-plan.sh --json` to set up context
   - Creates plan.md with technical context and architecture decisions
   - Generates design artifacts: research.md, data-model.md, contracts/, quickstart.md
   - Updates agent-specific context with `.specify/scripts/bash/update-agent-context.sh claude`
   - **Phase 0**: Research and resolve unknowns (NEEDS CLARIFICATION markers)
   - **Phase 1**: Design data models, API contracts, and quickstart scenarios

3. **`/speckit.tasks`** - Generate actionable task breakdown
   - Runs `.specify/scripts/bash/check-prerequisites.sh --json` to load feature context
   - Requires: plan.md (tech stack, structure), spec.md (user stories with priorities)
   - Optional: data-model.md, contracts/, research.md, quickstart.md
   - Generates tasks.md organized by user story with dependency-ordered execution plan
   - Tasks follow strict checklist format: `- [ ] [TaskID] [P?] [Story?] Description with file path`
   - [P] marker indicates parallelizable tasks
   - [Story] labels (US1, US2, etc.) map tasks to user stories from spec.md

4. **`/speckit.implement`** - Execute the implementation
   - Runs `.specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks`
   - Checks checklist status (if checklists/ exists) and prompts before proceeding if incomplete
   - Loads all design artifacts: tasks.md, plan.md, data-model.md, contracts/, research.md, quickstart.md
   - Verifies/creates ignore files (.gitignore, .dockerignore, etc.) based on tech stack
   - Executes tasks phase-by-phase following dependency order
   - Marks completed tasks as [X] in tasks.md
   - Respects parallel [P] markers and sequential dependencies

5. **`/speckit.clarify`** - Identify underspecified areas
   - Asks up to 5 targeted clarification questions
   - Encodes answers back into spec.md

6. **`/speckit.analyze`** - Cross-artifact consistency check
   - Non-destructive analysis across spec.md, plan.md, and tasks.md
   - Run after task generation to validate quality

7. **`/speckit.checklist`** - Generate custom feature checklists
   - Creates custom checklists based on requirements (UX, security, testing, etc.)

8. **`/speckit.constitution`** - Manage project constitution
   - Create or update project-wide principles and constraints
   - File: `.specify/memory/constitution.md`
   - Defines core principles that govern development approach
   - Template includes sections for principles, constraints, workflow, and governance

## Repository Structure

```
.
├── .claude/commands/          # Slash commands for Specify workflow
│   ├── speckit.specify.md     # Feature specification creation
│   ├── speckit.plan.md        # Implementation planning
│   ├── speckit.tasks.md       # Task generation
│   ├── speckit.implement.md   # Implementation execution
│   ├── speckit.clarify.md     # Specification clarification
│   ├── speckit.analyze.md     # Cross-artifact analysis
│   ├── speckit.checklist.md   # Checklist generation
│   └── speckit.constitution.md # Constitution management
├── .specify/
│   ├── memory/
│   │   └── constitution.md    # Project-wide development principles
│   ├── scripts/bash/          # Workflow automation scripts
│   │   ├── create-new-feature.sh      # Feature branch creation
│   │   ├── setup-plan.sh              # Plan phase setup
│   │   ├── check-prerequisites.sh     # Prerequisite validation
│   │   ├── update-agent-context.sh    # Agent context management
│   │   └── common.sh                  # Shared utilities
│   └── templates/             # Document templates
│       ├── spec-template.md
│       ├── plan-template.md
│       ├── tasks-template.md
│       ├── checklist-template.md
│       └── agent-file-template.md
└── specs/                     # Feature specifications (created per feature)
    └── N-feature-name/        # Numbered feature directories
        ├── spec.md            # Feature specification
        ├── plan.md            # Implementation plan
        ├── tasks.md           # Task breakdown
        ├── research.md        # Research findings
        ├── data-model.md      # Data models
        ├── quickstart.md      # Integration scenarios
        ├── contracts/         # API contracts (OpenAPI/GraphQL)
        └── checklists/        # Feature-specific checklists
```

## Key Workflow Principles

1. **Specification-First Development**: Start with clear specifications before coding
2. **Phased Approach**: Research → Design → Task Planning → Implementation
3. **User Story Organization**: Tasks organized by user story for independent development
4. **Dependency Management**: Clear task ordering with parallel execution opportunities
5. **Document-Driven**: All decisions captured in structured markdown files
6. **Agent Context Updates**: Technology stack tracked in agent-specific files

## Script Usage

All bash scripts in `.specify/scripts/bash/` accept `--json` flag for machine-readable output and support arguments with single quotes using escape syntax: `'I'\''m Groot'` or double quotes: `"I'm Groot"`.

## Task Format Requirements

When working with tasks.md, follow the strict format:
- `- [ ]` markdown checkbox (required)
- `[TaskID]` sequential number (T001, T002, etc.)
- `[P]` marker only if parallelizable
- `[Story]` label only for user story phases ([US1], [US2], etc.)
- Clear description with exact file path

Example: `- [ ] T012 [P] [US1] Create User model in src/models/user.py`

## Constitution

The project constitution (`.specify/memory/constitution.md`) defines core principles that override other practices. The constitution template is currently unpopulated - run `/speckit.constitution` to create project-specific development principles.

## Important Notes

- Feature branches follow pattern: `N-short-name` where N is auto-incremented
- Always use absolute paths when running scripts
- Scripts detect git repository and create appropriate ignore files
- Agent context is updated automatically during planning phase
- Checklists must be complete before implementation (or explicit approval required)

## Active Technologies
- TypeScript 5.7 / Node.js 20 LTS (build & dev tooling only; runtime is the browser) (003-jellybaseballv2-api-migration)
- React 19 + React Router 7 + TanStack Query 5 + Axios 1.12 + `@react-aria/*` + Tailwind 3 + Vite 6 (003-jellybaseballv2-api-migration)
- `openapi-typescript` (dev) for DTO generation; `jwt-decode` (runtime) for claims (003-jellybaseballv2-api-migration)
- Vitest 4 + Testing Library + jsdom + MSW for tests (003-jellybaseballv2-api-migration)
- External JellyBaseballV2 API (ASP.NET Core, http://localhost:5000) — owns auth, users, players, teams, leagues, scoring, lineups, saved searches (003-jellybaseballv2-api-migration)
- TypeScript 5.0+ / Node.js 20 LTS (001-player-research-scoring, 002-player-research) [pre-003]
- ~~PostgreSQL 15+~~ — removed in 003-jellybaseballv2-api-migration
- ~~NestJS 11 / Prisma ORM 6 / Jest backend~~ — removed in 003-jellybaseballv2-api-migration
- ~~MLB-StatsAPI direct integration~~ — now owned by JellyBaseballV2 API
- ~~React 18~~ — upgraded to React 19 in this branch

## Recent Changes
- 003-jellybaseballv2-api-migration: Replaced local NestJS+Prisma+Postgres backend with calls to external JellyBaseballV2 ASP.NET Core API; introduced typed client with single-flight refresh, RFC 7807 error mapping, and JSON-blob boundary helpers
- 002-player-research: Added NestJS 11, Prisma ORM 6, React 18, Jest, MLB-StatsAPI integration
- 001-player-research-scoring: Added TypeScript 5.0+ / Node.js 20 LTS
