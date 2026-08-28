# Story Header Primary Color Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the `/story` page header using the existing primary brand color.

**Architecture:** Extend the existing story-page E2E coverage with a computed-style assertion, then update only the `.story-page-header` background declaration. The existing `--primary` design token remains the single source of truth, and all story header structure and responsive rules stay unchanged.

**Tech Stack:** Next.js, React, TypeScript, Tailwind CSS import layer, Playwright.

## Global Constraints

- Change only the background color of `.story-page-header`.
- Preserve the existing logo, back link, layout, responsive behavior, and focus styles.
- Do not change the home page hero, admin header, or story content.
- Use the existing `--primary` CSS variable directly in `src/app/globals.css`.

---

### Task 1: Apply and verify the story header color

**Files:**
- Modify: `tests/e2e/story.spec.ts`
- Modify: `src/app/globals.css:389-392`

**Interfaces:**
- Consumes: The existing `.story-page-header` selector and `--primary` CSS variable.
- Produces: A `/story` header whose computed background color is `rgb(1, 45, 204)` and a regression assertion covering that behavior.

- [ ] **Step 1: Add the failing E2E assertion**

In `tests/e2e/story.spec.ts`, add this test before the existing image-ratio test:

```ts
test("keeps the story header in the primary brand color", async ({ page }) => {
  await page.goto("/story");

  await expect(page.locator(".story-page-header")).toHaveCSS(
    "background-color",
    "rgb(1, 45, 204)",
  );
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `pnpm exec playwright test tests/e2e/story.spec.ts --project=desktop-chromium -g "keeps the story header"`

Expected: FAIL because `.story-page-header` currently computes to the navy color `rgb(16, 33, 63)`.

- [ ] **Step 3: Change the header background to the primary token**

In `src/app/globals.css`, change only this declaration:

```css
.story-page-header {
  position: relative;
  z-index: 2;
  background: var(--primary);
  color: var(--white);
}
```

- [ ] **Step 4: Run the focused E2E test and verify it passes**

Run: `pnpm exec playwright test tests/e2e/story.spec.ts --project=desktop-chromium -g "keeps the story header"`

Expected: PASS.

- [ ] **Step 5: Run the full story-page E2E test and project checks**

Run: `pnpm exec playwright test tests/e2e/story.spec.ts`

Expected: PASS for the desktop and mobile story-page coverage.

Run: `pnpm lint`

Expected: PASS with no lint errors.

Run: `pnpm exec tsc --noEmit`

Expected: PASS with no TypeScript errors.

- [ ] **Step 6: Review the final diff**

Run: `git diff -- tests/e2e/story.spec.ts src/app/globals.css`

Expected: The diff contains only the new header-color assertion and the single `.story-page-header` background-token change.
