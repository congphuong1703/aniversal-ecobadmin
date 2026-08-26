// @vitest-environment node

import { describe, expect, it } from "vitest";

import { GUEST_FIXTURES } from "@/test/fixtures";
import { GET } from "./route";

describe("GET /api/guests", () => {
  it("returns public guest projections without full names", async () => {
    const response = await GET();
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(body.guests).toHaveLength(25);
    expect(serialized).not.toContain("fullName");

    for (const guest of GUEST_FIXTURES) {
      expect(serialized).not.toContain(guest.fullName);
    }
  });
});
