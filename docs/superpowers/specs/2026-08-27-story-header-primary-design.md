# Story Header Primary Color Design

## Goal

Keep the primary brand color on the header shown after navigating to `/story`,
so it matches the landing page header.

## Scope

- Change only the background color of `.story-page-header`.
- Preserve the existing logo, back link, layout, responsive behavior, and focus styles.
- Do not change the home page hero, admin header, or story content.

## Approach

Use the existing `--primary` CSS variable directly in
`src/app/globals.css`. This is the smallest change and keeps the color aligned
with the existing design token.

## Behavior and verification

The `/story` header must render with the computed background color represented by
`var(--primary)` at desktop and mobile widths. Existing story-page tests and the
project lint/type checks should continue to pass.
