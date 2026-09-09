# Public Lucky Draw Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public lucky-draw information menu/page with placeholder prizes, transparent rules, live results, and random selection of one pending prize rank per admin draw.

**Architecture:** Keep the existing protected admin draw API and public read-only `/api/draws` API. Change only the pending-prize selection: the in-memory repository chooses a random pending rank through its injected `RandomIndex`, and a new immutable Supabase migration updates the production RPC to select a pending rank with `order by random()`. Keep prize labels and demo rewards in `src/data/draw-prizes.ts`; render rules, progress, and results in the existing public draw page.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Supabase PostgreSQL RPCs, Vitest, Playwright, existing global CSS design system.

## Global Constraints

- Preserve the existing EcoBadminton visual language, responsive behavior, and public data-safety boundaries.
- Only an authenticated admin may call the draw mutation; do not add a public draw button or public write endpoint.
- Each of the five prize ranks can be persisted only once, and a winning number cannot repeat.
- All attending guests who own the winning number are winners for that prize.
- Keep existing Supabase migrations immutable; add a new migration for the changed draw RPC.
- Keep demo reward copy centralized in `src/data/draw-prizes.ts` so organizers can replace it later.
- Preserve unrelated existing worktree changes in `next-env.d.ts`, `src/components/landing/achievement-slide.tsx`, and existing lucky-draw docs.

---

### Task 1: Randomize the pending prize rank in the repository

**Files:**
- Modify: `src/lib/lucky-draw-repository.ts:1-17, 213-240`
- Test: `src/lib/lucky-draw-repository.test.ts:1-150`

**Interfaces:**
- Consumes the existing `LuckyDrawRepository` and `RandomIndex` types.
- Produces the same `drawNext(): Promise<LuckyDrawResult>` contract, but selects the next rank randomly from ranks not present in `listResults()`.

- [ ] **Step 1: Write the failing test for a non-first pending rank**

Replace the current first-pending-rank test with a deterministic random-index sequence. The first random value chooses a pending rank; the second chooses the eligible number:

```ts
it("selects a random pending prize rank", async () => {
  await seedAssignments([
    { guest_id: "guest-01", numbers: [10, 11, 12, 13, 14] },
  ]);
  await getE2eLuckyDrawPersistence(SCOPE).insertResult({
    prize_rank: 2,
    winning_number: 10,
  });

  const values = [1, 0];
  const randomRepository = createLuckyDrawRepository(
    getE2eLuckyDrawPersistence(SCOPE),
    {
      randomIndex: () => values.shift() ?? 0,
    },
  );

  await expect(randomRepository.drawNext()).resolves.toMatchObject({
    prizeRank: 3,
    winningNumber: 11,
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `pnpm exec vitest run src/lib/lucky-draw-repository.test.ts -t "selects a random pending prize rank"`

Expected: FAIL because the repository currently always chooses the first pending rank (`prizeRank: 1`).

- [ ] **Step 3: Implement the smallest repository change**

Import `randomInt` from `node:crypto` and replace the ordered `nextRank` lookup in `completeInMemoryDraw` with a pending-rank array and one random index:

```ts
const pendingRanks = DRAW_PRIZES.filter(
  ({ rank }) => !drawnRanks.has(rank),
).map(({ rank }) => rank);
const nextRank =
  pendingRanks[
    (randomIndex ?? ((min, max) => randomInt(min, max)))
      (0, pendingRanks.length)
  ];

if (nextRank === undefined) {
  throw new AllPrizesDrawnError();
}
```

Leave eligible-number selection and duplicate-number exclusion unchanged. The injected `randomIndex` remains deterministic in existing tests, while production receives a secure server-side random fallback.

- [ ] **Step 4: Run repository tests and verify the behavior**

Run: `pnpm exec vitest run src/lib/lucky-draw-repository.test.ts`

Expected: PASS, including the existing concurrency, duplicate-number, no-eligible-number, and all-five-prizes tests.

- [ ] **Step 5: Commit the repository behavior as one working unit**

```bash
git add src/lib/lucky-draw-repository.ts src/lib/lucky-draw-repository.test.ts
git commit -m "feat: randomize pending lucky draw prizes"
```

### Task 2: Add the production Supabase migration for random prize order

**Files:**
- Create: `supabase/migrations/202609080003_randomize_lucky_prize_order.sql`
- Modify: `src/lib/database-migration.test.ts:9-79`

**Interfaces:**
- Consumes the existing `public.lucky_draw_results`, `public.lucky_number_assignments`, and `public.draw_next_lucky_prize()` contract.
- Produces the same `public.draw_next_lucky_prize()` return type and error messages, with only the pending-rank selection order changed.

- [ ] **Step 1: Add a migration test that describes the new SQL contract**

Add a `randomizedLuckyDrawMigration` string loaded from the new migration and this assertion:

```ts
it("randomizes the next pending prize rank", () => {
  expect(randomizedLuckyDrawMigration).toMatch(
    /where not exists \([\s\S]*result\.prize_rank = candidate\.rank[\s\S]*order by random\(\)/i,
  );
  expect(randomizedLuckyDrawMigration).toMatch(
    /create or replace function public\.draw_next_lucky_prize\(\)/i,
  );
  expect(randomizedLuckyDrawMigration).toMatch(
    /grant execute on function public\.draw_next_lucky_prize\(\) to service_role/i,
  );
});
```

- [ ] **Step 2: Run the migration test and verify it fails**

Run: `pnpm exec vitest run src/lib/database-migration.test.ts -t "randomizes the next pending prize rank"`

Expected: FAIL because the new migration file does not exist yet.

- [ ] **Step 3: Create the idempotent RPC replacement migration**

Create the migration with the full function definition below. It preserves the advisory lock, eligibility rules, no-repeat rule, and service-role-only execution from the existing RPC, while changing only the pending-rank ordering:

```sql
create or replace function public.draw_next_lucky_prize()
returns public.lucky_draw_results
language plpgsql
security definer
set search_path = public
as $$
declare
  next_rank smallint;
  selected_number smallint;
  inserted_result public.lucky_draw_results;
begin
  perform pg_advisory_xact_lock(hashtextextended('lucky-draw-next-prize', 0));

  select candidate.rank::smallint
    into next_rank
    from generate_series(1, 5) as candidate(rank)
   where not exists (
           select 1
             from public.lucky_draw_results as result
            where result.prize_rank = candidate.rank
         )
   order by random()
   limit 1;

  if next_rank is null then
    raise exception 'ALL_PRIZES_DRAWN' using errcode = 'P0001';
  end if;

  select owned.number
    into selected_number
    from (
      select u.number::smallint as number,
             count(distinct assignment.guest_id)::integer as owner_count
        from public.lucky_number_assignments as assignment
        cross join lateral unnest(assignment.numbers) as u(number)
       group by u.number
    ) as owned
   where not exists (
           select 1
             from public.lucky_draw_results as result
            where result.winning_number = owned.number
         )
     and case
           when next_rank = 1 then owned.owner_count = 1
           else owned.owner_count <= next_rank
         end
   order by random()
   limit 1;

  if selected_number is null then
    raise exception 'NO_ELIGIBLE_LUCKY_NUMBER' using errcode = 'P0001';
  end if;

  insert into public.lucky_draw_results (prize_rank, winning_number)
  values (next_rank, selected_number)
  returning * into inserted_result;

  return inserted_result;
end;
$$;

revoke execute on function public.draw_next_lucky_prize() from public, anon, authenticated;
grant execute on function public.draw_next_lucky_prize() to service_role;
```

- [ ] **Step 4: Run all migration tests**

Run: `pnpm exec vitest run src/lib/database-migration.test.ts`

Expected: PASS. Do not run this migration against any database from the coding workspace; the organizer will apply it to the verified Supabase project separately.

- [ ] **Step 5: Commit the migration as one working unit**

```bash
git add supabase/migrations/202609080003_randomize_lucky_prize_order.sql src/lib/database-migration.test.ts
git commit -m "feat: randomize production lucky prize order"
```

### Task 3: Add editable demo prize content

**Files:**
- Modify: `src/data/draw-prizes.ts:1-12`
- Modify: `src/components/draw/public-draw-page.test.tsx:6-18, 70-85`
- Modify: `src/components/admin/admin-dashboard.test.tsx:100-140`

**Interfaces:**
- Consumes the existing `DRAW_PRIZES` tuple and `reward?: string` mapping.
- Produces five visible placeholder reward descriptions without changing the persisted database shape.

- [ ] **Step 1: Update the public test fixture to require all five reward descriptions**

Change `PENDING_DRAWS` so every prize has an explicit demo `reward`, then add assertions for the five exact labels in the existing pending-prizes test:

```ts
expect(screen.getByText("Quà tặng đặc biệt · Nội dung sẽ cập nhật")).toBeInTheDocument();
expect(screen.getByText("Voucher mua sắm · Demo")).toBeInTheDocument();
expect(screen.getByText("Bộ quà EcoBadminton · Demo")).toBeInTheDocument();
expect(screen.getByText("Áo / phụ kiện CLB · Demo")).toBeInTheDocument();
expect(screen.getByText("Quà vui cuối chương trình · Demo")).toBeInTheDocument();
```

- [ ] **Step 2: Run the focused public test and verify it fails**

Run: `pnpm exec vitest run src/components/draw/public-draw-page.test.tsx -t "reward details"`

Expected: FAIL because only the current fifth-prize demo text exists.

- [ ] **Step 3: Replace the demo reward values in the centralized config**

Use these temporary values in `DRAW_PRIZES`:

```ts
export const DRAW_PRIZES = [
  {
    rank: 1,
    key: "special",
    label: "Giải đặc biệt",
    reward: "Quà tặng đặc biệt · Nội dung sẽ cập nhật",
  },
  {
    rank: 2,
    key: "second",
    label: "Giải nhì",
    reward: "Voucher mua sắm · Demo",
  },
  {
    rank: 3,
    key: "third",
    label: "Giải ba",
    reward: "Bộ quà EcoBadminton · Demo",
  },
  {
    rank: 4,
    key: "fourth",
    label: "Giải tư",
    reward: "Áo / phụ kiện CLB · Demo",
  },
  {
    rank: 5,
    key: "fifth",
    label: "Giải năm",
    reward: "Quà vui cuối chương trình · Demo",
  },
] as const;
```

- [ ] **Step 4: Update admin fixture expectations and run focused tests**

Make the admin `DRAW_STATE` fixture use the same reward values, then run:

`pnpm exec vitest run src/components/draw/public-draw-page.test.tsx src/components/admin/admin-dashboard.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit the prize configuration**

```bash
git add src/data/draw-prizes.ts src/components/draw/public-draw-page.test.tsx src/components/admin/admin-dashboard.test.tsx
git commit -m "feat: add editable lucky draw prize details"
```

### Task 4: Build the public menu content, rules, and live progress

**Files:**
- Modify: `src/components/draw/public-draw-page.tsx:1-160`
- Modify: `src/app/quay-trung-thuong/page.tsx:11-24`
- Modify: `src/components/landing/hero.tsx:11-18`
- Test: `src/components/draw/public-draw-page.test.tsx:70-150`

**Interfaces:**
- Consumes `LuckyDrawState` from `GET /api/draws`, including `draw.result`, `draw.reward`, `draw.winners`, and `draw.winningNumber`.
- Produces accessible sections with stable anchors `#the-le`, `#giai-thuong`, and `#ket-qua`, without adding any mutation path to the browser.

- [ ] **Step 1: Add failing assertions for the public information sections**

Extend the pending-state test with these assertions:

```ts
expect(screen.getByRole("navigation", { name: "Điều hướng quay thưởng" })).toBeInTheDocument();
expect(screen.getByRole("link", { name: "Thể lệ" })).toHaveAttribute("href", "#the-le");
expect(screen.getByRole("heading", { name: "Thể lệ tham gia" })).toBeInTheDocument();
expect(screen.getByRole("heading", { name: "Giải thưởng" })).toBeInTheDocument();
expect(screen.getByText("Đã mở 0/5 giải")).toBeInTheDocument();
expect(screen.getByText(/admin là người duy nhất được quay/i)).toBeInTheDocument();
expect(screen.getByText(/tất cả khách có cùng số trúng/i)).toBeInTheDocument();
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `pnpm exec vitest run src/components/draw/public-draw-page.test.tsx -t "information sections"`

Expected: FAIL because the current page has no internal navigation, rules section, progress label, or public prize overview heading.

- [ ] **Step 3: Implement the public content in `PublicDrawPage`**

Add these pure helpers above the component:

```tsx
function drawProgressLabel(revealedCount: number) {
  if (revealedCount === 0) return "Chưa bắt đầu";
  if (revealedCount === 5) return "Đã hoàn tất";
  return "Đang diễn ra";
}

const RULES = [
  "Chỉ khách đã xác nhận tham dự mới được tham gia quay thưởng.",
  "Mỗi khách tham dự nhận 5 số may mắn khác nhau trong khoảng 00–99.",
  "Mỗi lượt, admin sẽ quay ngẫu nhiên một giải chưa được mở.",
  "Mỗi hạng giải chỉ được quay một lần và số trúng không lặp lại.",
  "Tất cả khách sở hữu số trúng sẽ nhận hạng giải tương ứng.",
  "Kết quả đã công bố trên trang này là kết quả chính thức.",
];
```

Render the following structure inside the existing section shell:

```tsx
<nav aria-label="Điều hướng quay thưởng" className="draw-anchor-nav">
  <a href="#the-le">Thể lệ</a>
  <a href="#giai-thuong">Giải thưởng</a>
  <a href="#ket-qua">Kết quả</a>
</nav>
<div className="draw-page-intro">
  <div>
    <span className="eyebrow">Sân khấu may mắn · Admin điều khiển</span>
    <h1 className="font-display" id="draw-page-title">Quay trúng thưởng</h1>
  </div>
  <p>Cùng theo dõi năm lượt quay và tìm con số may mắn của mình.</p>
</div>
<div className="draw-progress" aria-label={`Tiến trình quay: ${revealedCount} trên 5 giải`}>
  <strong>Đã mở {revealedCount}/5 giải</strong>
  <span>{drawProgressLabel(revealedCount)}</span>
</div>
<section id="the-le" className="draw-info-block" aria-labelledby="draw-rules-title">
  <span className="eyebrow">Minh bạch từ lượt đầu tiên</span>
  <h2 className="font-display" id="draw-rules-title">Thể lệ tham gia</h2>
  <ol>{RULES.map((rule) => <li key={rule}>{rule}</li>)}</ol>
  <p className="draw-info-note">Giải thưởng hiện đang là nội dung demo và sẽ được ban tổ chức cập nhật.</p>
</section>
<section id="giai-thuong" className="draw-info-block" aria-labelledby="draw-prizes-title">
  <span className="eyebrow">Năm cơ hội</span>
  <h2 className="font-display" id="draw-prizes-title">Giải thưởng</h2>
  <p>Hạng giải sẽ được hệ thống chọn ngẫu nhiên ở mỗi lượt quay.</p>
</section>
<div id="ket-qua" className="draw-results-heading">
  <span className="eyebrow">Cập nhật trực tiếp</span>
  <h2 className="font-display">Kết quả quay</h2>
</div>
```

Keep the existing result cards underneath this content, add `aria-label` progress text, and preserve the existing loading/stale polling behavior. Ensure the public page never renders admin controls.

- [ ] **Step 4: Add the same public label to the home navigation and page header**

Keep the existing `/quay-trung-thuong` target, use the visible label `Quay trúng thưởng`, add `aria-current="page"` to the page's navigation link only if a navigation link is added there, and keep the existing home link keyboard accessible.

- [ ] **Step 5: Run public-page tests and verify they pass**

Run: `pnpm exec vitest run src/components/draw/public-draw-page.test.tsx`

Expected: PASS for initial load, rules/prizes/progress, revealed winners, polling failure recovery, visibility pause, and unmount cleanup.

- [ ] **Step 6: Commit the public content unit**

```bash
git add src/components/draw/public-draw-page.tsx src/app/quay-trung-thuong/page.tsx src/components/landing/hero.tsx src/components/draw/public-draw-page.test.tsx
git commit -m "feat: explain public lucky draw rules and results"
```

### Task 5: Style the public draw information hierarchy responsively

**Files:**
- Modify: `src/app/globals.css:1456-1612, 2696-2720`

**Interfaces:**
- Consumes the class names from `PublicDrawPage`.
- Produces a desktop two-column information layout and a single-column mobile layout using existing navy, ivory, cobalt, lime, and red result accents.

- [ ] **Step 1: Add styles for the internal navigation, progress, info blocks, and result heading**

Append the following rules near the existing draw styles:

```css
.draw-anchor-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem 1.25rem;
  margin-bottom: 2rem;
  padding-bottom: 0.85rem;
  border-bottom: 1px solid var(--border);
}

.draw-anchor-nav a {
  color: var(--navy-muted);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.draw-progress {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 3rem;
  padding: 1.1rem 1.25rem;
  border: 1px solid var(--primary);
  background: var(--primary);
  color: var(--white);
}

.draw-progress strong {
  font-family: var(--font-display-face), serif;
  font-size: clamp(1.7rem, 4vw, 3rem);
  font-weight: 500;
  line-height: 0.9;
}

.draw-progress span {
  color: var(--lime);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.draw-info-block {
  display: grid;
  grid-template-columns: minmax(0, 0.4fr) minmax(0, 1fr);
  gap: 1rem 3rem;
  margin-bottom: 3rem;
  padding: 2rem 0;
  border-top: 1px solid var(--border);
}

.draw-info-block h2,
.draw-results-heading h2 {
  margin: 0;
  font-size: clamp(2rem, 5vw, 4rem);
  font-weight: 500;
  line-height: 0.9;
}

.draw-info-block ol {
  display: grid;
  gap: 0.8rem;
  margin: 0;
  padding-left: 1.25rem;
  color: var(--navy-muted);
  font-size: 0.9rem;
  line-height: 1.65;
}

.draw-info-block li::marker {
  color: var(--primary);
  font-weight: 800;
}

.draw-info-note {
  grid-column: 2;
  margin: 0.25rem 0 0;
  color: var(--navy-muted);
  font-size: 0.78rem;
  line-height: 1.5;
}

.draw-results-heading {
  display: grid;
  gap: 0.55rem;
  margin: 4rem 0 1.5rem;
}
```

- [ ] **Step 2: Add mobile overrides**

Inside the existing mobile media query, add:

```css
.draw-progress {
  align-items: flex-start;
  flex-direction: column;
  gap: 0.65rem;
}

.draw-info-block {
  grid-template-columns: 1fr;
  gap: 1rem;
  margin-bottom: 2rem;
}

.draw-info-note {
  grid-column: auto;
}
```

- [ ] **Step 3: Run lint and the public component tests**

Run: `pnpm exec vitest run src/components/draw/public-draw-page.test.tsx && pnpm lint`

Expected: PASS with no lint errors.

- [ ] **Step 4: Commit the responsive styling unit**

```bash
git add src/app/globals.css
git commit -m "feat: style public lucky draw information page"
```

### Task 6: Align admin controls and browser coverage with random prize order

**Files:**
- Modify: `src/components/admin/admin-dashboard.tsx:768-912`
- Modify: `src/components/admin/admin-dashboard.test.tsx:860-930`
- Modify: `tests/e2e/draw.spec.ts:35-112`

**Interfaces:**
- Consumes the unchanged protected `/api/admin/draws/next` endpoint and `LuckyDrawState`.
- Produces admin copy that does not claim a specific next prize before the server randomly selects it, plus E2E assertions that locate the revealed card by number rather than by rank order.

- [ ] **Step 1: Update the admin test to require generic random-draw copy**

Change the button assertions from `/quay giải đặc biệt/i` to:

```ts
expect(
  await screen.findByRole("button", { name: "Quay giải ngẫu nhiên" }),
).toBeInTheDocument();
```

Keep the existing disabled-while-drawing assertion and successful refresh assertion, but assert that the results card shows the returned result label rather than assuming rank 1 is always drawn first.

- [ ] **Step 2: Run the focused admin tests and verify they fail**

Run: `pnpm exec vitest run src/components/admin/admin-dashboard.test.tsx -t "draw"`

Expected: FAIL because the admin currently renders the first pending rank and labels the button with that rank.

- [ ] **Step 3: Update admin rendering**

Replace the `nextDraw` lookup with a pending count:

```ts
const pendingDrawCount =
  drawState?.draws.filter((draw) => draw.result === null).length ?? 0;
```

Render:

```tsx
<h3 className="font-display" id="admin-draw-title">
  {pendingDrawCount > 0
    ? `Còn ${pendingDrawCount} giải chờ quay`
    : "Đã hoàn tất năm lượt quay"}
</h3>
<p>
  {pendingDrawCount > 0
    ? "Mỗi lần bấm, hệ thống sẽ ngẫu nhiên chọn một hạng giải chưa mở và một số hợp lệ."
    : "Tất cả kết quả đã được mở cho khách mời theo dõi."}
</p>
<button
  className="button-primary"
  disabled={pendingDrawCount === 0 || isDrawing}
  onClick={() => void drawNextPrize()}
  type="button"
>
  {isDrawing
    ? "Đang quay…"
    : pendingDrawCount > 0
      ? "Quay giải ngẫu nhiên"
      : "Đã hoàn tất"}
</button>
```

Do not alter the protected fetch or error handling.

- [ ] **Step 4: Make E2E result lookup independent of prize rank order**

Update `expectPublicDrawToReveal` to find a card containing the expected number and winner:

```ts
const revealedCard = page
  .locator(".draw-card.is-revealed")
  .filter({ hasText: expectedNumber })
  .filter({ hasText: expectedWinner });
await expect(revealedCard).toHaveCount(1);
await expect(revealedCard.locator(".draw-winning-number")).toHaveText(expectedNumber);
```

Update the admin button selector to `/Quay giải ngẫu nhiên/` and keep the five-unique-number and public polling assertions.

- [ ] **Step 5: Run focused admin and E2E tests**

Run: `pnpm exec vitest run src/components/admin/admin-dashboard.test.tsx -t "draw"`

Expected: PASS.

Run: `pnpm exec playwright test tests/e2e/draw.spec.ts`

Expected: PASS with all five draws completed, admin-only mutation preserved, and public results revealed in random prize order.

- [ ] **Step 6: Commit the admin and E2E alignment unit**

```bash
git add src/components/admin/admin-dashboard.tsx src/components/admin/admin-dashboard.test.tsx tests/e2e/draw.spec.ts
git commit -m "feat: align admin lucky draw with random prize order"
```

### Task 7: Run the complete verification suite

**Files:**
- No source changes unless a verification failure identifies a specific regression.

- [ ] **Step 1: Run focused repository, migration, public, and admin tests**

Run: `pnpm exec vitest run src/lib/lucky-draw-repository.test.ts src/lib/database-migration.test.ts src/components/draw/public-draw-page.test.tsx src/components/admin/admin-dashboard.test.tsx`

Expected: PASS.

- [ ] **Step 2: Run project lint and typecheck**

Run: `pnpm lint && pnpm typecheck`

Expected: PASS with zero errors.

- [ ] **Step 3: Run the complete Vitest suite**

Run: `pnpm test`

Expected: PASS.

- [ ] **Step 4: Run the lucky-draw E2E flow**

Run: `pnpm exec playwright test tests/e2e/draw.spec.ts`

Expected: PASS on desktop and mobile projects.

- [ ] **Step 5: Run the production build and privacy scan**

Run: `pnpm build`

Expected: PASS, including the existing client-bundle privacy check.

- [ ] **Step 6: Review the final diff without touching unrelated changes**

Run: `git diff --check && git status --short`

Expected: no whitespace errors; only the planned feature files plus the already-existing unrelated worktree changes are present.
