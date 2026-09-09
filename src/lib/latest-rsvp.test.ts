// @vitest-environment node

import { describe, expect, it } from "vitest";

import { getAttendingGuestIds, getLatestRsvpByGuest } from "./latest-rsvp";

const row = (
  overrides: Partial<Parameters<typeof getLatestRsvpByGuest>[0][number]>,
) => ({
  id: "00000000-0000-4000-8000-000000000001",
  guest_id: "guest-01",
  attending: true,
  created_at: "2026-09-17T12:00:00.000Z",
  ...overrides,
});

describe("latest RSVP helper", () => {
  it("uses created_at then id to select each guest's latest RSVP", () => {
    const latest = getLatestRsvpByGuest([
      row({ id: "00000000-0000-4000-8000-000000000001", attending: true }),
      row({ id: "00000000-0000-4000-8000-000000000002", attending: false }),
      row({
        id: "00000000-0000-4000-8000-000000000003",
        guest_id: "guest-02",
        created_at: "2026-09-17T12:01:00.000Z",
        attending: true,
      }),
    ]);

    expect(latest.get("guest-01")).toMatchObject({ attending: false });
    expect(getAttendingGuestIds(latest)).toEqual(new Set(["guest-02"]));
  });
});
