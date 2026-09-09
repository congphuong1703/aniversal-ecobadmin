# Final Fix Report

## Status

Complete. The final-review fix wave is implemented and committed.

## Commits

- `4313eb7` - `fix: exclude declined guests from lucky draws`
- The report itself is recorded in a follow-up documentation commit.

## Changed files

- `src/components/draw/public-draw-page.tsx`: added the `Cach kiem tra` section, stable `#cach-kiem-tra` anchor, public anchor-navigation link, and instructions to read the five numbers in the successful RSVP card and compare them with published results.
- `src/components/draw/public-draw-page.test.tsx`: added focused assertions for the section, anchor, navigation link, instructions, and public anchor-link hover contract.
- `src/app/globals.css`: added the dedicated public draw anchor-link hover color and scroll offset for the new section.
- `src/lib/latest-rsvp.ts`: added shared latest-RSVP selection ordered by `created_at` and then `id`, with production Supabase pagination and attending-guest extraction.
- `src/lib/e2e-rsvp-status.ts`: added worker-scoped in-memory RSVP status tracking without introducing a repository import cycle.
- `src/lib/e2e-rsvp-repository.ts`: keeps append-only RSVP history and updates the worker-scoped latest-status state on new submissions.
- `src/lib/e2e-lucky-number-state.ts`: filters E2E assignment listings to guests whose latest RSVP is attending; direct adapters without RSVP state still retain their prior behavior.
- `src/lib/lucky-number-repository.ts`: filters production assignment listings using the latest attending RSVP rows.
- `src/lib/lucky-draw-repository.test.ts`: added the attending/declined shared-number regression proving only the attending guest can win the special draw.
- `src/lib/rsvp-repository.ts`: reuses the shared latest-RSVP ordering helper while preserving dashboard history and current-status behavior.
- `src/lib/latest-rsvp.test.ts`: covers `created_at` and `id` ordering for latest RSVP selection.
- `supabase/migrations/202609080004_filter_lucky_draw_to_active_rsvps.sql`: immutable RPC replacement that filters atomic draw ownership to each guest's latest attending RSVP while preserving lock, random pending rank, no-repeat numbers, rank eligibility, error codes, and service-role-only grants.
- `src/lib/database-migration.test.ts`: added migration contract coverage for latest-RSVP filtering and preserved RPC safety/behavior contracts.
- `README.md`: documents chronological application of all migrations, including random-prize and active-RSVP migrations, to the same Supabase project configured in Vercel.
- `tests/e2e/draw.spec.ts`: scoped the public reveal assertion to the winning-number element so number text in another card cannot cause strict-mode ambiguity.

## Verification

- Focused review tests: `4` files passed, `22` tests passed.
- Full Vitest suite: `37` files passed, `211` tests passed using serial file execution for stable resource usage.
- Lint: `pnpm lint` passed.
- Typecheck: `pnpm typecheck` passed.
- E2E draw flow: `2` passed across desktop and mobile Chromium.
- Build and privacy scan: `pnpm build` passed; `54` names checked across `16` client bundles.
- Diff checks: `git diff --check` and staged diff check passed.

One parallel full-suite attempt showed unrelated worker/resource contention (admin/session timeouts and a worker-start timeout). The focused admin tests passed immediately afterward, and the full suite passed on the serial rerun; no application change was made for that transient test-run condition.

## Database safety and manual action

- No Supabase, external, staging, production, or other database command was run from this workspace.
- Before deployment, the operator must apply these files in chronological order in the same Supabase project referenced by Vercel:
  - `supabase/migrations/202607290001_create_rsvp_submissions.sql`
  - `supabase/migrations/202609080001_create_lucky_number_tables.sql`
  - `supabase/migrations/202609080002_add_atomic_lucky_draw_function.sql`
  - `supabase/migrations/202609080003_randomize_lucky_prize_order.sql`
  - `supabase/migrations/202609080004_filter_lucky_draw_to_active_rsvps.sql`

Existing RSVP history and lucky-number assignments remain append-only; the active-RSVP filter changes eligibility and winner mapping only.
