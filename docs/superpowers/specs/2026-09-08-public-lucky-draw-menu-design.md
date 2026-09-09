# Public Lucky Draw Menu Design

## Goal

Add a clear public lucky-draw menu and information page for guests. The page explains the rules, displays placeholder prizes, shows draw progress, and polls for official results. Only an authenticated admin can trigger a draw.

## User experience

The existing `/quay-trung-thuong` route becomes the public lucky-draw hub. The landing-page navigation exposes it as the `Quay trúng thưởng` menu item, while the page header provides links back to the home page and to the information sections.

The page contains:

- A hero introducing the lucky draw and showing the live progress (`0/5` through `5/5`).
- Five prize cards with editable placeholder reward descriptions.
- A rules section explaining eligibility, five assigned lucky numbers, random prize order, one draw per prize, winner matching, and official-result behavior.
- A short “how to check” section directing guests to their RSVP success card and the public results.
- Live result cards showing the winning number and every guest who owns that number after a draw is published.
- Loading, retrying, stale-data, and completed states that remain understandable on mobile.

The prize configuration remains centralized in `src/data/draw-prizes.ts`, so the organizer can replace demo reward text without changing UI or draw logic.

## Draw behavior

There are five prize ranks. Each admin click selects one rank from the set of ranks not yet drawn, using a cryptographically safe server-side/random database selection appropriate to the existing architecture. The selected winning number is then chosen using the existing eligibility rules and cannot repeat an earlier winning number.

Each prize rank is persisted once. All guests whose assigned five-number set contains the winning number are displayed as winners for that prize. The public page never receives admin controls or private guest data beyond the existing public result contract.

The in-memory repository used by tests and E2E selects the pending rank through its injected random-index dependency. Production uses a new migration that replaces the draw RPC with an `order by random()` selection among pending ranks. Existing migrations remain immutable.

## Components and data flow

- `src/components/landing/hero.tsx`: keeps the public menu link to `/quay-trung-thuong` and labels it consistently.
- `src/app/quay-trung-thuong/page.tsx`: provides page metadata and public navigation shell.
- `src/components/draw/public-draw-page.tsx`: renders the public hero, rules, progress, prize cards, and polling states.
- `src/app/globals.css`: adds responsive styling within the existing visual language.
- `src/data/draw-prizes.ts`: stores five placeholder reward descriptions.
- `src/lib/lucky-draw-repository.ts`: randomizes the next pending rank for the in-memory path while preserving result mapping by rank.
- `supabase/migrations/202609080003_randomize_lucky_prize_order.sql`: updates the production draw RPC without editing prior migrations.

The public page continues to call `GET /api/draws` every two seconds while visible. Admin continues to call the protected `/api/admin/draws/next` endpoint. No public write endpoint is added.

## Error handling

- A failed initial public fetch shows a retrying state and does not present fake results as real results.
- A later polling failure keeps the last known state and announces that the data may be stale.
- An admin draw conflict for no eligible number or all prizes drawn continues to use existing structured error codes.
- Concurrent admin clicks are serialized by the existing UI guard and database advisory lock.

## Testing

- Update repository tests to prove the pending prize rank is selected randomly and that all five ranks can be drawn once without duplicates.
- Update public-page tests to cover rules, placeholder rewards, progress, pending/revealed cards, and polling failure behavior.
- Update E2E coverage for the public menu and responsive public draw content where existing selectors permit.
- Run focused Vitest tests, then lint, typecheck, and the full test suite.
