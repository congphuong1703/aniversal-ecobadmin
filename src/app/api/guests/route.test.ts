// @vitest-environment node

import { describe, expect, it } from "vitest";

import { GET } from "./route";

describe("GET /api/guests", () => {
  it("returns public guest projections with full names", async () => {
    const response = await GET();
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(body.guests).toHaveLength(25);
    expect(serialized).toContain("fullName");
    expect(body.guests[0]).toHaveProperty("fullName");
  });
});
