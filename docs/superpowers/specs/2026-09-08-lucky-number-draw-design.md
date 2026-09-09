# Lucky Number RSVP and Draw Design

## Goal

When an invited guest confirms attendance, assign five distinct, fixed two-digit lucky numbers. Add a public draw page and an admin-only draw workflow where each prize is drawn one at a time and the result becomes visible to everyone shortly after the admin draws it.

The feature is part of the existing RSVP experience. It does not add a legal disclaimer or change the existing invitation flow for guests who decline.

## Confirmed rules

- Numbers are generated server-side from `00` through `99`.
- Each attending guest receives exactly five distinct numbers.
- The assignment is created once per guest and is reused for every later RSVP submission.
- The displayed order has no meaning. Numbers may be shuffled and the persisted order remains stable.
- A guest may win more than one prize.
- There are five draw rounds, in this order: special, second, third, fourth, fifth.
- A winning number cannot be selected again in a later round.
- Eligibility is based on how many attending guests own a number, not on its position in the five-number card:
  - special: exactly one owner;
  - second: at most two owners;
  - third: at most three owners;
  - fourth: at most four owners;
  - fifth: at most five owners.
- If a round has no eligible unused number, the round stays pending and the admin receives a clear error. The system never selects an invalid number just to complete the round.
- Prize names and rewards are editable configuration, not hard-coded into the draw logic. The fifth prize may default to `Phạt 1 cốc bia`.

## Approach

Use the existing Next.js server routes and Supabase persistence, with short polling for public updates.

Alternatives considered:

1. Supabase Realtime would reduce update latency but adds public subscription and authorization complexity.
2. SSE would provide push updates but is less natural for the current deployment and route structure.
3. Polling every two seconds keeps the server authoritative, fits the current architecture, and is sufficient for a single admin drawing five rounds. This is the selected approach.

## Data model

Add a migration with two tables.

### `lucky_number_assignments`

One row per guest who has attended at least once:

- `guest_id text primary key`;
- `numbers smallint[] not null` with exactly five distinct values from `0` through `99`;
- `created_at timestamptz not null default now()`.

The guest directory remains the source of guest identity. The table stores only the assignment and does not expose it to anonymous clients.

### `lucky_draw_results`

One row per completed prize round:

- `prize_rank smallint primary key` with values `1` through `5`;
- `winning_number smallint not null` with a range check from `0` through `99`;
- `created_at timestamptz not null default now()`;
- a unique constraint on `winning_number`.

The draw write must be atomic. A database function or equivalent transaction lock will select the next prize, compute eligible numbers from `lucky_number_assignments`, exclude prior winning numbers, insert one result, and return it. This prevents double draws if two admin tabs click at the same time.

## Server boundaries

### RSVP submission

When an RSVP submission is `attending: true`, the repository ensures the guest has an assignment before returning the response. The operation is idempotent:

- existing assignment: return it unchanged;
- no assignment: generate five distinct values with a server-side cryptographic random source, insert them, and return them;
- concurrent insert: recover the unique-key race and return the already persisted assignment.

The RSVP API response includes `luckyNumbers` for attending submissions so the success card can render them immediately. Declined submissions do not receive numbers.

### Public draw state

Add a public `GET /api/draws` endpoint that returns completed rounds in prize order. Each result includes the prize metadata, two-digit winning number, and matching public guest names. It does not return all assignments or guest IDs unnecessarily.

The public draw page polls this endpoint every two seconds while visible. It renders pending rounds as waiting states and completed rounds as revealed results.

### Admin draw control

Add an authenticated admin endpoint for the next round:

- `GET /api/admin/draws` returns current draw state for the dashboard;
- `POST /api/admin/draws/next` atomically completes the next pending prize.

The existing admin session checks protect both endpoints. The route rejects a sixth draw, rejects an invalid or unavailable round, and returns the existing result when a concurrent request loses the race rather than creating a duplicate.

## User experience

### RSVP success card

For an attending guest, add a number card below the confirmation message:

- five two-digit values, including leading zeroes;
- each value in a red circular outline inspired by lottery number displays;
- a short message explaining that the numbers are fixed for this guest;
- no number is generated or changed by refresh, retry, or a later RSVP submission.

The declined experience remains unchanged.

### Public draw page

Add `/quay-trung-thuong` with:

- the event visual language already used by the landing page;
- five prize cards in draw order;
- reward text, winning number, winner names, and a revealed/pending state;
- a lightweight “đang cập nhật” status while polling;
- an empty state before the first draw.

When a round completes, the number and all matching winners appear in the same card. A number with one owner may win special; a number with up to the configured limit may win the other prizes. The UI never implies that a guest is excluded after winning.

### Admin dashboard

Extend the current guest table with:

- the five assigned numbers for attending guests;
- each guest's winning prize labels, if any;
- a filter input matching guest name or number;
- filters for attending, pending/declined, and winners;
- a draw-control panel with the next prize, eligibility summary, and one `Quay giải` button;
- completed results and winner names for all five rounds.

Only the authenticated admin dashboard can start a draw. Public clients can observe results but cannot invoke the draw endpoint.

## Error handling and privacy

- Assignment failures return the existing generic RSVP error to the client and do not reveal database details.
- Draw availability failures return a stable API error that explains that no suitable number is currently available; no result is persisted.
- Anonymous APIs do not expose the full guest-to-number directory.
- Admin APIs continue to fail closed when the admin session is missing or expired.
- Polling stops or backs off when the public page is hidden, and it never blocks the rest of the page if the draw endpoint is temporarily unavailable.

## Testing strategy

Add tests before implementation for:

- generating exactly five distinct values in `00`–`99`;
- ensuring an existing guest assignment is returned unchanged;
- assignment recovery after a concurrent unique-key conflict;
- RSVP response behavior for attending versus declined submissions;
- eligibility counts for all five prize ranks;
- excluding previously drawn numbers;
- rejecting a draw when no eligible number exists;
- allowing the same guest to appear in multiple prize results;
- admin authentication and draw route validation;
- public draw response shape and winner mapping;
- success-card rendering with leading zeroes and red number circles;
- admin filters and next-round controls;
- end-to-end flow from attending RSVP through public result visibility.

## Acceptance criteria

1. An attending guest sees five fixed two-digit numbers immediately after submitting RSVP.
2. Repeated submission, page refresh, and retry do not change those five numbers.
3. Admin can inspect and filter participant numbers from the protected dashboard.
4. Admin can draw exactly five rounds, one at a time, and no anonymous request can draw.
5. Each round respects its owner-count limit and never reuses a winning number.
6. Public visitors see each result and all matching winner names after the admin completes a round.
7. A guest can appear in more than one round.
8. Existing RSVP, admin session, and privacy tests remain green.
