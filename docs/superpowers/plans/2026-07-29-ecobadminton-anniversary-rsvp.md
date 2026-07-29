# EcoBadminton Anniversary RSVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and verify a production-ready EcoBadminton first-anniversary invitation, RSVP flow, and password-protected admin dashboard for Vercel.

**Architecture:** Next.js App Router serves the public landing page, server-only guest data, JSON Route Handlers, and admin pages. Supabase stores append-only RSVP submissions; signed JWTs bind a verified guest to a short-lived RSVP session, while a separate signed cookie protects the admin dashboard.

**Tech Stack:** Node 22.22.2, Next.js 16.2.12, React 19.2.8, TypeScript 6.0.3, Tailwind CSS 4.3.3, Zod 4.4.3, jose 6.2.4, Supabase JS 2.111.0, Vitest 4.1.10, Testing Library, Playwright 1.62.0.

## Global Constraints

- Use Next.js App Router, React, Tailwind CSS, and TypeScript only for application code.
- Use primary color `#012DCC` with the approved Blue x Warm Ivory visual direction.
- Keep all 20 guest names and photo metadata in server-only project data; public payloads expose only masked names.
- Use 4:5 guest images, a responsive radio grid, and no gallery search or pagination.
- Normalize case and whitespace when verifying names, but require Vietnamese diacritics to match.
- Store every intentional RSVP as append-only history; use a unique client submission UUID to deduplicate technical retries.
- Keep RSVP comments optional and limited to 1,000 characters.
- Protect `/admin` with a shared password and an 8-hour signed `httpOnly` session cookie.
- Deploy to Vercel and store RSVP history only in Supabase.
- Follow TDD for domain logic, Route Handlers, and interactive UI behavior.
- Use one TypeScript compiler package only: `typescript@6.0.3`, the newest release compatible with the Next.js ESLint toolchain.
- Require Node.js `>=22.22.2` because the selected latest Supabase, jsdom, and Testing Library packages do not support earlier Node 22 releases.

---

## File Structure

```text
src/
  app/
    api/
      admin/dashboard/route.ts   # Authenticated dashboard JSON
      admin/login/route.ts       # Password login and cookie creation
      admin/logout/route.ts      # Cookie removal
      guests/route.ts            # Public masked guest list
      rsvp/route.ts              # Append-only RSVP submission
      rsvp/verify/route.ts       # Guest-name verification
    admin/page.tsx                # Server-gated admin shell
    globals.css                   # Tailwind import, design tokens, global motion
    layout.tsx                    # Fonts and global metadata
    page.tsx                      # Public landing composition
  components/
    admin/admin-dashboard.tsx     # Summary, responsive guest rows, history
    admin/admin-login.tsx         # Password form
    landing/anniversary.tsx       # One-year visual section
    landing/event-details.tsx     # Time, venue, map, transport, dress code
    landing/hero.tsx              # Invitation hero and RSVP anchor CTA
    landing/rsvp-experience.tsx   # Public guest grid and RSVP state machine
    ui/form-error.tsx             # Accessible inline error
  data/
    event.ts                      # Static event copy and map URL
    guests.ts                     # Server-only full guest records
  lib/
    admin-session.ts              # Signed admin JWT cookie helpers
    env.ts                        # Server environment validation
    guest-name.ts                 # Masking and normalization
    guests-public.ts              # Public guest projection
    rsvp-repository.ts            # Supabase persistence and dashboard query
    rsvp-schema.ts                # Zod request schemas and shared types
    verification-token.ts         # Signed guest verification JWT helpers
    supabase/server.ts            # Server-only Supabase client
  test/
    fixtures.ts                   # Shared deterministic guest/RSVP fixtures
supabase/migrations/
  202607290001_create_rsvp_submissions.sql
tests/e2e/
  admin.spec.ts
  rsvp.spec.ts
```

---

### Task 1: Scaffold the Latest Next.js and Test Foundation

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `postcss.config.mjs`
- Create: `eslint.config.mjs`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `playwright.config.ts`
- Create: `.env.example`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`

**Interfaces:**
- Produces: npm scripts `dev`, `build`, `lint`, `typecheck`, `test`, `test:watch`, and `test:e2e` used by all later tasks.
- Produces: path alias `@/* -> ./src/*` used in every source file.

- [ ] **Step 1: Create the exact dependency manifest**

```json
{
  "name": "ecobadminton-anniversary",
  "version": "1.0.0",
  "private": true,
  "engines": { "node": ">=22.22.2" },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "@supabase/supabase-js": "2.111.0",
    "jose": "6.2.4",
    "next": "16.2.12",
    "react": "19.2.8",
    "react-dom": "19.2.8",
    "zod": "4.4.3"
  },
  "devDependencies": {
    "@playwright/test": "1.62.0",
    "@tailwindcss/postcss": "4.3.3",
    "@testing-library/jest-dom": "7.0.0",
    "@testing-library/react": "16.3.2",
    "@testing-library/user-event": "14.6.1",
    "@types/node": "latest",
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "@vitejs/plugin-react": "6.0.4",
    "eslint": "10.8.0",
    "eslint-config-next": "16.2.12",
    "jsdom": "30.0.1",
    "prettier": "3.9.6",
    "prettier-plugin-tailwindcss": "0.8.1",
    "tailwindcss": "4.3.3",
    "typescript": "6.0.3",
    "vitest": "4.1.10"
  }
}
```

- [ ] **Step 2: Install dependencies and create framework configuration**

Run: `npm install`

Create `postcss.config.mjs`:

```js
export default { plugins: { "@tailwindcss/postcss": {} } };
```

Create `tsconfig.json` with strict mode, `moduleResolution: "bundler"`, `jsx: "react-jsx"` as required by Next.js 16's automatic React runtime, the Next plugin, and the `@/*` alias. Configure Vitest for `jsdom`, `vitest.setup.ts`, React plugin, and an explicit `@` alias resolved with Node's `fileURLToPath`; do not install a TS-paths plugin. Configure Playwright to start `npm run dev` on port 3000.

- [ ] **Step 3: Add the minimal app shell and Tailwind theme**

Use `next/font/google` with `Cormorant_Garamond` for display text and `Manrope` for UI text. In `globals.css`, import Tailwind and define `--color-primary: #012dcc`, warm ivory, navy, lime accent, borders, focus rings, reduced-motion rules, and smooth scrolling.

- [ ] **Step 4: Verify the clean scaffold**

Run: `npm run lint && npm run typecheck && npm run test && npm run build`

Expected: all commands exit 0; Vitest reports no test files without failing; Next produces a production build.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.ts postcss.config.mjs eslint.config.mjs vitest.config.ts vitest.setup.ts playwright.config.ts .env.example src/app
git commit -m "chore: scaffold EcoBadminton Next.js app"
```

---

### Task 2: Implement Server-Only Guest and Event Domain Data

**Files:**
- Create: `src/data/event.ts`
- Create: `src/data/guests.ts`
- Create: `src/lib/guest-name.ts`
- Create: `src/lib/guests-public.ts`
- Create: `src/lib/guest-name.test.ts`
- Create: `src/lib/guests-public.test.ts`
- Create: `src/test/fixtures.ts`
- Create: `public/guests/guest-01.svg` through `public/guests/guest-20.svg`

**Interfaces:**
- Produces: `GuestRecord`, `PublicGuest`, `EVENT`, `normalizeGuestName`, `maskGuestName`, `findGuestById`, and `getPublicGuests`.
- `GuestRecord = { id: string; fullName: string; imagePath: string; imagePosition?: string }`.
- Placeholder SVG portraits are development assets only and retain stable filenames for later replacement by real 4:5 images.

- [ ] **Step 1: Write failing name-behavior tests**

```ts
import { describe, expect, it } from "vitest";
import { maskGuestName, normalizeGuestName } from "./guest-name";

describe("guest names", () => {
  it("normalizes case and whitespace without removing Vietnamese marks", () => {
    expect(normalizeGuestName("  NGUYỄN   Văn An ")).toBe("nguyễn văn an");
    expect(normalizeGuestName("Nguyen Van An")).not.toBe(normalizeGuestName("Nguyễn Văn An"));
  });

  it("keeps the first word and masks the rest", () => {
    expect(maskGuestName("Nguyễn Văn An")).toBe("Nguyễn V** A*");
  });
});
```

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `npm test -- src/lib/guest-name.test.ts`

Expected: FAIL because `guest-name.ts` does not exist.

- [ ] **Step 3: Implement name helpers and server-only guest data**

```ts
export function normalizeGuestName(value: string) {
  return value.normalize("NFC").trim().replace(/\s+/gu, " ").toLocaleLowerCase("vi-VN");
}

export function maskGuestName(value: string) {
  return value.trim().split(/\s+/u).map((part, index) =>
    index === 0 ? part : `${part.at(0) ?? ""}${"*".repeat(Math.max(part.length - 1, 0))}`,
  ).join(" ");
}
```

Add `import "server-only"` at the top of `guests.ts`. Seed exactly 20 stable guest IDs with Vietnamese sample names and matching `/guests/guest-NN.svg` assets. Export public projections from `guests-public.ts` without `fullName`.

- [ ] **Step 4: Add leakage tests and verify domain behavior**

Test that `JSON.stringify(getPublicGuests())` contains `maskedName` but not any fixture `fullName`, and that all image paths are unique. Run `npm test -- src/lib/guest-name.test.ts src/lib/guests-public.test.ts`.

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data src/lib/guest-name* src/lib/guests-public* src/test public/guests
git commit -m "feat: add server-only guest directory"
```

---

### Task 3: Add Environment Validation, Supabase Schema, and Repository

**Files:**
- Create: `src/lib/env.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/rsvp-schema.ts`
- Create: `src/lib/rsvp-repository.ts`
- Create: `src/lib/rsvp-repository.test.ts`
- Create: `supabase/migrations/202607290001_create_rsvp_submissions.sql`
- Modify: `.env.example`

**Interfaces:**
- Produces: `RsvpSubmission`, `AdminGuestRow`, `createSubmission(input)`, and `getAdminDashboard()`.
- `createSubmission` returns the existing row when `client_submission_id` already exists.
- `getAdminDashboard` returns all 20 guests, including guests without submissions.

- [ ] **Step 1: Write failing repository aggregation tests**

Use an injected persistence adapter so unit tests do not need Supabase. Assert that two intentional submissions for one guest remain in history, the latest becomes `currentSubmission`, an absent guest has `currentSubmission: null`, and summary counts total/attending/declined/pending correctly.

- [ ] **Step 2: Run the repository test and verify failure**

Run: `npm test -- src/lib/rsvp-repository.test.ts`

Expected: FAIL because repository exports do not exist.

- [ ] **Step 3: Create the database migration**

```sql
create extension if not exists pgcrypto;

create table if not exists public.rsvp_submissions (
  id uuid primary key default gen_random_uuid(),
  guest_id text not null,
  attending boolean not null,
  message text null check (message is null or char_length(message) <= 1000),
  client_submission_id uuid not null unique,
  created_at timestamptz not null default now()
);

create index if not exists rsvp_submissions_guest_created_idx
  on public.rsvp_submissions (guest_id, created_at desc);

alter table public.rsvp_submissions enable row level security;
```

Do not add public RLS policies; only the server-side service role accesses this table.

- [ ] **Step 4: Implement typed environment and repository boundaries**

Validate `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, and `RSVP_VERIFICATION_SECRET` with Zod. Instantiate Supabase lazily on the server. Implement Zod schemas for verify, RSVP, and login inputs. Map Supabase snake_case rows to application types and aggregate by guest ID.

- [ ] **Step 5: Run repository and type checks**

Run: `npm test -- src/lib/rsvp-repository.test.ts && npm run typecheck`

Expected: PASS with no environment access during pure unit tests.

- [ ] **Step 6: Commit**

```bash
git add .env.example src/lib/env.ts src/lib/supabase src/lib/rsvp-schema.ts src/lib/rsvp-repository* supabase
git commit -m "feat: add Supabase RSVP repository"
```

---

### Task 4: Implement Signed Verification and Admin Sessions

**Files:**
- Create: `src/lib/verification-token.ts`
- Create: `src/lib/verification-token.test.ts`
- Create: `src/lib/admin-session.ts`
- Create: `src/lib/admin-session.test.ts`

**Interfaces:**
- Produces: `signVerificationToken(guestId)`, `verifyVerificationToken(token)`, `createAdminSession()`, `readAdminSession()`, and `clearAdminSession()`.
- Verification JWT: issuer `ecobadminton-rsvp`, audience `rsvp-submit`, expiry 15 minutes, subject guest ID.
- Admin JWT: issuer `ecobadminton-rsvp`, audience `admin`, expiry 8 hours, stored in cookie `ecobadminton_admin`.

- [ ] **Step 1: Write failing token tests**

Use fixed secrets and fake timers. Assert correct subject round-trip, wrong audience rejection, 15-minute verification expiry, 8-hour admin expiry, and cookie options `httpOnly`, `sameSite: "lax"`, `secure` in production.

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- src/lib/verification-token.test.ts src/lib/admin-session.test.ts`

Expected: FAIL because the token modules do not exist.

- [ ] **Step 3: Implement jose helpers**

Use `new TextEncoder().encode(secret)`, `SignJWT`, and `jwtVerify`. Keep token claims minimal. Use Next's async `cookies()` API only in admin cookie functions; keep pure sign/verify helpers separately testable.

- [ ] **Step 4: Verify token behavior**

Run: `npm test -- src/lib/verification-token.test.ts src/lib/admin-session.test.ts && npm run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/verification-token* src/lib/admin-session*
git commit -m "feat: add signed RSVP and admin sessions"
```

---

### Task 5: Build and Test the JSON Route Handlers

**Files:**
- Create: `src/app/api/guests/route.ts`
- Create: `src/app/api/rsvp/verify/route.ts`
- Create: `src/app/api/rsvp/route.ts`
- Create: `src/app/api/admin/login/route.ts`
- Create: `src/app/api/admin/logout/route.ts`
- Create: `src/app/api/admin/dashboard/route.ts`
- Create: colocated `route.test.ts` files for all behavior-bearing routes

**Interfaces:**
- Public JSON errors use `{ error: { code: string; message: string; field?: string } }`.
- Successful verify response: `{ verificationToken: string; guest: PublicGuest }`.
- Successful RSVP response: `{ submission: RsvpSubmission; deduplicated: boolean }`.
- Successful dashboard response: `{ summary: DashboardSummary; guests: AdminGuestRow[] }`.

- [ ] **Step 1: Write failing public-route tests**

Assert `GET /api/guests` never includes `fullName`; verify accepts normalized correct names and returns the same generic 400 error for incorrect names; RSVP rejects invalid/expired tokens, invalid UUIDs, missing attending values, and messages over 1,000 characters.

- [ ] **Step 2: Run public route tests and verify failure**

Run: `npm test -- src/app/api/guests src/app/api/rsvp`

Expected: FAIL because handlers do not exist.

- [ ] **Step 3: Implement public handlers**

Parse requests with the Zod schemas. Verify a guest with `normalizeGuestName(input.name) === normalizeGuestName(guest.fullName)`. Never include the submitted name in logs or errors. On RSVP, derive `guest_id` only from the signed token, not from client JSON.

- [ ] **Step 4: Write failing admin-route tests**

Assert wrong passwords return a generic 401, correct passwords set the session cookie, logout clears it, and dashboard requests without a valid session return 401 without invoking the repository.

- [ ] **Step 5: Implement admin handlers and verify all route tests**

Compare the configured password using `crypto.timingSafeEqual` after converting both values to equal-length SHA-256 digests. Run `npm test -- src/app/api && npm run typecheck`.

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/api
git commit -m "feat: add RSVP and admin API routes"
```

---

### Task 6: Build the Public Landing and RSVP Experience

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`
- Create: `src/components/landing/hero.tsx`
- Create: `src/components/landing/event-details.tsx`
- Create: `src/components/landing/anniversary.tsx`
- Create: `src/components/landing/rsvp-experience.tsx`
- Create: `src/components/landing/rsvp-experience.test.tsx`
- Create: `src/components/ui/form-error.tsx`

**Interfaces:**
- `RsvpExperience` fetches `GET /api/guests`, posts verification, then posts RSVP with one stable `crypto.randomUUID()` per intentional submission attempt.
- Component states: `selecting`, `verifying`, `responding`, `submitting`, `success`, and `failure`.

- [ ] **Step 1: Write failing RSVP interaction tests**

With mocked fetch responses, assert the component renders a radio for every guest, blocks continuation until selected, shows the selected image and masked name, keeps the entered name after a network failure, requires attending choice, enforces the message limit, and renders different success copy for attending versus declined.

- [ ] **Step 2: Run the focused UI tests and verify failure**

Run: `npm test -- src/components/landing/rsvp-experience.test.tsx`

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the RSVP state machine**

Use native radio inputs visually associated with 4:5 image cards. Keep each step in a focused render function. Use `aria-live="polite"` for status messages, `role="alert"` for errors, and focus the first invalid control. Do not store full names or RSVP data in localStorage.

- [ ] **Step 4: Compose the approved landing page**

Implement the hero, CLB story, event card with the exact date/location/map URL, typographic `01` anniversary section, RSVP experience, and footer. Use ivory layers, cobalt borders/blocks, restrained shuttlecock-inspired circles, scroll reveal with CSS, and reduced-motion fallback.

- [ ] **Step 5: Verify public UI**

Run: `npm test -- src/components/landing/rsvp-experience.test.tsx && npm run lint && npm run typecheck`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app src/components/landing src/components/ui
git commit -m "feat: build EcoBadminton landing and RSVP flow"
```

---

### Task 7: Build the Password-Protected Admin Dashboard

**Files:**
- Create: `src/app/admin/page.tsx`
- Create: `src/components/admin/admin-login.tsx`
- Create: `src/components/admin/admin-dashboard.tsx`
- Create: `src/components/admin/admin-login.test.tsx`
- Create: `src/components/admin/admin-dashboard.test.tsx`

**Interfaces:**
- The server page reads the signed admin session before deciding whether to render login or dashboard.
- `AdminDashboard` consumes `DashboardSummary` and `AdminGuestRow[]` and renders newest state plus expandable history.

- [ ] **Step 1: Write failing admin component tests**

Assert password submission handles generic errors and redirects/refreshes after success. Assert dashboard summary values, pending guests, latest RSVP, newest-first history, optional messages, disclosure keyboard behavior, and logout.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npm test -- src/components/admin`

Expected: FAIL because admin components do not exist.

- [ ] **Step 3: Implement the admin login and server gate**

Render only the login form without a valid session. On success call `router.refresh()`. Never serialize dashboard data into the unauthenticated page response.

- [ ] **Step 4: Implement dashboard summaries and responsive rows**

Use a semantic table at desktop widths and cards below the table breakpoint. Use native `button` disclosures with `aria-expanded` and `aria-controls`. Format timestamps in `Asia/Ho_Chi_Minh` using `Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", ... })`.

- [ ] **Step 5: Verify admin UI**

Run: `npm test -- src/components/admin && npm run lint && npm run typecheck`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin src/components/admin
git commit -m "feat: add RSVP admin dashboard"
```

---

### Task 8: Add End-to-End Coverage and Deployment Documentation

**Files:**
- Create: `tests/e2e/rsvp.spec.ts`
- Create: `tests/e2e/admin.spec.ts`
- Create: `README.md`
- Modify: `.env.example`

**Interfaces:**
- E2E uses deterministic test guest data and a repository test mode or local Supabase environment; it must never write to production Supabase.
- README defines image replacement, Supabase migration, environment, local development, testing, and Vercel deployment.

- [ ] **Step 1: Write the end-to-end scenarios**

Cover mobile and desktop RSVP success, declined RSVP without a message, incorrect name, retry after a simulated network response failure, repeated intentional RSVP history, admin login failure/success, dashboard summary, history expansion, logout, keyboard selection, and focus movement on validation errors.

- [ ] **Step 2: Add safe E2E data isolation**

Add `E2E_REPOSITORY=memory` support guarded by `NODE_ENV !== "production"`. Seed deterministic submissions per Playwright worker and reset them through an internal test-only endpoint compiled only when E2E mode is enabled.

- [ ] **Step 3: Document the production setup**

README must include:

```text
1. Replace public/guests/guest-01.svg ... guest-20.svg with real 4:5 images.
2. Replace sample names in src/data/guests.ts without changing stable IDs.
3. Run the SQL migration in Supabase.
4. Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_PASSWORD,
   ADMIN_SESSION_SECRET, and RSVP_VERIFICATION_SECRET in Vercel.
5. Run npm run lint, npm run typecheck, npm test, npm run test:e2e, npm run build.
6. Deploy the main branch to Vercel.
```

- [ ] **Step 4: Run the complete verification suite**

Run:

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Expected: every command exits 0; Playwright covers Chromium desktop and a mobile viewport; the production build lists `/`, `/admin`, and all required API routes.

- [ ] **Step 5: Inspect the responsive UI in a browser**

Verify at 390x844 and 1440x1000: no horizontal overflow, all guest images retain 4:5, radio focus is visible, admin history opens correctly, map opens the approved URL, and reduced motion is respected.

- [ ] **Step 6: Commit**

```bash
git add tests README.md .env.example src
git commit -m "test: verify EcoBadminton RSVP experience"
```

---

## Final Verification

- Confirm `git status --short` is clean.
- Confirm no full guest name appears in the output of `GET /api/guests` or client JavaScript bundles.
- Confirm no secret is committed by running `git grep -nE "service_role|ADMIN_PASSWORD=.+|SESSION_SECRET=.+"` and reviewing any matches.
- Confirm the 20 placeholder image paths are documented for replacement.
- Confirm the Supabase migration is idempotent and RLS has no public policies.
- Confirm the latest exact package versions remain recorded in `package-lock.json`.
