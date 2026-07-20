# CVBilder

[![CI](https://github.com/Tartavik/CVBilder/actions/workflows/ci.yml/badge.svg?branch=staging)](https://github.com/Tartavik/CVBilder/actions/workflows/ci.yml)

Starter modular monolith workspace for CV builder:

- Frontend: Angular (`web`), Angular Material, NgRx, Reactive Forms
- Backend: NestJS (`api`), TypeORM
- Database: PostgreSQL
- Monorepo tooling: Nx

## Project structure

- `web` - Angular frontend app
- `api` - NestJS backend app
- `frontend/ui` - shared Angular UI library (`@cvbilder/ui`)
- `backend/core` - shared Nest core module library (`@cvbilder/core`)

## Prerequisites

- Node.js 20+
- npm 10+
- Docker (for local PostgreSQL)

## Environment setup

1. Create local env file from template:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

## Start PostgreSQL

```bash
docker compose up -d
```

## Run apps

Frontend:

```bash
npm run start:web
```

Backend:

```bash
npm run start:api
```

Run both in parallel:

```bash
npm run start:all
```

## Deploy a temporary preview

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Tartavik/CVBilder/tree/staging)

The Render Blueprint creates one public web service and one PostgreSQL database.
During setup, provide `OPENAI_API_KEY` in Render's secret prompt. The application
runs database migrations automatically before each start.

The free tier is intended for demos: the web service sleeps after inactivity,
the PostgreSQL database expires after 30 days, and uploaded files can disappear
when the service restarts. Database-backed CV data remains available until the
preview database expires.

## Build

```bash
npm run build
```

## Continuous integration

GitHub Actions runs linting, production builds, and all database migrations on a
clean PostgreSQL 16 instance for every push and pull request targeting
`staging`. The workflow can also be started manually from the **Actions** tab.

## Notes

- `api` reads DB settings from `.env` using `@nestjs/config`.
- Production deployments can provide `DATABASE_URL` instead of separate DB
  settings.
- TypeORM is configured with `autoLoadEntities: true` and `synchronize: false`.
- This is a starter setup only (no CV builder business modules yet).
