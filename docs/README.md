# template-services — docs

## API prefix

All routes are under **`/api/v1`**.

## Topic guides

| Topic | File |
|-------|------|
| **Optional integrations (Resend, OAuth, …)** | [`INTEGRATIONS.md`](./INTEGRATIONS.md) |
| **New modules & linking to users** | [`MODULES.md`](./MODULES.md) |
| Auth guards (required, optional, PAT) | [`GUARDS.md`](./GUARDS.md) |
| Role guard (`@Roles`, admin vs user) | [`role-guard-implementation.md`](./role-guard-implementation.md) |

## Health (public)

- `GET /health` — app + MongoDB status and optional integration flags (`google-oauth`, `resend`)

## Auth (public)

- `POST /auth/register` — email/password sign-up (`RegisterDto`: username 3–30, `a-z`, `0-9`, `_`)
- `GET /auth/username/availability?username=`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/forgot-password` / `POST /auth/reset-password`
- `GET /auth/google` / `GET /auth/google/callback`

## Auth (authenticated)

- `POST /auth/logout` — body: `{ refresh_token }`
- `POST /auth/logout-all`
- `GET /auth/me`
- `POST|GET|DELETE /auth/api-tokens` — user PAT management

## Users

- `GET /users/me` — same profile shape as `/auth/me` (convenience for the platform client)
- Admin: `GET /users`, `GET /users/:id`, `PATCH /users/:id` (requires `admin` role)

## Clients (workspaces)

Tasks are tenant-scoped by client. A user only sees clients they belong to; admins see all.

- `GET /clients` — workspaces for the current user. If a regular user has none, a personal client is created.
- `POST /clients` — admin: create a client (`name`, optional `slug`)
- `POST /clients/:clientId/members` — admin: `{ userId, role: owner | member }`

## Pipeline / tasks

Statuses are a **predefined global catalog** (not per-client). Clients share the same state machine.

Statuses: `draft` → `validation` → `accepted` → `in_progress` → `done`, plus `rejected` and `cancelled`.

- Client members may: draft → validation, validation → draft, cancel, reopen cancelled/rejected to draft.
- Operators (`admin`) may also: validation → accepted | rejected, accepted → in_progress, in_progress → done | validation.

Routes:

- `GET /pipeline/catalog` — statuses + allowed transitions
- `GET /clients/:clientId/tasks` — list (`?status=` optional). Each task includes `allowedTransitions` for the caller.
- `POST /clients/:clientId/tasks` — create a **draft** (`title`, `brief`)
- `PATCH /clients/:clientId/tasks/:taskId` — edit title/brief while `draft`
- `POST /clients/:clientId/tasks/:taskId/status` — `{ status }` (must be an allowed transition)

## Adding public API routes later

Use **`OptionalJwtAuthGuard`** + **`@OptionalUser()`** when the route is public but should enrich the response for logged-in callers. See [`GUARDS.md`](./GUARDS.md).
