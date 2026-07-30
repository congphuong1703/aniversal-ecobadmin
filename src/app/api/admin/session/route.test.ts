// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

import { readAdminSessionMetadata } from "@/lib/admin-session";
import { GET } from "./route";

vi.mock("@/lib/admin-session", () => ({
  readAdminSessionMetadata: vi.fn(),
}));

describe("GET /api/admin/session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns fresh server-authoritative remaining lifetime", async () => {
    vi.mocked(readAdminSessionMetadata).mockResolvedValue({
      expiresAt: 1_788_000_000,
      serverTime: 1_787_999_995_250,
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.json()).toEqual({
      authenticated: true,
      remainingMs: 4_750,
    });
  });

  it.each([
    ["missing", null],
    [
      "expired",
      { expiresAt: 1_788_000_000, serverTime: 1_788_000_000_000 },
    ],
    [
      "semantically overlong",
      { expiresAt: 1_788_000_000, serverTime: 1_787_971_199_999 },
    ],
  ])("returns 401 for a %s session", async (_label, metadata) => {
    vi.mocked(readAdminSessionMetadata).mockResolvedValue(metadata);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: { code: "UNAUTHORIZED", message: "Unauthorized." },
    });
  });

  it("fails closed when session verification throws", async () => {
    vi.mocked(readAdminSessionMetadata).mockRejectedValue(
      new Error("session config unavailable"),
    );

    const response = await GET();

    expect(response.status).toBe(401);
  });
});
