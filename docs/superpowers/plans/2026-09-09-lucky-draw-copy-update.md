# Lucky Draw Copy and Header Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the public lucky-draw wording, reward placeholders, and internal header consistency while preserving existing draw behavior and technical routes.

**Architecture:** Keep the current `DRAW_PRIZES` configuration as the single source for reward labels. Keep the existing `/quay-trung-thuong` page and `PublicDrawPage`; replace only their user-facing copy and use the story page's existing back-link pattern. No database, API, session, or draw-selection changes are required.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, Playwright, CSS.

## Global Constraints

- Keep visible copy in Vietnamese and use `Ban tổ chức` instead of `Admin`.
- Keep the home-page `Quay trúng thưởng` menu item unchanged.
- Keep `/api/admin/*`, admin session identifiers, and draw logic unchanged.
- Set all five public reward values to exactly `Công bố sau`.
- Preserve mobile behavior with no horizontal overflow.
- Do not run database commands; this is a copy and presentation change only.

---

### Task 1: Lock the approved public copy with failing tests

**Files:**
- Modify: `src/components/draw/public-draw-page.test.tsx`
- Modify: `tests/e2e/draw.spec.ts`
- Modify: `src/data/draw-prizes.ts` only after the red test is confirmed

**Interfaces:**
- Consumes: `PublicDrawPage`, `DRAW_PRIZES`, and the pending draw fixture.
- Produces: Regression coverage for the approved public text and reward values.

- [x] **Step 1: Update the component test expectations before production code.**

  In `src/components/draw/public-draw-page.test.tsx`, change the pending fixture reward values to `Công bố sau`, then change the assertions to:

  ```tsx
  expect(screen.getByText(/trong thẻ xác nhận thành công.*5 số may mắn/i)).toBeInTheDocument();
  expect(screen.queryByText(/thẻ xác nhận RSVP thành công/i)).not.toBeInTheDocument();
  expect(screen.getByText(/ban tổ chức là người duy nhất được quay/i)).toBeInTheDocument();
  expect(screen.queryByText(/admin là người duy nhất được quay/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/Cùng theo dõi năm lượt quay/i)).not.toBeInTheDocument();
  expect(screen.getAllByText("Công bố sau")).toHaveLength(5);
  expect(screen.queryByText(/· Demo|nội dung sẽ cập nhật/i)).not.toBeInTheDocument();
  ```

  Keep the existing heading and navigation assertions. The route-level header is covered by the E2E test because this component does not render the route header.

  In `tests/e2e/draw.spec.ts`, immediately after opening `/quay-trung-thuong`, add:

  ```ts
  await expect(publicPage.getByRole("link", { name: "Quay lại" })).toHaveAttribute(
    "href",
    "/#top",
  );
  await expect(
    publicPage.getByRole("link", { name: "Quay trúng thưởng" }),
  ).toHaveCount(0);
  ```

- [x] **Step 2: Run the focused test and verify it fails for the old copy.**

  Run:

  ```bash
  npm test -- src/components/draw/public-draw-page.test.tsx
  ```

  Expected: FAIL because the current component still renders `Admin`, `RSVP`, the removed introduction sentence, and demo reward values.

### Task 2: Apply the public copy and header updates

**Files:**
- Modify: `src/data/draw-prizes.ts:1-32`
- Modify: `src/components/draw/public-draw-page.tsx:11-210`
- Modify: `src/app/quay-trung-thuong/page.tsx:14-30`
- Modify: `src/app/globals.css:1568-1574`

**Interfaces:**
- Consumes: The existing public draw state and story-page header classes.
- Produces: Approved public copy, `Công bố sau` reward metadata, and a consistent back-link header.

- [x] **Step 1: Replace all reward descriptions with the approved placeholder.**

  In `src/data/draw-prizes.ts`, set each of the five `reward` properties to:

  ```ts
  reward: "Công bố sau",
  ```

- [x] **Step 2: Update the public draw page wording.**

  In `src/components/draw/public-draw-page.tsx`:

  - Change the rule to `Mỗi lượt, ban tổ chức sẽ quay ngẫu nhiên một giải chưa được mở.`
  - Change the page eyebrow to `Sân khấu may mắn · Ban tổ chức điều khiển`.
  - Remove the introduction paragraph containing `Cùng theo dõi năm lượt quay và tìm con số may mắn của mình.`.
  - Change the note to `Ban tổ chức là người duy nhất được quay thưởng; tất cả khách có cùng số trúng sẽ nhận hạng giải tương ứng.`
  - Change the checking copy to `Trong thẻ xác nhận thành công, hãy xem 5 số may mắn của bạn; sau đó so sánh từng số với các kết quả đã công bố bên dưới.`

- [x] **Step 3: Match the draw route header to the story route.**

  In `src/app/quay-trung-thuong/page.tsx`, keep the existing `.story-page-header` and `.story-page-header-inner` structure, keep the brand, remove the nested `hero-nav-links` with its self-link, and render exactly one link:

  ```tsx
  <Link className="story-page-back" href="/#top">
    <span aria-hidden="true">←</span> Quay lại
  </Link>
  ```

  This leaves the home-page `Quay trúng thưởng` navigation entry untouched.

- [x] **Step 4: Keep section headings on one line without mobile overflow.**

  In `src/app/globals.css`, add `white-space: nowrap;` to the existing `.draw-info-block h2, .draw-results-heading h2` rule. Add `overflow-wrap: normal;` only if required by the existing typography; do not force the large page title to remain unwrapped on narrow screens.

- [x] **Step 5: Run the focused component test and verify it passes.**

  Run:

  ```bash
  npm test -- src/components/draw/public-draw-page.test.tsx
  ```

  Expected: PASS with all public draw assertions green.

### Task 3: Verify the complete change

**Files:**
- Modify: `src/components/draw/public-draw-page.test.tsx` if test wording needs exactness adjustments only

**Interfaces:**
- Consumes: Updated public copy and existing draw flow.
- Produces: Verified working tree ready for commit.

- [x] **Step 1: Run the full unit/integration test suite.**

  Run `npm test`.

  Expected: all tests pass with zero failures.

- [x] **Step 2: Run static checks.**

  Run `npm run lint && npm run typecheck`.

  Expected: both commands exit with code 0.

- [x] **Step 3: Run the relevant end-to-end draw flow.**

  Run `npm run test:e2e -- tests/e2e/draw.spec.ts`.

  Expected: the admin-only draw flow and public result reveal pass; no API behavior changes are introduced.

- [x] **Step 4: Run the production build and privacy check.**

  Run `npm run build`.

  Expected: the Next.js build and client privacy scan exit with code 0.

- [x] **Step 5: Inspect the final diff and commit the complete unit.**

  Run `git diff --check` and `git status --short`, then commit only the intended source, test, and approved planning documents:

  ```bash
  git add src/data/draw-prizes.ts src/components/draw/public-draw-page.tsx src/components/draw/public-draw-page.test.tsx src/app/quay-trung-thuong/page.tsx src/app/globals.css docs/superpowers/specs/2026-09-09-lucky-draw-copy-update-design.md docs/superpowers/plans/2026-09-09-lucky-draw-copy-update.md
  git commit -m "feat: update lucky draw messaging"
  ```

- [x] **Step 6: Push the feature branch.**

  Run:

  ```bash
  git push -u origin feat/update-lucky-draw-copy
  ```

  Expected: the branch is available on `origin` and the command exits with code 0.
