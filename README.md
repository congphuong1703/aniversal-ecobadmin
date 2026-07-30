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

The repository contains 20 development-only names and placeholder portraits. Replace them before deployment.

1. Replace the sample names in `src/data/guests.ts` without changing the stable IDs `guest-01` through `guest-20`.
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
```

Full names stay server-only. `GET /api/guests` and the public page expose only stable IDs, masked names, and portrait presentation data.

## Create the Supabase table

Open the Supabase SQL editor and run:

```text
supabase/migrations/202607290001_create_rsvp_submissions.sql
```

The migration is idempotent: it uses `create extension if not exists`, `create table if not exists`, and `create index if not exists`. It enables row-level security and intentionally creates no public policies. The app reads and writes through the server-only service-role client.

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

Use independent, high-entropy values for the two signing secrets. Do not commit `.env.local` or real credentials.

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

Playwright starts its own isolated server on port `3108`, uses only the in-memory repository, and covers Chromium at `1440x1000` plus a Chromium mobile viewport at `390x844`. It checks horizontal overflow, `4:5` guest cards, keyboard/focus behavior, reduced motion, RSVP retry deduplication, intentional history, the approved Maps link, and the admin flow.

The production build finishes by scanning every JavaScript file in `.next/static` for all 20 configured full guest names. The build fails if any full name enters a client bundle.

These assertions validate responsive behavior but are not screenshot-diff tests; font rasterization and subtle platform-specific spacing still require a final visual review in the target browser.

If the project-managed Chromium is not installed yet, install it with the official Playwright command:

```bash
npx playwright install chromium
```

## Deploy to Vercel

1. Replace `public/guests/guest-01.svg` through `public/guests/guest-20.svg` with the real `4:5` images in place.
2. Replace the 20 sample names in `src/data/guests.ts` without changing stable IDs.
3. Run the SQL migration in Supabase.
4. Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, and `RSVP_VERIFICATION_SECRET` in Vercel for Production.
5. Run `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`, and `npm run build`.
6. Deploy the `main` branch to Vercel.

No external deployment or real credentials are required to run the automated test suite.
