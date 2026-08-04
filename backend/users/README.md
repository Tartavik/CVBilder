# Backend domains

This Nx library contains the application domains used by the NestJS API.

## Structure

- `auth` — registration, login, JWT guards and role authorization
- `users` — the current user's account, profile and settings
- `cvs` — private CV commands, public CV queries, validation and photos
- `skills` — the current user's reusable skills and icon generation
- `infrastructure` — external adapters such as AI icon generation
- `database` — the shared TypeORM entity registry

Each domain owns its controllers, DTOs, entities and services. The API imports
`BackendModule`; migrations and runtime configuration both use
`DATABASE_ENTITIES` so entity registration has a single source of truth.

Private user resources are exposed below `/api/users/me`. The authenticated
user ID comes from the verified JWT and is never accepted from a route
parameter. `/api/users` is reserved for administrators.
