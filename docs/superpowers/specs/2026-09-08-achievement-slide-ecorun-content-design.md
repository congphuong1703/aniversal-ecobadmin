# Achievement Card EcoRun Content Design

## Goal

Update the anniversary achievement card to show only the number `1` and acknowledge EcoRun's role in the celebration.

## Design

- In the visual mark, keep the existing number `1` and remove the supporting label `năm cùng nhau`.
- Add a new paragraph below the existing card copy:

  > EcoRun — một đối thủ, cũng là một người bạn đồng hành và là nhà tài trợ kim cương cho dịp kỷ niệm này.

- Keep the existing card layout, colors, animation classes, heading, date eyebrow, and other copy unchanged.
- Keep the text in the same `achievement-slide-copy` content column so it inherits the existing responsive typography and spacing.

## Accessibility

- The number mark remains decorative and keeps `aria-hidden="true"`.
- The new paragraph is regular readable content and does not introduce new interactive behavior.

## Testing

- Verify the component source contains the standalone `1`, no longer contains `năm cùng nhau`, and includes the approved EcoRun sentence.
- Run the focused relevant test suite, typecheck, and lint.

## Scope

- Modify only `src/components/landing/achievement-slide.tsx` unless verification identifies a necessary styling adjustment.
- Do not change database files, assets, routes, or unrelated story/RSVP behavior.
