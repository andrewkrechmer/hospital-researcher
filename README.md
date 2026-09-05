# Hospitals Prospecting Database

A read-only browser for a Postgres-backed hospital prospecting database. Data is maintained outside this application; refresh the app to see the latest records.

> **Sample-data notice:** Records bundled in the test fixtures are synthetic. No real or proprietary hospital-directory records are included in the repository. Database contents, local spreadsheets and connection secrets remain outside version control.

## Run locally

Requires Node.js 22+, pnpm, and the existing `hospitals` database running in Postgres.app.

```sh
pnpm install --frozen-lockfile
cp .env.example .env
pnpm dev --hostname 127.0.0.1
```

Open http://127.0.0.1:3000. The example environment uses the local Postgres socket at `/tmp` and database `hospitals`. `PGUSER` defaults to the operating-system username; set it explicitly if your database user differs. No Docker is required.

For a remote database, supply a Postgres `DATABASE_URL` through the host's secret settings. Prefer a dedicated role with only SELECT access to the two source tables. Keep the database connection server-side and preserve the database provider's TLS verification settings. This local setup is not a public deployment.

Do not run schema push, migration, or seed commands. The app does not create tables or change the database. The original SQLite data file, if present in `prisma/dev.db`, is retained locally but is no longer used.

## What works

- Hospital and health-system table views, sorting, search, geography and system-size filters.
- Hospital detail drawers with source identifiers, location, beds, telephone, revenue, discharges, patient days and notes.
- Health-system detail drawers and totals calculated from assigned hospitals.
- Separate single-site and unassigned groups. Neither label asserts independent ownership.
- A Refresh data button for changes made through the existing Postgres workflow.

Fields not present in Postgres, including confidence, claims, facility type and last-updated timestamps, are not shown as interactive features. Size tiers are computed for display only and are never written back.

## Read-only boundary

Only these API routes exist, with GET handlers:

- `/api/hospitals`
- `/api/hospitals/:id`
- `/api/health-systems`
- `/api/health-systems/:domain`

There is no Excel upload, parsing, preview, import execution, hospital creation, editing, deletion or claims endpoint. API middleware rejects POST, PUT, PATCH and DELETE with HTTP 405, including requests to the former import paths. Removed GET routes return 404.

All database queries use a dedicated client for an explicit `BEGIN READ ONLY` transaction. Server-defined SQL uses parameters for IDs; the app exposes no SQL execution endpoint. This application-level protection complements a SELECT-only database role for hosting; it does not change the privileges of the existing local database account.

The app reads only `public.hospitals` and `public.health_systems`. It does not touch `imports`, the import registry, or the separate hospital-researcher database.

## Mapping

`src/lib/db/hospitals.ts` maps existing Postgres columns into the original interface's record shape. Hospital bigint IDs are read as text and remain strings throughout the API. CMS identifiers and ZIP codes stay text. The existing health-system domain is used as the system ID. Raw source fields are preserved, and no claims, confidence scores or update dates are fabricated. A few unused legacy record fields remain empty to avoid rewriting the table and filter infrastructure.

The connection code is in `src/lib/db/client.ts`; derived system metrics are in `src/lib/db/health-systems.ts` and `src/lib/utils/metrics.ts`. The database-access layer uses the `pg` driver and does not require Prisma generation or migrations.

## Verification

```sh
pnpm test
pnpm exec tsc --noEmit --incremental false
pnpm lint
pnpm build
pnpm start --hostname 127.0.0.1
```

Tests use fixtures and mocked connections; they do not write to the real hospital database. Coverage includes preserved identifiers, system totals, single-site/unassigned grouping, read-only transactions, rejected HTTP writes, absence of import paths, and retained table/filter/drawer behavior.

## Next: hosting

Local integration comes before deployment. Before hosting, configure subpath routing, hosted Postgres, and an appropriate access policy. The current local app runs at `/`; its raw API URLs will need a matching prefix if deployed under a subpath. Do not expose a local Postgres port as a hosting solution.
