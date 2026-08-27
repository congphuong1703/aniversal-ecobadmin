# Story Image Resizing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every story photo responsive while preserving its complete original content and aspect ratio.

**Architecture:** Store intrinsic image dimensions alongside story metadata, render `next/image` without `fill`, and let CSS constrain width and height without cropping. Use group-aware responsive source sizes so single-image rows can use the full shell. A browser regression test verifies rendered and natural aspect ratios match and wrappers do not clip images.

**Tech Stack:** Next.js 16, React 19, CSS, Playwright

## Global Constraints

- Do not change the intentional cropped avatar treatment in RSVP.
- Do not reorder, replace, or edit source images.
- Preserve desktop and mobile responsiveness without horizontal overflow.

---

### Task 1: Preserve story image aspect ratios

**Files:**
- Create: `tests/e2e/story.spec.ts`
- Modify: `src/components/landing/story.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: Story images in `public/images`.
- Produces: `StoryImage.width` and `StoryImage.height` metadata used by `next/image`.

- [x] **Step 1: Write the failing browser regression test**

Open `/story`, wait for all `.photo-grid-item img` elements to load, and assert every rendered width/height ratio is within `0.01` of its natural width/height ratio. Confirm every image remains inside its wrapper, the single landscape team photo uses at least 95% of its row, and there is no horizontal overflow.

- [x] **Step 2: Run the focused test and verify it fails**

Run: `pnpm exec playwright test tests/e2e/story.spec.ts --project=desktop-chromium`

Expected: FAIL because fixed-ratio wrappers and `object-fit: cover` crop at least one image.

- [x] **Step 3: Add intrinsic dimensions and remove fill rendering**

Add exact `width` and `height` values for each source image in `StoryImage`, pass them to `Image`, and add a `story-photo` class.

- [x] **Step 4: Make the grid content-sized**

Remove fixed aspect ratios and `object-fit: cover` from story photos. Set images to `display: block`, `width: auto`, `height: auto`, `max-width: 100%`, and a viewport-aware `max-height`; center them inside wrappers and align grid items to the start.

- [x] **Step 5: Verify focused and project checks**

Run:

```bash
pnpm exec playwright test tests/e2e/story.spec.ts
pnpm lint
pnpm typecheck
pnpm build
```

Expected: all commands exit successfully.
