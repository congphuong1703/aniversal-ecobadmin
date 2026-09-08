# Achievement Card EcoRun Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Update the anniversary achievement card to display only `1` and acknowledge EcoRun as a competitor, friend, and diamond sponsor.

**Architecture:** Keep the existing `AchievementSlide` component and layout unchanged. Remove only the decorative supporting label and add the approved EcoRun sentence as a regular paragraph in the existing copy column.

**Tech Stack:** Next.js, React, TypeScript, Vitest, ESLint.

## Global Constraints

- Keep the visual mark's number as exactly `1`.
- Remove the supporting label `năm cùng nhau` from the visual mark.
- Add exactly: `EcoRun — một đối thủ, cũng là một người bạn đồng hành và là nhà tài trợ kim cương cho dịp kỷ niệm này.`
- Preserve the existing layout, styling classes, animation classes, heading, date eyebrow, and other copy.
- Do not change database files, assets, routes, or unrelated story/RSVP behavior.
- Work on a feature branch, merge into `main`, and push `main` to `origin` only after verification passes.

---

### Task 1: Update the achievement card copy

**Files:**
- Modify: `src/components/landing/achievement-slide.tsx:8-25`

**Interfaces:**
- Consumes: the existing `AchievementSlide` markup and CSS classes.
- Produces: a visual mark containing only `1` and a readable EcoRun acknowledgement paragraph.

- [ ] **Step 1: Create a feature branch before editing**

Run:

```bash
git switch -c feat/achievement-slide-ecorun
```

Expected: the current checkout is on `feat/achievement-slide-ecorun`.

- [ ] **Step 2: Remove the supporting label**

In `src/components/landing/achievement-slide.tsx`, change:

```tsx
<div className="achievement-slide-mark reveal" aria-hidden="true">
  <strong>1</strong>
  <span>năm cùng nhau</span>
</div>
```

to:

```tsx
<div className="achievement-slide-mark reveal" aria-hidden="true">
  <strong>1</strong>
</div>
```

- [ ] **Step 3: Add the approved EcoRun paragraph**

Immediately after the existing `achievement-slide-bridge` paragraph, add:

```tsx
<p className="achievement-slide-sponsor">
  EcoRun — một đối thủ, cũng là một người bạn đồng hành và là nhà tài trợ kim cương cho dịp kỷ niệm này.
</p>
```

Keep the paragraph inside `achievement-slide-copy` and preserve all existing copy.

- [ ] **Step 4: Verify the focused source requirements**

Run:

```bash
rg -n -C 3 "achievement-slide-mark|năm cùng nhau|EcoRun|achievement-slide-sponsor" src/components/landing/achievement-slide.tsx
```

Expected: the source contains the standalone `1`, contains no `năm cùng nhau`, and contains the exact approved EcoRun sentence.

### Task 2: Run project verification

**Files:**
- Verify: `src/components/landing/achievement-slide.tsx`

- [ ] **Step 1: Run the relevant test suite**

Run:

```bash
pnpm test
```

Expected: Vitest exits with status `0` and no failed tests.

- [ ] **Step 2: Run typecheck and lint**

Run:

```bash
pnpm run typecheck
pnpm run lint
```

Expected: both commands exit with status `0`.

- [ ] **Step 3: Review the diff**

Run:

```bash
git diff --check
git diff -- src/components/landing/achievement-slide.tsx
git status --short
```

Expected: no whitespace errors; the component diff contains only the requested label removal and EcoRun paragraph; the design spec and implementation plan remain untracked until intentionally included.

### Task 3: Commit, merge into main, and push

**Files:**
- Commit: `src/components/landing/achievement-slide.tsx`
- Keep as documentation: `docs/superpowers/specs/2026-09-08-achievement-slide-ecorun-content-design.md`
- Keep as documentation: `docs/superpowers/plans/2026-09-08-achievement-slide-ecorun-content.md`

- [ ] **Step 1: Commit the completed feature branch**

Run:

```bash
git add src/components/landing/achievement-slide.tsx
git commit -m "feat: update achievement card with ecorun sponsor copy"
```

Expected: one complete feature commit is created on `feat/achievement-slide-ecorun`.

- [ ] **Step 2: Merge the feature into main**

Run:

```bash
git switch main
git merge --no-ff feat/achievement-slide-ecorun -m "merge: update achievement card"
```

Expected: merge succeeds without conflicts and `main` contains the feature commit.

- [ ] **Step 3: Re-run verification on merged main**

Run:

```bash
pnpm test
pnpm run typecheck
pnpm run lint
```

Expected: all commands exit with status `0` on the merged result.

- [ ] **Step 4: Push main to origin**

Run:

```bash
git push origin main
```

Expected: `origin/main` is updated with the merge commit.

- [ ] **Step 5: Confirm the final repository state**

Run:

```bash
git status --short
git branch --show-current
git log -3 --oneline
```

Expected: current branch is `main`, the requested code is present in the recent history, and no unintended tracked changes are present.
