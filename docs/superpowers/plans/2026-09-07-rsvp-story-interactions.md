# RSVP and Story Interaction Refinements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce the RSVP decline-button hover threshold to five interactions and make story galleries slower, accurately navigable, and viewable in an accessible image modal.

**Architecture:** Keep RSVP behavior local to `RsvpExperience`. Extend `StoryGallery` with a small slide-state model that separates visible image groups from indicator state, and reuse the existing `Modal` for image lightboxes. Keep styling in the existing global stylesheet and preserve the user's unrelated `achievement-slide.tsx` edits.

**Tech Stack:** Next.js 16, React 19, TypeScript, Vitest, Testing Library, Playwright, global CSS.

## Global Constraints

- The RSVP decline button unlocks after exactly `5` hover events.
- Story gallery auto-rotation interval is exactly `3000ms`.
- A nine-image mosaic exposes exactly two navigation indicators: images 1-5 and images 6-9.
- Opening an image modal pauses auto-rotation and closing it restores the gallery without changing its active state.
- The existing modal component remains the accessibility and close-behavior foundation.
- No database commands, schema changes, new dependencies, or asset changes.
- Preserve the existing uncommitted changes in `src/components/landing/achievement-slide.tsx`.

---

### Task 1: Reduce RSVP decline hover threshold

**Files:**
- Modify: `src/components/landing/rsvp-experience.tsx`
- Modify: `src/components/landing/rsvp-experience.test.tsx`
- Modify: `tests/e2e/rsvp.spec.ts`

**Interfaces:**
- Consumes: existing `declineHoverCount`, `DECLINE_OFFSETS`, and `DECLINE_HOVER_LIMIT` flow.
- Produces: the same RSVP submission behavior with `DECLINE_HOVER_LIMIT = 5`.

- [ ] **Step 1: Update the unit regression test to describe five hovers**

Change the existing test name to `moves the decline button five times before enabling it`, keep the first hover assertion, change the loop to four additional hovers, assert `aria-disabled="true"`, then trigger the fifth hover and assert `aria-disabled="false"`.

- [ ] **Step 2: Run the focused unit test and verify it fails for the old ten-hover implementation**

Run: `pnpm exec vitest run src/components/landing/rsvp-experience.test.tsx -t "moves the decline button five times"`

Expected: FAIL because the current constant still requires ten hover events.

- [ ] **Step 3: Change the production threshold**

In `src/components/landing/rsvp-experience.tsx`, change only the threshold constant:

```ts
const DECLINE_HOVER_LIMIT = 5;
```

Keep the existing clamping and offset-selection logic unchanged.

- [ ] **Step 4: Run the focused unit test and verify it passes**

Run: `pnpm exec vitest run src/components/landing/rsvp-experience.test.tsx -t "moves the decline button five times"`

Expected: PASS with one passing test.

- [ ] **Step 5: Update and run the end-to-end hover count**

In `tests/e2e/rsvp.spec.ts`, rename the test to say five times and remove one `await declineButton.hover()` call so the test performs exactly five hovers total. Run: `pnpm exec playwright test tests/e2e/rsvp.spec.ts -g "five times"`.

Expected: PASS in the configured browser projects.

### Task 2: Add story gallery state, timing, and lightbox tests

**Files:**
- Create: `src/components/landing/story-gallery.test.tsx`

**Interfaces:**
- Consumes: `StoryGallery`, `StoryGalleryImage`, the existing `Modal`, and the existing story gallery DOM classes.
- Produces: regression coverage for interval timing, navigation-state counts, image modal opening, modal closing, and rotation pause.

- [ ] **Step 1: Add a focused StoryGallery test fixture and fake-timer setup**

Create a test file with three image fixtures and a nine-image fixture. Use `beforeEach` to call `vi.useFakeTimers()` and `afterEach` to call `vi.useRealTimers()` and `cleanup()`. Render `StoryGallery` with `label="Cùng tiến bộ"` and query controls through `.story-gallery-controls button` and image-open buttons through their accessible names.

- [ ] **Step 2: Add the failing behavior tests**

The test file must cover these exact behaviors:

```tsx
it("rotates only after three seconds", () => {
  render(<StoryGallery images={THREE_IMAGES} label="Ảnh" layout="feature" />);

  const controls = () => document.querySelectorAll(".story-gallery-controls button");
  expect(controls()[0]).toHaveClass("is-active");
  vi.advanceTimersByTime(2999);
  expect(controls()[0]).toHaveClass("is-active");
  vi.advanceTimersByTime(1);
  expect(controls()[1]).toHaveClass("is-active");
});

it("renders one indicator per navigable mosaic group", () => {
  render(<StoryGallery images={NINE_IMAGES} label="Gắn kết" layout="mosaic" />);
  expect(document.querySelectorAll(".story-gallery-controls button")).toHaveLength(2);
});

it("opens the clicked visible image in a modal and closes it", async () => {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(<StoryGallery images={THREE_IMAGES} label="Ảnh" layout="feature" />);

  await user.click(screen.getByRole("button", { name: /Mở ảnh: Ảnh một/i }));
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(screen.getByRole("img", { name: "Ảnh một" })).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Đóng" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("pauses rotation while the image modal is open", async () => {
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(<StoryGallery images={THREE_IMAGES} label="Ảnh" layout="feature" />);
  await user.click(screen.getByRole("button", { name: /Mở ảnh: Ảnh một/i }));
  vi.advanceTimersByTime(6000);
  expect(document.querySelectorAll(".story-gallery-controls button")[0]).toHaveClass("is-active");
});
```

Run: `pnpm exec vitest run src/components/landing/story-gallery.test.tsx`

Expected: FAIL because the current gallery has a two-second interval, nine mosaic controls, and no image modal buttons.

### Task 3: Implement story gallery state and lightbox

**Files:**
- Modify: `src/components/landing/story-gallery.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `StoryGalleryImage`, `Modal`, and `getVisibleSlotCount`'s existing layout rules.
- Produces: accessible image buttons, `3000ms` rotation, accurate controls, and responsive lightbox presentation.

- [ ] **Step 1: Add the slide-state helpers and selected-image state**

In `story-gallery.tsx`, import `Modal`, add `useState<StoryGalleryImage | null>` for `selectedImage`, and replace the hard-coded interval with:

```ts
const ROTATION_MS = 3000;
```

Add a helper with this signature:

```ts
function getSlideStateCount(
  layout: StoryGalleryProps["layout"],
  imageCount: number,
): number;
```

It returns `0` for an empty gallery, `2` for a mosaic with more than five images, and `imageCount` for all other layouts so each possible image start position has one indicator.

- [ ] **Step 2: Pause the interval while the modal is open and derive the active state**

Use `isPaused || selectedImage !== null` in the interval guard. For mosaic galleries with more than five images, keep `activeIndex` as phase `0` or `1`; otherwise wrap it against `getSlideStateCount(layout, images.length)` so controls and rotation share one source of truth.

- [ ] **Step 3: Render only the actual navigation states**

Replace `images.map` for the controls with an array sized by `slideStateCount`. For a mosaic with more than five images, map control `0` to phase `0` and control `1` to phase `1`; for other layouts, map the control index directly to `activeIndex`. Use `aria-selected` and `is-active` from that same active state.

- [ ] **Step 4: Make each visible image open the existing modal**

Wrap each rendered `Image` in a full-size button inside its existing `figure`, with an explicit label of `Mở ảnh: ${image.alt}` and an `onClick` that calls `setSelectedImage(image)`. Render `Modal` after the gallery frame and controls only when `selectedImage` is non-null. Inside it, render the selected image using its intrinsic `width` and `height`, `alt`, and `className="story-gallery-modal-image"`; close it by setting `selectedImage` to `null`.

- [ ] **Step 5: Add lightbox CSS and image-button reset styles**

Add CSS that makes the image button fill its figure without changing the gallery layout, removes its default button chrome, and gives it a pointer cursor. Add a `.story-gallery-lightbox` wrapper with a white/ivory surface and a `.story-gallery-modal-image` rule with `display: block`, `max-width: 100%`, `max-height: calc(88vh - 6rem)`, `width: auto`, `height: auto`, and `object-fit: contain`.

- [ ] **Step 6: Run the StoryGallery tests and verify they pass**

Run: `pnpm exec vitest run src/components/landing/story-gallery.test.tsx`

Expected: PASS for timing, mosaic control count, modal open/close, and modal pause behavior.

### Task 4: Restore achievement heading contrast

**Files:**
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: existing `--white` color token and `.achievement-slide-copy h2` selector.
- Produces: readable achievement heading on the navy section.

- [ ] **Step 1: Add the minimal CSS fix**

Extend the existing selector with the explicit color:

```css
.achievement-slide-copy h2 {
  color: var(--white);
}
```

- [ ] **Step 2: Verify the final UI code paths**

Run: `pnpm test`, `pnpm run typecheck`, `pnpm run lint`, and `pnpm run build`.

Expected: all commands exit with status `0`; the build also completes the client-privacy check.

### Task 5: Review the complete diff without committing user work

**Files:**
- Review: `src/components/landing/rsvp-experience.tsx`
- Review: `src/components/landing/rsvp-experience.test.tsx`
- Review: `tests/e2e/rsvp.spec.ts`
- Review: `src/components/landing/story-gallery.tsx`
- Review: `src/components/landing/story-gallery.test.tsx`
- Review: `src/app/globals.css`
- Preserve: `src/components/landing/achievement-slide.tsx`

- [ ] **Step 1: Inspect status and diff**

Run: `git status --short` and `git diff -- src/components/landing/rsvp-experience.tsx src/components/landing/rsvp-experience.test.tsx tests/e2e/rsvp.spec.ts src/components/landing/story-gallery.tsx src/components/landing/story-gallery.test.tsx src/app/globals.css src/components/landing/achievement-slide.tsx`.

- [ ] **Step 2: Confirm the original achievement edit is still present**

The diff for `src/components/landing/achievement-slide.tsx` must still show the user's `01` to `1` change and paragraph wrapping, with no unrelated edits.
