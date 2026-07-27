# CVBilder

[![CI](https://github.com/Tartavik/CVBilder/actions/workflows/ci.yml/badge.svg?branch=staging)](https://github.com/Tartavik/CVBilder/actions/workflows/ci.yml)

Full-stack CV builder workspace:

- Frontend: Angular, Angular Material, NgRx and Reactive Forms
- Backend: NestJS, JWT authentication and TypeORM
- Database: PostgreSQL
- Monorepo tooling: Nx

## Project structure

- `web` — Angular application and reusable UI components
- `api` — NestJS entrypoint, database configuration and migrations
- `backend/users` — users, CV storage, discovery and authentication

## Prerequisites

- Node.js 24+
- npm 11+
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

Set `JWT_SECRET` to a long random value outside local development. Existing
plaintext passwords from older builds are converted to bcrypt hashes after the
user's first successful login.

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
Render generates `JWT_SECRET`. During setup, provide `OPENAI_API_KEY` in
Render's secret prompt. The application runs database migrations automatically
before each start.

The free tier is intended for demos: the web service sleeps after inactivity,
the PostgreSQL database expires after 30 days, and uploaded files can disappear
when the service restarts. Database-backed CV data remains available until the
preview database expires.

## Build

```bash
npm run build
```

## Verification

```bash
npm run lint
npm run migration:run
npm run e2e
```

Playwright starts the frontend and API automatically when they are not already
running.

## Continuous integration

GitHub Actions runs linting, production builds, database migrations and
Playwright tests on a clean PostgreSQL 16 instance for every push and pull
request targeting `staging`.

## Notes

- `api` reads DB settings from `.env` using `@nestjs/config`.
- Production deployments can provide `DATABASE_URL` instead of separate DB
  settings.
- TypeORM is configured with `autoLoadEntities: true` and `synchronize: false`.
- The `/api` endpoint is used as the deployment health check.
