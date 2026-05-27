# Docker Setup Guide

This guide explains how to run the Fantasy Baseball App frontend using Docker.

## Architecture

The application is a React SPA served via Nginx. The backend API is provided by the external **JellyBaseballV2** service — see the JellyBaseballV2 repository for API setup instructions.

## Services

1. **Frontend** — React SPA (internal build)
2. **Nginx** — Serves the SPA on port 80

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- JellyBaseballV2 API running (default: `http://localhost:5000`)

## Quick Start

### Development (local, no Docker)

```bash
cd frontend
npm install
npm start
```

The frontend reads `VITE_API_BASE_URL` from `frontend/.env.development.local`.

### Production (Docker)

```bash
VITE_API_BASE_URL=https://your-api-host docker-compose up --build
```

Access the app at http://localhost.

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `VITE_API_BASE_URL` | JellyBaseballV2 API base URL | `http://localhost:5000` |

## Useful Commands

```bash
# Build and start
docker-compose up --build

# Stop
docker-compose down

# View logs
docker-compose logs -f
```
