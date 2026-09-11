# Lucky Draw Prizes and Winner Fill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the five requested rewards and make every completed prize contain the exact number of unique attending winners required by its rank, persisting only supplemental winners.

**Architecture:** Keep `DRAW_PRIZES` as the single source for public/admin reward copy. Extend lucky-draw result persistence with a `supplemental_guest_ids` array; the server selects extra attending guests atomically after selecting the existing winning number, and result mapping merges number owners with saved supplemental IDs. The in-memory E2E adapter mirrors production behavior.

**Tech Stack:** Next.js 16, TypeScript, Vitest, Supabase/PostgreSQL migrations, existing lucky-number and RSVP repositories.

## Global Constraints

- Keep existing random pending-prize and winning-number behavior.
- A prize must have exactly 1/2/3/4/5 unique winners for ranks 1/2/3/4/5.
- A guest cannot occur twice in one prize, but may win multiple different prizes.
- Supplemental winners must be attending guests and selected server-side.
- Do not run migrations or database commands against a remote/shared database.
- Do not commit secrets or `.env` files.

---

### Task 1: Update Prize Copy

**Files:** `src/data/draw-prizes.ts`, `src/lib/lucky-draw-repository.test.ts`

- [ ] Add exact labels/rewards: `Giải nhất` with `1 giải trúng thưởng - Bình nước thể thao giữ nhiệt`; `Giải nhì` with `2 giải - Băng đô thể thao`; `Giải ba` with `3 giải - Bình xịt lạnh giảm đau`; and `Giải tư`/`Giải năm` with their requested bia hơi Hà Nội, gender quantities, and quà bí mật wording.
- [ ] Run `pnpm exec vitest run src/lib/lucky-draw-repository.test.ts -t "maps every configured reward"`; verify the old `Công bố sau` values fail.
- [ ] Update the five `reward` fields while preserving keys and labels.
- [ ] Re-run the focused test; expect PASS.

### Task 2: Add Supplemental Selection Helper

**Files:** `src/lib/lucky-number.ts`, `src/lib/lucky-number.test.ts`

- [ ] Write failing tests for filling a target from a short base, excluding existing winners, preventing duplicate supplemental IDs, and returning `null` when capacity is insufficient.
- [ ] Run `pnpm exec vitest run src/lib/lucky-number.test.ts -t supplemental`; expect failure because the helper is missing.
- [ ] Implement and export `selectSupplementalGuestIds(candidateGuestIds, existingGuestIds, targetCount, randomIndex)`; deduplicate candidates, exclude existing IDs, randomly remove selected candidates, and return exactly the missing IDs or `null`.
- [ ] Run `pnpm exec vitest run src/lib/lucky-number.test.ts`; expect PASS.

### Task 3: Persist and Map Supplemental Winners

**Files:** `src/lib/lucky-draw-repository.ts`, `src/lib/e2e-lucky-number-state.ts`, `src/lib/lucky-draw-repository.test.ts`

- [ ] Add failing repository tests proving a short result is filled to rank size with unique names, existing number owners are not repeated, different ranks may share a guest, and insufficient capacity rejects without saving a result.
- [ ] Run `pnpm exec vitest run src/lib/lucky-draw-repository.test.ts -t "supplemental|capacity|unique"`; expect failure.
- [ ] Add `supplemental_guest_ids: readonly string[]` to result rows/inserts and parse missing arrays as `[]` for old fixtures.
- [ ] Add `InsufficientPrizeWinnersError` with code `INSUFFICIENT_PRIZE_WINNERS`.
- [ ] In in-memory draw completion, derive unique number owners, select supplemental attending guests to the rank target, reject insufficient capacity before insert, and persist selected IDs.
- [ ] Map results by merging number owners and saved supplemental IDs, deduplicating by guest ID before public names.
- [ ] Update the E2E adapter default row and insert handling; run focused repository and lucky-number tests.

### Task 4: Add Atomic Production Migration

**Files:** `supabase/migrations/202609120001_add_supplemental_lucky_winners.sql`, `src/lib/database-migration.test.ts`

- [ ] Add failing migration assertions for the new `text[]` column/default, active-attendee filtering, random non-owner supplementation, insufficient-capacity exception, returned supplemental IDs, and service-role-only execution.
- [ ] Run `pnpm exec vitest run src/lib/database-migration.test.ts -t "supplemental|winner capacity"`; expect failure because the migration is absent.
- [ ] Create the migration with `alter table ... add column if not exists`, then `create or replace function public.draw_next_lucky_prize()` preserving the existing advisory lock, random pending rank, active RSVP filtering, and unique winning-number rules.
- [ ] Make the function compute current owners, randomly choose enough other attending guests to reach the rank target, raise `INSUFFICIENT_PRIZE_WINNERS` before insert when needed, and insert the selected IDs atomically.
- [ ] Keep revoke/grant service-role permissions; run migration tests. Do not apply SQL to a database.

### Task 5: Update Production Adapter and Admin Error Contract

**Files:** `src/lib/lucky-draw-repository.ts`, `src/app/api/admin/draws/next/route.ts`, `src/app/api/admin/draws/next/route.test.ts`, `src/lib/rsvp-repository.test.ts`

- [ ] Add failing tests for HTTP 409 `INSUFFICIENT_PRIZE_WINNERS` and dashboard labels for a guest who is supplemental-only.
- [ ] Run focused API/dashboard tests; expect failure.
- [ ] Include `supplemental_guest_ids` in production select/insert parsing and map the new repository error to HTTP 409 with an actionable message.
- [ ] Ensure admin `wonPrizes` uses final merged winners, then run focused tests and `pnpm test`.

### Task 6: Verify, Commit, Merge, Push

- [ ] Run `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `git diff --check`.
- [ ] Review status/diff for only scoped files and no secrets.
- [ ] On feature branch `feat/lucky-draw-prizes`, commit with `feat: fill lucky draw prize winners`.
- [ ] Switch to `main`, fast-forward merge the verified commit, and run `git push origin main`.
