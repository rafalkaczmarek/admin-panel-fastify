# admin-panel-fastify

Backend REST API for [admin-panel-web](../admin-panel-web). Provides the `/api/auth/*` endpoints (JWT access token + httpOnly refresh cookie) that the Angular client expects from its `AuthRepository`.

## Tech stack

- Node.js + Fastify 5
- PostgreSQL via Prisma ORM
- `bcrypt` for password hashing, `jsonwebtoken` for access tokens
- `@fastify/cors`, `@fastify/cookie` for cross-origin cookie-based sessions

## Prerequisites

- Node.js 22 LTS or newer
- A reachable PostgreSQL instance (local install, Docker, or hosted)

The quickest local DB:

```bash
docker run --name admin-panel-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=admin_panel -p 5432:5432 -d postgres:16
```

## Setup

1. Copy the env template and fill in the values you need:

   ```bash
   cp .env.example .env
   ```

   At minimum set `DATABASE_URL` and replace `JWT_ACCESS_SECRET` with a long random string.

2. Install dependencies and generate the Prisma client:

   ```bash
   npm install
   npm run prisma:generate
   ```

3. Apply migrations and seed the demo user:

   ```bash
   npm run prisma:migrate
   npm run prisma:seed
   ```

   The seed creates `admin@dashstack.com` / `admin123` with role `admin`, matching the demo credentials baked into the Angular client.

4. Start the server:

   ```bash
   npm run dev
   ```

   The API listens on `http://localhost:3000` by default.

## Running with Docker

The repo ships a multi-stage `Dockerfile` and a `docker-compose.yml` that wires
the API together with a Postgres 16 instance.

1. Copy `.env.example` to `.env` and override anything you want (at minimum
   `JWT_ACCESS_SECRET` and, in production, `CORS_ORIGIN`). The compose file
   reads the same file automatically.
2. Build and start the whole stack:

   ```bash
   docker compose up --build -d
   ```

   On the first boot the `app` container will:
   - apply `prisma migrate deploy` if a `prisma/migrations` directory exists,
     otherwise fall back to `prisma db push` so the schema is created;
   - run `prisma/seed.js` when `RUN_SEED=true` (default in compose) to create
     the demo `admin@dashstack.com` / `admin123` user.

3. The API listens on `http://localhost:${PORT:-3000}` and Postgres on
   `localhost:${POSTGRES_PORT:-5432}` (data persisted in the
   `admin-panel-db-data` volume).

4. Tail logs or stop the stack:

   ```bash
   docker compose logs -f app
   docker compose down            # keep the volume
   docker compose down -v         # nuke the database too
   ```

To run only the database in a container (e.g. while developing the API with
`npm run dev` on the host), use:

```bash
docker compose up -d db
```

## API contract

All endpoints live under `/api/auth`. JSON errors are returned as `{ "code": string, "message": string }`.

| Method | Path | Body | Success | Errors |
|--------|------|------|---------|--------|
| POST | `/api/auth/login` | `{ email, password, rememberMe? }` | `200` `{ accessToken, expiresAt, user }` + `Set-Cookie: refreshToken=...` | `400 BAD_REQUEST`, `401 INVALID_CREDENTIALS` |
| POST | `/api/auth/refresh` | none (cookie required) | `200` (same shape as login, refresh token is rotated) | `401 INVALID_SESSION` |
| POST | `/api/auth/logout` | none | `204` (refresh token revoked, cookie cleared) | `401` ignored client-side |

The refresh cookie is `HttpOnly`, `SameSite=Lax`, scoped to `/api/auth`, and marked `Secure` automatically when `NODE_ENV=production`.

## Integration with admin-panel-web

1. Make sure PostgreSQL is running and `npm run prisma:migrate && npm run prisma:seed` have been executed.
2. Start this API on port 3000 (`npm run dev`).
3. In [admin-panel-web/src/environments/environment.ts](../admin-panel-web/src/environments/environment.ts), set `useMockAuth: false` (the `apiBaseUrl` is already `http://localhost:3000/api`).
4. From `admin-panel-web`, run `npm start`. Sign in with `admin@dashstack.com` / `admin123`.

## Testing

```bash
npm test
```

The suite uses Node's built-in test runner and `fastify.inject()`. Prisma is swapped for an in-memory mock through `src/lib/prisma.ts`'s `__setForTests` hook, so the tests run without a live database.

## Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `3000` | HTTP port |
| `NODE_ENV` | `development` | Toggles secure cookies and verbose errors |
| `DATABASE_URL` | (required) | Prisma PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | (required) | HMAC secret for access tokens |
| `JWT_ACCESS_TTL` | `15m` | Access token lifetime |
| `REFRESH_TTL_DAYS` | `7` | Refresh token lifetime |
| `REFRESH_TTL_REMEMBER_DAYS` | `30` | Refresh lifetime when `rememberMe: true` |
| `CORS_ORIGIN` | `http://localhost:4200` | Allowed front-end origin (must echo back exactly for cookies to work) |
