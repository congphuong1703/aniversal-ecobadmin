# Story Image Resizing Design

## Goal

Display every story photo at its original aspect ratio so no meaningful content is cropped on desktop or mobile.

## Scope

- Update only the photo album on `/story`.
- Keep guest portraits unchanged because their circular and card crops are intentional avatar treatments.
- Preserve the current story groups, ordering, captions, and responsive page structure.

## Design

Each story image carries its source width and height. Next.js renders the image with those intrinsic dimensions instead of filling a fixed-ratio wrapper. Single-image groups request the full story-shell width, while multi-image groups request column-sized sources. CSS scales the image down to the available column width, keeps height automatic, and caps exceptionally tall display sizes to the viewport while preserving the aspect ratio.

The existing grids remain responsive, but their rows size from image content rather than fixed aspect-ratio boxes. Image wrappers keep the existing border, background, and shadow treatment.

## Verification

- Add a Playwright regression test that compares each rendered image ratio with its natural image ratio, confirms the wrapper does not clip it, and checks that a single landscape image uses the available row width.
- Check the story page at desktop and mobile project viewports.
- Run lint, type checking, focused E2E coverage, and the production build.
