# Lucky Number Draw Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add fixed five-number RSVP assignments, one-at-a-time admin prize draws, public result updates, and admin participant filtering without changing the existing RSVP or session behavior.

**Architecture:** Keep the existing Next.js route/repository boundaries. Store assignments and draw results in separate Supabase tables, expose a public read-only draw state endpoint, and use two-second client polling for public updates. Keep draw selection atomic in a database function and keep number generation/eligibility rules covered by pure TypeScript tests.

**Tech Stack:** Next.js 16, React 19, TypeScript, Zod, Supabase, Vitest, Testing Library, Playwright, pnpm.

## Global Constraints

- Generate exactly five distinct two-digit values from `00` through `99` server-side on the first attending RSVP only.
- Persist the assignment once per guest; retries, refreshes, and later RSVP submissions return the same values.
- Draw rounds are special, second, third, fourth, fifth; winning numbers are unique across rounds.
- Eligibility is independent of card position: special has exactly one owner; later rounds allow at most 2, 3, 4, and 5 owners respectively.
- A guest may win multiple rounds.
- Only an authenticated admin can start a draw; anonymous clients can only read public results.
- The public page polls every two seconds while visible and shows all matching public winner names.
- Do not add the removed legal/internal disclaimer to the public draw page.
- Prize labels and rewards live in editable configuration; default the fifth reward to `Phạt 1 cốc bia`.
- Do not run database commands against any remote, shared, staging, or unverified target. Add migrations only; test persistence with in-memory adapters and route tests.
- Use TDD: write a failing test, run it, implement the minimum behavior, run the focused test, then run the relevant broader suite.

---

## File map

### New files

- `src/data/draw-prizes.ts` — editable prize metadata and owner-count rules.
- `src/lib/lucky-number.ts` — number generation, formatting, assignment validation, and owner-count eligibility helpers.
- `src/lib/lucky-number.test.ts` — pure number and eligibility tests.
- `src/lib/lucky-number-repository.ts` — assignment types, adapters, production Supabase implementation, and idempotent ensure operation.
- `src/lib/lucky-number-repository.test.ts` — assignment repository tests.
- `src/lib/lucky-draw-repository.ts` — draw types, state mapping, production adapter, and public/admin result shaping.
- `src/lib/lucky-draw-repository.test.ts` — draw state and winner mapping tests.
- `src/lib/e2e-lucky-number-state.ts` — scoped in-memory assignment/draw persistence for E2E mode.
- `src/app/api/draws/route.ts` — public draw-state endpoint.
- `src/app/api/admin/draws/route.ts` — authenticated admin draw-state endpoint.
- `src/app/api/admin/draws/next/route.ts` — authenticated one-round draw endpoint.
- `src/app/api/draws/route.test.ts` — public endpoint tests.
- `src/app/api/admin/draws/route.test.ts` — admin endpoint tests.
- `src/app/api/admin/draws/next/route.test.ts` — admin draw mutation tests.
- `src/app/quay-trung-thuong/page.tsx` — public draw page.
- `src/components/draw/public-draw-page.tsx` — polling and result presentation.
- `src/components/draw/public-draw-page.test.tsx` — public draw page tests.

### Modified files

- `supabase/migrations/202609080001_create_lucky_number_tables.sql` — assignment/result tables.
- `supabase/migrations/202609080002_add_atomic_lucky_draw_function.sql` — transaction-safe next-prize draw function.
- `src/lib/rsvp-repository.ts` — add assignment data to admin rows and dashboard contracts.
- `src/lib/e2e-rsvp-repository.ts` — include scoped lucky-number state in dashboard test data where needed.
- `src/app/api/rsvp/route.ts` — ensure an assignment for attending submissions and return it.
- `src/app/api/rsvp/route.test.ts` — assert fixed numbers and declined behavior.
- `src/components/landing/rsvp-experience.tsx` — render fixed numbers in the success card.
- `src/components/landing/rsvp-experience.test.tsx` — assert success-card number rendering.
- `src/components/admin/admin-dashboard.tsx` — participant filters, assigned numbers, draw controls, and winner labels.
- `src/components/admin/admin-dashboard.test.tsx` — filter and draw-control tests.
- `src/app/api/admin/dashboard/route.ts` — expose the extended dashboard contract.
- `src/app/api/test/reset/route.ts` — reset lucky-number/draw E2E state.
- `src/app/api/test/reset/route.test.ts` — assert complete reset behavior.
- `src/app/globals.css` — red lottery-style circles, draw page, and admin additions.
- `src/app/layout.tsx` or existing navigation component — link to the draw page if the current site navigation has a suitable location.
- `tests/e2e/rsvp.spec.ts` — verify fixed numbers appear after attending RSVP.
- `tests/e2e/admin.spec.ts` — verify admin can filter numbers and draw a round.
- `tests/e2e/draw.spec.ts` — verify public result visibility after an admin draw.

---

## Task 1: Domain rules and prize configuration

**Files:**
- Create: `src/data/draw-prizes.ts`
- Create: `src/lib/lucky-number.ts`
- Create: `src/lib/lucky-number.test.ts`

**Interfaces:**

- Produce `LuckyNumber = number`, `LuckyNumbers = readonly [number, number, number, number, number]`, `DRAW_PRIZES`, `formatLuckyNumber(value: number): string`, `generateLuckyNumbers(randomInt?: (min: number, max: number) => number): LuckyNumbers`, `ownerLimitForPrize(rank: number): number`, `isEligibleOwnerCount(rank: number, ownerCount: number): boolean`, and `selectEligibleNumber(...)`.
- `selectEligibleNumber` must accept a map of number to owner count plus an array of already drawn numbers and use an injected random index function so tests do not depend on nondeterministic output.

- [ ] **Step 1: Write the failing tests**

Cover these exact behaviors in `src/lib/lucky-number.test.ts`:

```ts
it("generates five distinct values in the inclusive 00-99 range", () => {
  const values = generateLuckyNumbers((min, max) => min + (max - min) / 2);
  expect(values).toHaveLength(5);
  expect(new Set(values).size).toBe(5);
  expect(values.every((value) => value >= 0 && value <= 99)).toBe(true);
});

it("formats single-digit values with a leading zero", () => {
  expect(formatLuckyNumber(1)).toBe("01");
  expect(formatLuckyNumber(12)).toBe("12");
});

it("applies exact-one ownership to special and maximum ownership to later prizes", () => {
  expect(isEligibleOwnerCount(1, 1)).toBe(true);
  expect(isEligibleOwnerCount(1, 2)).toBe(false);
  expect(isEligibleOwnerCount(2, 2)).toBe(true);
  expect(isEligibleOwnerCount(2, 3)).toBe(false);
  expect(isEligibleOwnerCount(5, 5)).toBe(true);
  expect(isEligibleOwnerCount(5, 6)).toBe(false);
});

it("never selects a number that was already drawn", () => {
  expect(
    selectEligibleNumber(
      new Map([[12, 1], [53, 2]]),
      [12],
      2,
      () => 0,
    ),
  ).toBe(53);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `pnpm vitest run src/lib/lucky-number.test.ts`

Expected: FAIL because the new module and functions do not exist.

- [ ] **Step 3: Implement the minimum domain module**

Use `node:crypto` `randomInt` as the default generator, generate from `0` through `99`, remove duplicates, and return the values in the generated order. Keep prize metadata in `DRAW_PRIZES` with labels for `special`, `second`, `third`, `fourth`, and `fifth`; include `reward: "Phạt 1 cốc bia"` for fifth. `selectEligibleNumber` must filter by `isEligibleOwnerCount`, remove the `drawnNumbers`, and return `null` when no candidate remains.

- [ ] **Step 4: Run focused tests and refactor only after green**

Run: `pnpm vitest run src/lib/lucky-number.test.ts`

Expected: PASS with no warnings.

- [ ] **Step 5: Commit**

Run: `git add src/data/draw-prizes.ts src/lib/lucky-number.ts src/lib/lucky-number.test.ts && git commit -m "feat: add lucky number draw rules"`

---

## Task 2: Assignment persistence and RSVP integration

**Files:**
- Create: `supabase/migrations/202609080001_create_lucky_number_tables.sql`
- Create: `src/lib/lucky-number-repository.ts`
- Create: `src/lib/lucky-number-repository.test.ts`
- Create: `src/lib/e2e-lucky-number-state.ts`
- Modify: `src/lib/e2e-rsvp-repository.ts`
- Modify: `src/app/api/rsvp/route.ts`
- Modify: `src/app/api/rsvp/route.test.ts`
- Modify: `src/app/api/test/reset/route.ts`
- Modify: `src/app/api/test/reset/route.test.ts`

**Interfaces:**

- `LuckyNumberAssignmentRow` has `guest_id`, `numbers`, and `created_at`.
- `LuckyNumberPersistenceAdapter` exposes `findByGuestId`, `insertAssignment`, and `listAssignments`.
- `LuckyNumberRepository` exposes `ensureAssignment(guestId)` and `listAssignments()`.
- `ensureAssignment` must recover a unique-key race by reading the existing row.
- The RSVP route response becomes `{ submission, deduplicated, luckyNumbers }`, where `luckyNumbers` is `LuckyNumbers | null`.

- [ ] **Step 1: Write failing repository and route tests**

Add repository tests for creating an assignment, returning the same assignment on the second call, recovering after an insert conflict, and rejecting malformed rows. Add route tests proving an attending request returns five numbers and a declined request returns `luckyNumbers: null`.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `pnpm vitest run src/lib/lucky-number-repository.test.ts src/app/api/rsvp/route.test.ts`

Expected: FAIL on missing assignment types/response fields.

- [ ] **Step 3: Add the migration**

Create `lucky_number_assignments` with a primary key on `guest_id`, a five-element `smallint[]` check, a range check for every array value, and a distinct-values check. Create `lucky_draw_results` with `prize_rank` restricted to `1..5`, `winning_number` restricted to `0..99`, and a unique winning number. Enable RLS and grant access only through the existing service-role server path.

Keep this migration limited to table definitions, constraints, indexes, RLS, and service-role grants. The atomic draw function belongs to the separate migration in Task 3 so migrations remain immutable after application.

- [ ] **Step 4: Implement in-memory and production assignment repositories**

Use Zod parsing at the repository boundary. The production adapter selects and inserts from `lucky_number_assignments`; the E2E adapter stores assignments by worker scope. Generate values with `generateLuckyNumbers`, insert once, and on unique violation load the existing row. Keep the guest ID validation consistent with `createRsvpRepository`.

- [ ] **Step 5: Integrate the RSVP route**

After the existing submission write succeeds, call `ensureAssignment` only when `parsed.data.attending` is true. Return the assignment in the JSON response. On assignment failure return the existing generic `INTERNAL_ERROR` response. Do not create numbers for declined submissions.

- [ ] **Step 6: Extend reset behavior and run green tests**

Reset scoped assignments and draw state before loading optional fixture submissions. Run:

```bash
pnpm vitest run src/lib/lucky-number-repository.test.ts src/app/api/rsvp/route.test.ts src/app/api/test/reset/route.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

Run: `git add supabase/migrations/202609080001_create_lucky_number_tables.sql src/lib/lucky-number-repository.ts src/lib/lucky-number-repository.test.ts src/lib/e2e-lucky-number-state.ts src/lib/e2e-rsvp-repository.ts src/app/api/rsvp/route.ts src/app/api/rsvp/route.test.ts src/app/api/test/reset/route.ts src/app/api/test/reset/route.test.ts && git commit -m "feat: persist fixed RSVP lucky numbers"`

---

## Task 3: Draw repository and protected/public APIs

**Files:**
- Create: `src/lib/lucky-draw-repository.ts`
- Create: `src/lib/lucky-draw-repository.test.ts`
- Create: `src/app/api/draws/route.ts`
- Create: `src/app/api/admin/draws/route.ts`
- Create: `src/app/api/admin/draws/next/route.ts`
- Create: `src/app/api/draws/route.test.ts`
- Create: `src/app/api/admin/draws/route.test.ts`
- Create: `src/app/api/admin/draws/next/route.test.ts`
- Modify: `src/lib/e2e-lucky-number-state.ts`
- Modify: `src/lib/lucky-number-repository.ts`
- Create: `supabase/migrations/202609080002_add_atomic_lucky_draw_function.sql`

**Interfaces:**

- `LuckyDrawResult` contains `prizeRank`, `prizeKey`, `label`, `reward`, `winningNumber`, `winners`, and `createdAt`.
- `LuckyDrawState` contains all five prize entries, with `result: LuckyDrawResult | null` for pending rounds.
- `LuckyDrawRepository` exposes `getState()`, `drawNext()`, and `getAdminState()`.
- `drawNext()` returns a completed result or a typed `NoEligibleLuckyNumberError`/`AllPrizesDrawnError`.

- [ ] **Step 1: Write failing pure repository tests**

Test owner-count aggregation, winner mapping from guest IDs to public names, repeated winners across rounds, exclusion of previous winning numbers, no-eligible-number errors, and five-round ordering. Use the E2E adapter; do not connect to Supabase.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `pnpm vitest run src/lib/lucky-draw-repository.test.ts`

Expected: FAIL because draw state and repository functions are absent.

- [ ] **Step 3: Implement repository contracts and E2E behavior**

Aggregate assignments into `Map<number, number>` owner counts, apply `isEligibleOwnerCount`, remove drawn numbers, select one candidate with the domain random selector, save the result, and map matching guest names from `GUESTS`. Keep `drawNext` serialized per E2E scope so two calls cannot create the same rank.

- [ ] **Step 4: Implement the production atomic draw function and adapter**

Create `draw_next_lucky_prize()` in `supabase/migrations/202609080002_add_atomic_lucky_draw_function.sql`. Under a transaction lock, determine the next prize rank, aggregate `unnest(numbers)` by number and distinct guest ID, apply the exact-one rule for special and maximum rules for other prizes, exclude existing winners, randomly select one candidate, and insert the result. The production adapter invokes the function through Supabase RPC and then reads full state for winner mapping.

- [ ] **Step 5: Implement the public endpoint**

`GET /api/draws` returns `LuckyDrawState` with `Cache-Control: no-store`; it never returns assignments. On repository failure return the existing generic `INTERNAL_ERROR` shape.

- [ ] **Step 6: Implement admin endpoints**

Reuse the fail-closed session pattern from `src/app/api/admin/dashboard/route.ts`. `GET /api/admin/draws` returns the protected admin state. `POST /api/admin/draws/next` draws only the next pending rank, returns 401 when unauthenticated, 409 for no eligible number or all five rounds complete, and 500 for unexpected persistence errors.

- [ ] **Step 7: Run focused API tests and commit**

Run:

```bash
pnpm vitest run src/lib/lucky-draw-repository.test.ts src/app/api/draws/route.test.ts src/app/api/admin/draws/route.test.ts src/app/api/admin/draws/next/route.test.ts
```

Expected: PASS.

Commit with: `git add src/lib/lucky-draw-repository.ts src/lib/lucky-draw-repository.test.ts src/app/api/draws src/app/api/admin/draws src/lib/e2e-lucky-number-state.ts supabase/migrations/202609080002_add_atomic_lucky_draw_function.sql && git commit -m "feat: add protected prize draw APIs"`

---

## Task 4: RSVP card and public draw page

**Files:**
- Modify: `src/components/landing/rsvp-experience.tsx`
- Modify: `src/components/landing/rsvp-experience.test.tsx`
- Create: `src/app/quay-trung-thuong/page.tsx`
- Create: `src/components/draw/public-draw-page.tsx`
- Create: `src/components/draw/public-draw-page.test.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx` or the existing navigation owner.

**Interfaces:**

- RSVP success state consumes `luckyNumbers: LuckyNumbers | null` from `POST /api/rsvp`. Because unverified direct `guestId` submissions intentionally return `null`, the attending UI must first call `POST /api/rsvp/verify` with the selected guest ID and displayed full name, retain the returned verification token for retries, and submit the attending RSVP with that token.
- Public draw page consumes the exact `LuckyDrawState` returned by `GET /api/draws`.

- [ ] **Step 1: Write failing component tests**

Add an RSVP test that verifies the selected guest before submitting an attending response with `luckyNumbers: [12, 1, 22, 53, 52]`, then asserts visible `12`, `01`, `22`, `53`, `52` in red-number elements. Add a regression test that the request sent for an attending response uses `verificationToken`, not direct `guestId`. Add public-page tests for pending state, revealed number, all winner names, and polling refresh.

- [ ] **Step 2: Run focused component tests and verify RED**

Run: `pnpm vitest run src/components/landing/rsvp-experience.test.tsx src/components/draw/public-draw-page.test.tsx`

Expected: FAIL because the new success-card and public component do not exist.

- [ ] **Step 3: Implement RSVP success card**

Before an attending submission, call `/api/rsvp/verify` with the selected guest ID and selected guest full name, save the returned verification token, and use it in `/api/rsvp`; keep the token for retrying the same submission. Parse the response's optional `luckyNumbers`, preserve it in state, and render five `<span>` elements with `formatLuckyNumber` behavior in the success card. Use an accessible list label and CSS classes that create red circular outlines. Do not render the card for declined submissions or failed requests.

- [ ] **Step 4: Implement public polling page**

Create a client component that fetches once on mount, polls every 2 seconds only while `document.visibilityState === "visible"`, clears the timer on unmount, and keeps the last good state if a later request fails. Render five prize cards, pending states, winning numbers, reward text, and all winner names. Do not render the removed legal/internal disclaimer.

- [ ] **Step 5: Add route and navigation entry**

Render the component from `/quay-trung-thuong` with the existing page shell. Add one navigation link only where the current app already renders event links; do not restructure unrelated navigation.

- [ ] **Step 6: Add styles and run tests**

Keep the existing visual language, ensure the number circles and cards work at mobile width, and run:

```bash
pnpm vitest run src/components/landing/rsvp-experience.test.tsx src/components/draw/public-draw-page.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit**

Run: `git add src/components/landing/rsvp-experience.tsx src/components/landing/rsvp-experience.test.tsx src/app/quay-trung-thuong/page.tsx src/components/draw/public-draw-page.tsx src/components/draw/public-draw-page.test.tsx src/app/globals.css src/app/layout.tsx && git commit -m "feat: show lucky numbers and public draw page"`

---

## Task 5: Admin participant filter and draw controls

**Files:**
- Modify: `src/lib/rsvp-repository.ts`
- Modify: `src/app/api/admin/dashboard/route.ts`
- Modify: `src/components/admin/admin-dashboard.tsx`
- Modify: `src/components/admin/admin-dashboard.test.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**

- `AdminGuestRow` gains `luckyNumbers: LuckyNumbers | null` and `wonPrizes: readonly string[]`.
- The dashboard consumes `/api/admin/dashboard` for participant rows and `/api/admin/draws` for draw state.
- The admin controls call `POST /api/admin/draws/next`, then refresh both dashboard and draw state.

- [ ] **Step 1: Write failing admin tests**

Add tests for filtering by guest name, filtering by a two-digit number including `01`, filtering by attending/declined/pending/winner status, displaying assigned numbers, displaying multiple won prizes, disabling the draw button while pending, and refreshing after a successful draw.

- [ ] **Step 2: Run focused test and verify RED**

Run: `pnpm vitest run src/components/admin/admin-dashboard.test.tsx`

Expected: FAIL on missing fields, filter controls, and draw controls.

- [ ] **Step 3: Extend dashboard data mapping**

Load all assignments and draw results server-side, attach each attending guest's numbers, and compute `wonPrizes` from matching assignments. Keep declined and pending guests with `luckyNumbers: null`; do not expose assignment data in anonymous endpoints.

- [ ] **Step 4: Implement client filters**

Keep filter state local to the admin component. Match the normalized search string against guest full name and formatted numbers; use explicit select controls for response status and winner status. Render an empty state when no rows match.

- [ ] **Step 5: Implement draw panel**

Show the next prize metadata, owner-count rule, current completed results, and one admin-only button. Handle 401 by following existing session-expiry behavior, 409 with an inline actionable message, and success by reloading state. Never let the client choose a number or prize rank.

- [ ] **Step 6: Run focused tests and commit**

Run: `pnpm vitest run src/components/admin/admin-dashboard.test.tsx src/app/api/admin/dashboard/route.test.ts`

Expected: PASS.

Commit with: `git add src/lib/rsvp-repository.ts src/app/api/admin/dashboard/route.ts src/components/admin/admin-dashboard.tsx src/components/admin/admin-dashboard.test.tsx src/app/globals.css && git commit -m "feat: add admin lucky number controls"`

---

## Task 6: End-to-end integration and final verification

**Files:**
- Create: `tests/e2e/draw.spec.ts`
- Modify: `tests/e2e/rsvp.spec.ts`
- Modify: `tests/e2e/admin.spec.ts`
- Modify: `src/app/api/test/reset/route.ts`
- Modify: `src/app/api/test/reset/route.test.ts`

- [ ] **Step 1: Write failing E2E scenarios**

Add a flow that resets a worker scope, submits attendance, verifies five two-digit circles, opens the public draw page, logs in as admin, filters by one assigned number, draws the first eligible round, and verifies the public page reveals the number and every matching winner. Add assertions that an unauthenticated POST to the draw endpoint returns 401 and a sixth draw returns 409.

- [ ] **Step 2: Run the new E2E tests and verify RED**

Run: `pnpm test:e2e tests/e2e/rsvp.spec.ts tests/e2e/admin.spec.ts tests/e2e/draw.spec.ts`

Expected: FAIL until all UI and API contracts are integrated.

- [ ] **Step 3: Implement only test-harness adjustments needed for deterministic E2E state**

Use the existing `E2E_WORKER_HEADER` scope and reset endpoint. Do not add production-only shortcuts or expose test routes outside the existing E2E mode.

- [ ] **Step 4: Run all verification commands**

Run:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

Expected: all commands exit 0; `build` also passes `scripts/check-client-privacy.mjs`.

- [ ] **Step 5: Review the full branch and commit any final test-harness changes**

Run `git diff --check` and `git status --short`. If Task 6 changed files after the prior commit, commit them with `test: cover lucky number draw flow`.

---

## Execution order and review gates

1. Task 1 establishes pure contracts.
2. Task 2 adds persistence and RSVP response data.
3. Task 3 adds atomic draw state and APIs.
4. Task 4 can then consume stable public contracts.
5. Task 5 extends the protected dashboard.
6. Task 6 proves the complete user/admin/public flow.

After each task, create a diff package from the task's recorded base commit, dispatch a fresh task reviewer for spec compliance and code quality, and fix all Critical/Important findings before marking the task complete. After Task 6, dispatch one broad whole-branch reviewer before considering the feature complete.
