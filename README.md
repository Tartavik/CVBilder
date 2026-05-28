# CVBilder

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

## Build

```bash
npm run build
```

## Notes

- `api` reads DB settings from `.env` using `@nestjs/config`.
- TypeORM is configured with `autoLoadEntities: true` and `synchronize: false`.
- This is a starter setup only (no CV builder business modules yet).
