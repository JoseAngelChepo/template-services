# template-services

NestJS backend template paired with [**template-platform**](../template-platform). Exposes **`/api/v1`** with authentication, sessions, and user management.

**Reusable starter for humans and AI agents** — replace secrets, `FRONTEND_URL`, and email branding before production. Do not ship placeholder JWT secrets or a production MongoDB URI from `.env.example` as-is.

## Modules

| Module | Purpose |
|--------|---------|
| `auth` | Register, login, refresh, logout, Google OAuth, password reset, `GET /auth/me`, user API tokens |
| `users` | `GET /users/me`, admin user list/get/patch |
| `sessions` | Refresh-token session store (used by `auth`) |
| `emails` | Transactional email via Resend (password reset) |
| `user-api-tokens` | Per-user PATs for automation (`JwtOrUserPatGuard`) |
| `common` | `RolesGuard`, shared decorators/pipes |

## Quick start

```bash
cp .env.example .env
# Edit .env — set JWT secrets and MONGODB_URI (never commit .env)
npm install
npm run dev
```

Default port: **3001** (`PORT`). The web app expects `http://localhost:3001/api/v1` in dev.

## Environment

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Access and refresh token signing |
| `JWT_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | Token lifetimes (see `.env.example`) |
| `FRONTEND_URL` | Web app origin (Google OAuth redirect, password-reset links) |
| `CORS_ORIGIN` | Comma-separated allowed origins (default `http://localhost:3000`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_CALLBACK_URL` | Google OAuth (optional) |
| `RESEND_*` / `EMAIL_FROM` | Password-reset email via Resend (optional) |
| `AGENT_KEY_PREFIX` | Prefix for user API tokens (optional, e.g. `app_`) |
| `PORT` | HTTP port (default `3001`) |

See [`.env.example`](./.env.example). **Never commit** `.env` or `.env.local`.

## Security

This repo is a **public template**. It ships **no secrets** in source — only placeholders in [`.env.example`](./.env.example).

### If you clone or fork

1. Copy env: `cp .env.example .env` and generate **new** `JWT_SECRET` / `JWT_REFRESH_SECRET` (do not reuse values from another project).
2. Use a **dedicated** MongoDB database for your app (not a shared production cluster).
3. Keep **`.env`**, **`.env.local`**, and any `*.pem` keys **out of git**. They are listed in [`.gitignore`](./.gitignore).

### Before you push or go to production

| Check | Action |
|-------|--------|
| Accidental `.env` commit | Run `git status` — `.env` must not appear. If it was ever committed, **rotate all secrets** and purge history (e.g. `git filter-repo`) or create a fresh repo. |
| Secret scan on history | `gitleaks detect --source .` or [TruffleHog](https://github.com/trufflesecurity/trufflehog) |
| Placeholder JWTs | Replace `change-me-*` in `.env` with long random strings |
| OAuth / email | Set your own `GOOGLE_*` and `RESEND_*`; restrict callback URLs in Google Cloud |

### Reporting vulnerabilities

If you find a security issue in this template, open a private advisory on GitHub or contact the maintainer — do not post live credentials in public issues.

## Scripts

```bash
npm run dev              # watch mode (alias: start:dev)
npm run start:dev:clean  # rm dist, then watch
npm run build            # nest build
npm run start:prod       # node dist/main
npm run typecheck        # tsc --noEmit
```

## Docs

| Topic | File |
|-------|------|
| API routes index | [`docs/README.md`](./docs/README.md) |
| New modules & user ownership | [`docs/MODULES.md`](./docs/MODULES.md) |
| Auth guards (required, optional, PAT) | [`docs/GUARDS.md`](./docs/GUARDS.md) |
| Role guard (`@Roles`, admin vs user) | [`docs/role-guard-implementation.md`](./docs/role-guard-implementation.md) |
| Frontend (sibling repo) | [`../template-platform`](../template-platform) |

---

## For AI agents

Read this section when implementing or extending the API. **Canonical Cursor context:** [`.cursor/rules/template-context.mdc`](./.cursor/rules/template-context.mdc).

### What this template is

- **Backend only** — DTOs, validation, guards, and HTTP status codes are defined here. The sibling **template-platform** consumes this API; read it for UI routes and cookie-based session handling, not as the source of API truth.
- **Starter scope:** auth, users, sessions, optional Google OAuth, optional Resend email, user PATs. Do **not** reintroduce old product domains (arena, challenges, runs, editions, HF chat, etc.) unless the user explicitly asks.
- **Global prefix:** `/api/v1` on all controllers.

### Repository layout

```
src/
  auth/              # AuthController, strategies (JWT, Google), register/login/refresh
  users/             # UsersController, User schema, username rules, admin CRUD
  sessions/          # Refresh-token persistence
  emails/            # Resend integration
  user-api-tokens/   # PAT create/list/revoke, JwtOrUserPatGuard
  common/            # RolesGuard, decorators
  app.module.ts      # MongoDB + module wiring
docs/                # Route index, MODULES, GUARDS, role guard
```

### Auth patterns (use the right guard)

| Need | Use |
|------|-----|
| Logged-in user required | `JwtAuthGuard` |
| Public route, optional session | `OptionalJwtAuthGuard` + `@OptionalUser()` |
| JWT or user PAT (automation) | `JwtOrUserPatGuard` |
| Admin-only (after JWT) | `RolesGuard` + `@Roles('admin')` |

Details: [`docs/GUARDS.md`](./docs/GUARDS.md), [`docs/role-guard-implementation.md`](./docs/role-guard-implementation.md).

### Platform contract (template-platform)

- Base URL: `NEXT_PUBLIC_API_URL` → typically `http://localhost:3001/api/v1`.
- Register/login responses: `access_token`, `refresh_token`, `user`.
- Logout: `POST /auth/logout` with `{ refresh_token }`.
- Google OAuth: callback redirects to `{FRONTEND_URL}/auth/google/callback?token=…&refresh=…&role=…`.
- Profile: `GET /users/me` or `GET /auth/me` (normalize on the client with `normalizeAuthMeUser`).
- Username: `GET /auth/username/availability?username=` — lowercase `a-z`, digits, underscore; 3–30 chars.
- Roles: `user` | `admin` (`UserRole` in `users/schemas/user.schema.ts`).

Optional: if the platform sets `NEXT_PUBLIC_API_BASIC_AUTH`, that is a **client-side** header for unauthenticated calls only; this API uses **JWT/PAT**, not HTTP Basic for app auth.

### Agent workflow (typical tasks)

1. **New authenticated endpoint** — add DTO + validation, controller method, service; apply `JwtAuthGuard` (or optional/PAT guards). Document in `docs/README.md`.
2. **New public endpoint** — mark public in guard setup; prefer `OptionalJwtAuthGuard` if logged-in callers get extra data.
3. **Admin feature** — `@Roles('admin')` after `JwtAuthGuard`; confirm platform does not rely on UI-only checks.
4. **New module** — follow [`docs/MODULES.md`](./docs/MODULES.md) (scaffold, `userId`, `AppModule`, guards).
5. **Env / secrets** — add to `.env.example` with placeholder values only; never hardcode secrets in source.

### Hard rules

- **Minimize scope** — match Nest patterns already in `auth` and `users`.
- **Do not commit:** `.env`, `node_modules/`, `dist/`, `*.tsbuildinfo`.
- **Security:** rotate any secrets that ever lived in a committed `.env`; use strong `JWT_*` values in production; enforce authorization in guards/services, not only in the frontend.
- **Breaking API changes** — update `docs/README.md` and coordinate with **template-platform** (`createServices`, `ServicesProvider`).

### Before launch (remind the user)

| Area | What to change |
|------|----------------|
| Secrets | `JWT_SECRET`, `JWT_REFRESH_SECRET`, MongoDB credentials |
| URLs | `FRONTEND_URL`, `CORS_ORIGIN`, `GOOGLE_CALLBACK_URL` |
| Email | Resend keys, `EMAIL_FROM` / `RESEND_FROM_*` branding |
| Database | Dedicated cluster/DB name (not a dev product database) |

### When unsure

1. Read **`docs/README.md`** for route list and DTO shapes.
2. Read **`docs/MODULES.md`** when adding a feature module or `userId` ownership.
3. Read **`docs/GUARDS.md`** before choosing a guard.
4. Read **template-platform** `ServicesProvider` and `src/data/api/server/index.ts` for what the client already calls.
