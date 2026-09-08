// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

import { readAdminSessionMetadata } from "@/lib/admin-session";
import { getE2eLuckyNumberPersistence, resetE2eLuckyNumberState } from "@/lib/e2e-lucky-number-state";
import { POST } from "./route";

vi.mock("@/lib/admin-session", () => ({
  readAdminSessionMetadata: vi.fn(),
}));

const SCOPE = "admin-next-draw-route-test";

function request() {
  return new Request("http://localhost/api/admin/draws/next", {
    method: "POST",
    headers: { "x-e2e-worker-id": SCOPE },
  });
}

describe("POST /api/admin/draws/next", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("E2E_REPOSITORY", "memory");
    resetE2eLuckyNumberState(SCOPE);
  });

  it("returns 401 without an authenticated admin", async () => {
    vi.mocked(readAdminSessionMetadata).mockResolvedValue(null);

    const response = await POST(request());

    expect(response.status).toBe(401);
  });

  it("returns 401 for an expired admin session", async () => {
    vi.mocked(readAdminSessionMetadata).mockResolvedValue({
      expiresAt: 1_788_000_000,
      serverTime: 1_788_000_000_000,
    });

    const response = await POST(request());

    expect(response.status).toBe(401);
  });

  it("draws only the next pending round for an authenticated admin", async () => {
    vi.mocked(readAdminSessionMetadata).mockResolvedValue({
      expiresAt: 1_788_000_000,
      serverTime: 1_787_999_995_250,
    });
    await getE2eLuckyNumberPersistence(SCOPE).insertAssignment({
      guest_id: "guest-01",
      numbers: [10, 11, 12, 13, 14],
    });

    const response = await POST(request());

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(Number.isInteger(payload.result.prizeRank)).toBe(true);
    expect(payload.result.prizeRank).toBeGreaterThanOrEqual(1);
    expect(payload.result.prizeRank).toBeLessThanOrEqual(5);
  });

  it("returns 409 when the next round has no eligible number", async () => {
    vi.mocked(readAdminSessionMetadata).mockResolvedValue({
      expiresAt: 1_788_000_000,
      serverTime: 1_787_999_995_250,
    });
    const persistence = getE2eLuckyNumberPersistence(SCOPE);
    for (const guestId of ["guest-01", "guest-02", "guest-03", "guest-04", "guest-05", "guest-06"]) {
      await persistence.insertAssignment({
        guest_id: guestId,
        numbers: [10, 11, 12, 13, 14],
      });
    }

    const response = await POST(request());

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      error: { code: "NO_ELIGIBLE_LUCKY_NUMBER" },
    });
  });
});
