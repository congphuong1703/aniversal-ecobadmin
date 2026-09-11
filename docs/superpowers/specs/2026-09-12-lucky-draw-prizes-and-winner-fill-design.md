# Lucky Draw Prizes and Winner Fill Design

## Goal

Update the five prize descriptions and ensure each completed prize has exactly the number of unique winners indicated by its rank: one winner for first prize, two for second, three for third, four for fourth, and five for fifth.

## Prize Configuration

- Giải nhất: 1 giải trúng thưởng - Bình nước thể thao giữ nhiệt.
- Giải nhì: 2 giải - Băng đô thể thao.
- Giải ba: 3 giải - Bình xịt lạnh giảm đau.
- Giải tư: 4 giải - mỗi giải gồm 1 cốc bia hơi Hà Nội (nam 1 cốc, nữ nửa cốc), sau khi thực hiện xong có quà bí mật.
- Giải năm: 5 giải - mỗi giải gồm 1 cốc bia hơi Hà Nội (nam 1 cốc, nữ nửa cốc) và quà bí mật sau khi thực hiện.

The public and admin interfaces continue to read prize labels and reward descriptions from `src/data/draw-prizes.ts`; rank 1 is labelled `Giải nhất`.

## Draw Behavior

The system keeps the existing random prize-rank and lucky-number selection. For a selected prize:

1. Find attending guests who own the winning number.
2. Deduplicate those guests by `guest_id`.
3. If the number of winners is below the prize rank, randomly select additional attending guests until the target is reached.
4. Exclude anyone already included in that prize, so one person cannot receive the same prize more than once.
5. A person may still win different prize ranks.
6. If there are not enough unique attending guests to reach the target, do not save a partial result; return a clear conflict error.

The server performs winner selection. The browser cannot submit or choose supplemental winners.

## Persistence

Add a `supplemental_guest_ids` text array to `lucky_draw_results`. Only guests added to fill a short prize are stored in this column. The original winners remain derived from the saved winning number and lucky-number assignments.

The draw write remains atomic. The production database function will:

- lock the draw operation;
- choose a pending prize and eligible winning number;
- calculate the original unique winners;
- randomly select the required supplemental attending guests;
- save the winning number and supplemental guest IDs in one result row.

The in-memory E2E adapter will implement the same behavior. Existing result rows are compatible because the new array defaults to an empty array.

## Result Mapping

When reading a result, merge:

- attending guests whose assigned numbers contain the winning number; and
- saved supplemental guest IDs.

Deduplicate by guest ID before mapping to public names. Supplemental winners are appended after lucky-number winners. Public and admin responses keep the existing `winners` string array contract, so the UI needs no new private identifiers.

## Error Handling

Keep the current errors for all prizes drawn and no eligible lucky number. Add a distinct insufficient-attendees error when a prize cannot be filled to its target winner count. The admin endpoint returns HTTP 409 with an actionable Vietnamese message, and no partial result is persisted.

## Testing

- Prize configuration tests assert the exact five labels and descriptions.
- Domain/repository tests prove a short result is filled to the prize rank.
- Tests prove supplemental selection excludes original winners and contains no duplicate guest IDs.
- Tests prove the same guest may win different ranks.
- Tests prove an under-capacity draw fails without saving a partial result.
- Migration tests verify the new column, default, atomic supplemental selection, attendee filtering, and service-role permissions.
- Existing public/admin component and API tests continue to verify that all final winner names are displayed.

## Database Safety

Implementation will create a new migration file but will not execute it against any database. Applying it is outside this task unless a local or isolated target is explicitly identified and verified.
