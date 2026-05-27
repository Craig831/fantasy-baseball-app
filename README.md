# Fantasy Baseball App

A full-stack TypeScript application for researching MLB players and building fantasy baseball lineups with custom scoring configurations.

## Tech Stack

### Backend
- **NestJS 10+** - TypeScript-first Node.js framework
- **Prisma ORM** - Type-safe database access
- **PostgreSQL 15+** - Primary database
- **JWT Authentication** - Access & refresh tokens
- **Swagger/OpenAPI** - API documentation

### Frontend
- **React 18+** - UI framework
- **TypeScript** - Type safety
- **TailwindCSS** - Utility-first CSS
- **React Router** - Client-side routing
- **Axios** - HTTP client with JWT interceptors

## Project Structure

```
fantasy-baseball-app/
├── backend/                 # NestJS backend application
│   ├── src/
│   │   ├── config/         # Configuration files
│   │   ├── common/         # Shared decorators, guards, filters
│   │   ├── modules/        # Feature modules
│   │   │   └── auth/       # Authentication module
│   │   ├── prisma/         # Prisma service
│   │   └── main.ts         # Application entry point
│   ├── prisma/
│   │   └── schema.prisma   # Database schema
│   └── .env                # Environment variables
│
├── frontend/                # React frontend application
│   ├── src/
│   │   ├── pages/          # Page components
│   │   ├── components/     # Reusable components
│   │   ├── services/       # API services
│   │   └── App.tsx         # Main app component
│   └── .env                # Environment variables
│
├── specs/                   # Feature specifications
├── docker-compose.yml       # Docker services configuration
└── README.md               # This file
```

## Getting Started

### Prerequisites

- Node.js 20+ LTS
- Docker & Docker Compose (for database)
- npm or yarn

### 1. Clone the Repository

```bash
git clone <repository-url>
cd fantasy-baseball-app
```

### 2. Start the Database

```bash
docker compose up -d postgres
```

This will start a PostgreSQL database on port 5432.

### 3. Setup Backend

```bash
cd backend

# Install dependencies
npm install

IMPORTANT: Ensure .env file is in backend directory and includes DATABASE_URL

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# Start the backend server
npm run start:dev
```

The backend will be available at:
- API: http://localhost:3000/api
- Swagger docs: http://localhost:3000/api/docs

### 4. Setup Frontend

In a new terminal:

```bash
cd frontend

# Install dependencies
npm install

# Start the frontend development server
npm start
```

The frontend will be available at http://localhost:3001

## Features Implemented

### ✅ Phase 1: Setup & Infrastructure
- NestJS backend project initialized
- React frontend project initialized with TypeScript
- Tailwind CSS configured
- Docker Compose setup for PostgreSQL & Redis
- Environment configuration
- Vitest configured for frontend testing
- Jest configured for backend testing

### ✅ Phase 2: Database Foundation
- Complete Prisma schema with 8 models:
  - User (authentication & profile)
  - ScoringConfiguration (custom scoring rules)
  - Player (MLB athletes)
  - PlayerStatistic (game & season stats)
  - Lineup (flexible research lineups)
  - LineupSlot (max 25 players, no position constraints)
  - AuditLog (security events)
  - RefreshToken (JWT rotation)

### ✅ Phase 3: User Story 1 - User Account Management (Complete)

**Backend:**
- User registration with email/password
- Login with JWT access & refresh tokens
- Token refresh mechanism with rotation
- Password hashing with bcrypt (cost 12)
- Email verification flow with tokens
- Password reset flow with secure tokens
- Multi-factor authentication (MFA) with TOTP/QR codes
- User profile management (view, update, delete)
- Account deletion (soft delete with cascade)
- Audit logging for all security events
- Protected routes with JWT guards
- Comprehensive unit tests (24 tests passing)

**Frontend:**
- Registration page
- Login page with "forgot password" link
- Protected home/dashboard page
- Account settings page with:
  - Profile information display
  - Email update
  - Password change
  - MFA setup with QR code display
  - MFA enable/disable
  - Account deletion
- Email verification page
- Password reset request page
- Password reset confirmation page
- Axios interceptors for automatic token refresh
- React Router v7 for navigation
- Comprehensive unit tests (16 tests passing with Vitest)

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login with credentials (supports MFA)
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user (protected)
- `POST /api/auth/verify-email` - Verify email with token
- `POST /api/auth/resend-verification` - Resend verification email
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `POST /api/auth/mfa/setup` - Setup MFA (returns QR code)
- `POST /api/auth/mfa/verify` - Verify MFA code and enable
- `POST /api/auth/mfa/disable` - Disable MFA

### Users
- `GET /api/users/me` - Get current user profile (protected)
- `PATCH /api/users/me` - Update user profile (protected)
- `DELETE /api/users/me` - Delete user account (protected)

Full API documentation available at http://localhost:3000/api/docs

## Environment Variables

### Backend (.env)
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fantasy_baseball"
JWT_SECRET="your-secret-key-change-in-production"
JWT_ACCESS_EXPIRY="15m"
JWT_REFRESH_EXPIRY="7d"
PORT=3000
NODE_ENV=development
CORS_ORIGINS="http://localhost:3001"
```

### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:3000/api
```

## Database Management

### Run Migrations
```bash
cd backend
npx prisma migrate dev
```

### Reset Database
```bash
cd backend
npx prisma migrate reset
```

### Open Prisma Studio (Database GUI)
```bash
cd backend
npx prisma studio
```

## Development Commands

### Backend
```bash
npm run start         # Start production server
npm run start:dev     # Start development server (watch mode)
npm run build         # Build for production
npm run test          # Run unit tests with Jest
npm run test:watch    # Run tests in watch mode
npm run test:cov      # Run tests with coverage report
npm run lint          # Run ESLint
```

### Frontend
```bash
npm start             # Start development server
npm run build         # Build for production
npm test              # Run unit tests with Vitest
npm run test:ui       # Run tests with interactive UI
npm run test:coverage # Run tests with coverage report
npm run lint          # Run ESLint
```

## Running Tests

### Backend Tests (Jest)
The backend uses Jest for unit testing. All tests are located in `*.spec.ts` files.

```bash
cd backend

# Run all tests
npm test

# Run specific test file
npm test -- auth.service.spec

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:cov
```

**Current test coverage:**
- ✅ 24 tests passing
- `auth.service.spec.ts` - Authentication service tests (register, login, MFA, email verification, password reset)
- `users.service.spec.ts` - User profile management tests (get/update/delete)

### Frontend Tests (Vitest)
The frontend uses Vitest for unit testing. All tests are located in `*.test.tsx` files.

```bash
cd frontend

# Run all tests once
npm test -- --run

# Run tests in watch mode (default)
npm test

# Run tests with interactive UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

**Current test coverage:**
- ✅ 16 tests passing
- `App.test.tsx` - Main app component tests
- `LoginPage.test.tsx` - Login page functionality tests
- `RegisterPage.test.tsx` - Registration page functionality tests

### Running All Tests
From the project root, you can run tests for both frontend and backend:

```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test -- --run
```

## Next Steps

The following features are planned for future implementation:

### User Story 2: Scoring Configurations
- Create and manage custom scoring settings
- Define baseball-specific statistical categories
- Set point values for batting and pitching stats
- Activate/deactivate scoring configurations

### User Story 3: Player Research
- Search MLB players with filters (team, position, name)
- Sort by calculated scores using active scoring config
- View detailed player statistics
- Player data sync via mlb-stats-api

### User Story 4: Lineup Management
- Build flexible lineups (up to 25 players, no position constraints)
- Calculate projected scores based on selected scoring config
- Calculate actual scores post-game
- Save and manage multiple lineups

### User Story 5: Mobile Optimization
- Touch-friendly UI for mobile devices
- Responsive layouts for all screen sizes
- Progressive web app features

## Project Specifications

Detailed specifications available in `specs/001-player-research-scoring/`:
- `spec.md` - Feature requirements and user stories
- `plan.md` - Technical architecture and decisions
- `data-model.md` - Database schema documentation
- `contracts/` - OpenAPI specifications for all endpoints
- `tasks.md` - Implementation task breakdown

## License

Private project - All rights reserved

## Support

For issues or questions, please create an issue in the GitHub repository.
