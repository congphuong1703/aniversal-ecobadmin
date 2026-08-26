# EcoBadminton Anniversary RSVP

Private guest verification, RSVP history, and an authenticated admin dashboard for EcoBadminton's first-anniversary event.

## Requirements

- Node.js `22.22.2`
- npm (included with Node.js)
- A Supabase project for production RSVP storage
- A Vercel project connected to this repository

Install the exact locked dependencies:

```bash
npm ci
```

## Replace the sample guest data

The repository contains 25 development-only names and placeholder portraits. Replace them before deployment.

1. Replace the sample names in `src/data/guests.ts` without changing the stable IDs `guest-01` through `guest-25`. `src/data/e2e-guests.ts` must have one `E2E Guest NN` entry per `GUESTS` entry — the `npm run build` privacy check enforces this parity.
2. Replace each placeholder below in place with the approved real portrait, exported at a `4:5` aspect ratio. Keep the filename and its matching `imagePath` stable.

```text
public/guests/guest-01.svg
public/guests/guest-02.svg
public/guests/guest-03.svg
public/guests/guest-04.svg
public/guests/guest-05.svg
public/guests/guest-06.svg
public/guests/guest-07.svg
public/guests/guest-08.svg
public/guests/guest-09.svg
public/guests/guest-10.svg
public/guests/guest-11.svg
public/guests/guest-12.svg
public/guests/guest-13.svg
public/guests/guest-14.svg
public/guests/guest-15.svg
public/guests/guest-16.svg
public/guests/guest-17.svg
public/guests/guest-18.svg
public/guests/guest-19.svg
public/guests/guest-20.svg
public/guests/guest-21.svg
public/guests/guest-22.svg
public/guests/guest-23.svg
public/guests/guest-24.svg
public/guests/guest-25.svg
```

Full names stay server-only. `GET /api/guests` and the public page expose only stable IDs, masked names, and portrait presentation data.

## Create the Supabase table

Open the Supabase SQL editor and run:

```text
supabase/migrations/202607290001_create_rsvp_submissions.sql
```

The migration is idempotent: it uses `create extension if not exists`, `create table if not exists`, and `create index if not exists`, plus `create or replace function` for the atomic rate-limit RPC. It creates both the guest-history index and the global dashboard keyset index on `(created_at desc, id desc)`.

Row-level security is enabled for RSVP submissions and rate-limit buckets, with no public policies. The rate-limit table stores only HMAC-SHA256 bucket hashes, and its atomic fixed-window RPC revokes execution from `public`, `anon`, and `authenticated`; only the server-side `service_role` may execute it. Re-running the migration safely preserves existing RSVP data and updates the RPC definition.

## Configure the environment

Copy the example file for local development:

```bash
cp .env.example .env.local
```

Set these five server-side variables locally and in Vercel:

| Variable                    | Purpose                                                                   |
| --------------------------- | ------------------------------------------------------------------------- |
| `SUPABASE_URL`              | Supabase project URL                                                      |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only database access; never expose it with a `NEXT_PUBLIC_` prefix |
| `ADMIN_PASSWORD`            | Shared password for the admin dashboard                                   |
| `ADMIN_SESSION_SECRET`      | Secret used to sign the eight-hour admin session cookie                   |
| `RSVP_VERIFICATION_SECRET`  | Separate secret used to sign short-lived guest verification tokens        |

Production startup requires `ADMIN_PASSWORD` to contain at least 12 characters and each signing secret to contain at least 32 characters. Use independent, randomly generated high-entropy values; length is only the enforced minimum. Non-production and Playwright fixtures may remain shorter. Do not commit `.env.local` or real credentials.

## Public API rate limits

The public security boundaries use durable, atomic Supabase buckets in production:

| Boundary                   | Policy                                        |
| -------------------------- | --------------------------------------------- |
| Admin login                | 5 attempts per 10 minutes per client          |
| Guest verification         | 20 attempts per 10 minutes per client         |
| RSVP writes                | 20 attempts per 10 minutes per client         |
| RSVP writes by verified ID | 20 attempts per 10 minutes per verified guest |

Client addresses are taken from trusted Vercel/proxy headers with a fail-safe shared fallback. Client addresses and verified guest IDs are HMAC-hashed before persistence; passwords, names, verification tokens, and raw IP addresses are never stored in rate-limit buckets. Exceeded limits return structured `429` JSON with `Retry-After`. If the limiter cannot be checked, the endpoint fails closed with generic structured `503` JSON.

Playwright uses worker-isolated in-memory buckets and resets them with the existing runtime-guarded E2E reset route, so no live Supabase project is needed and production test routes remain unavailable.

`E2E_REPOSITORY=memory` is reserved for the Playwright dev server. The application ignores it in production, test-only endpoints return `404` outside explicit non-production E2E mode, and this variable must not be configured in Vercel.

## Run locally

```bash
npm run dev
```

Open `http://localhost:3000` for the invitation and `http://localhost:3000/admin` for the protected dashboard.

## Test and build

Run the complete pre-deployment suite with Node.js `22.22.2`:

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Playwright starts its own isolated server on port `3108`, uses only the in-memory repository and rate limiter, and covers Chromium at `1440x1000` plus a Chromium mobile viewport at `390x844`. It checks horizontal overflow, `4:5` guest cards, keyboard/focus behavior, reduced motion, RSVP retry deduplication through re-verification, intentional history, the approved Maps link, and the admin flow.

The production build finishes by scanning every JavaScript file in `.next/static` for all 25 configured full guest names. The build fails if any full name enters a client bundle.

These assertions validate responsive behavior but are not screenshot-diff tests; font rasterization and subtle platform-specific spacing still require a final visual review in the target browser.

If the project-managed Chromium is not installed yet, install it with the official Playwright command:

```bash
npx playwright install chromium
```

## Deploy to Vercel

1. Replace `public/guests/guest-01.svg` through `public/guests/guest-25.svg` with the real `4:5` images in place.
2. Replace the 25 sample names in `src/data/guests.ts` without changing stable IDs.
3. Run the SQL migration in Supabase.
4. Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, and `RSVP_VERIFICATION_SECRET` in Vercel for Production.
5. Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`, and `npm run build`.
6. Deploy the `main` branch to Vercel.

No external deployment or real credentials are required to run the automated test suite.
