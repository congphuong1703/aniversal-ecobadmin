# RSVP and Story Interaction Refinements

## Goal

Make the RSVP decline interaction less frustrating and refine the story gallery so its timing, controls, and image viewing behavior match what visitors see.

## Scope

- Unlock the `Hẹn dịp khác` RSVP button after five hover events instead of ten.
- Increase story gallery auto-rotation from two seconds to three seconds.
- Make story gallery navigation indicators represent actual slide states, including grouped mosaic states.
- Open any story image in an accessible image lightbox using the existing modal component.
- Pause gallery rotation while the image lightbox is open.
- Restore contrast for the achievement section heading on its navy background.

## Design

### RSVP decline interaction

Keep the current state and offset model. Change the single hover limit constant to `5`, continue clamping the counter at that limit, and leave the existing button submission flow unchanged. The button remains visually movable until the fifth hover and becomes clickable on the fifth hover.

### Story gallery state and controls

Keep each gallery layout's existing visual composition. Introduce a small navigation-state model so the gallery can distinguish between:

- individual image start positions for feature, duo, collage, and strip layouts;
- grouped phases for a mosaic with more than five images.

The number of rendered controls must equal the number of navigable states. A mosaic with nine images therefore renders two controls: images 1-5 and images 6-9. Clicking a control selects its state, and the active indicator follows the selected state. Other layouts continue to expose one control per image start position.

The auto-rotation remains disabled for galleries with fewer than two images and while the gallery is hovered or focused. Its interval becomes `3000ms`. Opening the lightbox also pauses auto-rotation until the lightbox closes.

### Story image lightbox

Use the existing `Modal` component to preserve the current close button, Escape-key handling, backdrop behavior, and focus restoration. Each visible gallery image becomes an accessible button with an explicit label. Clicking it stores the selected image and renders that image inside the modal with `object-fit: contain`, natural aspect-ratio metadata, and responsive max dimensions. Closing the modal clears the selected image.

The lightbox is view-only: it does not add previous/next navigation or alter the gallery's active state. The underlying gallery remains unchanged when the modal closes.

### Achievement heading contrast

Set the achievement copy heading color to the existing white token. This is scoped to the heading so the current muted paragraph colors and lime eyebrow remain unchanged.

## Testing

- Update the RSVP unit test to assert the fifth hover unlocks and the fourth does not.
- Update the RSVP end-to-end test to use five hovers.
- Add StoryGallery component tests covering three-second interval navigation, exact indicator counts for ordinary and mosaic layouts, image click-to-modal behavior, and modal close behavior.
- Run the existing unit suite, typecheck, lint, and production build.

## Non-goals

- No database access or schema changes.
- No changes to story image assets, chapter copy, or gallery layout composition.
- No new UI dependency.
- No navigation controls inside the lightbox.
