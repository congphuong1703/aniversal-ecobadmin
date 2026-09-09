# Story Invite and Lucky Draw Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the story invitation copy and remove selected public draw labels/rules while preserving the existing image, navigation, and draw behavior.

**Architecture:** Keep the existing `StoryInvite` markup boundary and invitation image path. Keep the public draw component structure and remove only the requested static text nodes. Add focused DOM regression coverage; no API, database, session, or draw-selection changes are needed.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, Playwright, CSS.

## Global Constraints

- Keep `/story/invite-ecotek.jpg` unchanged.
- Render `Đặc biệt:` as emphasized text, not literal Markdown markers.
- Keep `nhấn vào đây` as plain text because no URL destination was supplied.
- Remove only the requested draw labels/rule; retain main headings and result/prize cards.
- Do not modify `next-env.d.ts`; it contains an existing generated working-tree change.
- Do not run database commands.

---

### Task 1: Add failing content tests

**Files:**
- Create: `src/components/landing/story.test.tsx`
- Modify: `src/components/draw/public-draw-page.test.tsx`

**Interfaces:**
- Consumes: `Story` and `PublicDrawPage` rendered with their existing fixtures.
- Produces: Regression assertions for the requested copy and removal behavior.

- [x] **Step 1: Add the story invitation test before changing production copy.**

  Render `<Story />` and assert the new heading, both new paragraphs, the emphasized `Đặc biệt:` text, absence of all three fee labels and the old promise, and the invitation image alt text.

- [x] **Step 2: Add public draw absence assertions before changing production copy.**

  In the existing information-section test, assert these are absent:

  ```tsx
  expect(screen.queryByText("Minh bạch từ lượt đầu tiên")).not.toBeInTheDocument();
  expect(screen.queryByText("Năm cơ hội")).not.toBeInTheDocument();
  expect(screen.queryByText("Đối chiếu thật dễ")).not.toBeInTheDocument();
  expect(
    screen.queryByText("Chỉ khách đã xác nhận tham dự mới được tham gia quay thưởng."),
  ).not.toBeInTheDocument();
  ```

- [x] **Step 3: Run the focused tests and verify they fail for the old copy.**

  Run `npm test -- src/components/landing/story.test.tsx src/components/draw/public-draw-page.test.tsx`.

  Expected: the new story test fails because the old invitation title/list/body are still rendered, and the draw test fails because the four requested nodes still exist.

### Task 2: Update invitation and draw content

**Files:**
- Modify: `src/components/landing/story.tsx:418-450`
- Modify: `src/components/draw/public-draw-page.tsx:11-205`

**Interfaces:**
- Consumes: Existing story image and draw page layout.
- Produces: Approved user-facing copy with unchanged image and behavior.

- [x] **Step 1: Replace the story invitation copy without changing the image element.**

  Keep the `Image` with `src="/story/invite-ecotek.jpg"`. Replace the content block with a heading `Thêm một người bạn, thêm một trận cầu`, a paragraph `Ở EcoBadminton, chúng mình luôn chào đón các thành viên mới.`, and a second paragraph whose first child is `<strong>Đặc biệt:</strong>` followed by `Với thành viên từ EcoRun, chúng mình tặng bạn gói dùng thử đến hết 30/9 này. Hãy nhanh tay nhấn vào đây để trải nghiệm ngay thôi!`.

- [x] **Step 2: Remove only the requested public draw text nodes.**

  Remove the first rule from `RULES`, remove the three eyebrow spans `Minh bạch từ lượt đầu tiên`, `Năm cơ hội`, and `Đối chiếu thật dễ`, and retain the section headings and all prize/result markup.

- [x] **Step 3: Run the focused tests and verify they pass.**

  Run `npm test -- src/components/landing/story.test.tsx src/components/draw/public-draw-page.test.tsx`.

  Expected: all focused tests pass.

### Task 3: Verify and deliver on main

**Files:**
- Modify: `docs/superpowers/plans/2026-09-09-story-invite-content.md` to mark completed steps

**Interfaces:**
- Consumes: Updated story and public draw content.
- Produces: Verified commit on `main` and pushed `origin/main`.

- [x] **Step 1: Run verification.**

  Run `npm test`, `npm run lint`, `npm run typecheck`, `npm run test:e2e -- tests/e2e/draw.spec.ts`, and `npm run build`. Confirm each exits with code 0. Run `git diff --check` and verify `next-env.d.ts` remains unstaged.

- [x] **Step 2: Commit only the requested files and new documentation.**

  Stage the story/draw source and tests plus this spec and plan; do not stage `next-env.d.ts`. Commit with:

  ```bash
  git commit -m "feat: refresh story invite content"
  ```

- [x] **Step 3: Fast-forward main and push it.**

  Switch to `main`, fast-forward it to `feat/update-lucky-draw-copy`, and run:

  ```bash
  git push origin main
  ```

  Confirm `origin/main` points to the new commit.
