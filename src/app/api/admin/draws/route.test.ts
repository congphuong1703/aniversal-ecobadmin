// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

import { readAdminSessionMetadata } from "@/lib/admin-session";
import { resetE2eLuckyNumberState } from "@/lib/e2e-lucky-number-state";
import { GET } from "./route";

vi.mock("@/lib/admin-session", () => ({
  readAdminSessionMetadata: vi.fn(),
}));

const SCOPE = "admin-draw-route-test";

function request() {
  return new Request("http://localhost/api/admin/draws", {
    headers: { "x-e2e-worker-id": SCOPE },
  });
}

describe("GET /api/admin/draws", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("E2E_REPOSITORY", "memory");
    resetE2eLuckyNumberState(SCOPE);
  });

  it("fails closed when the admin session is missing", async () => {
    vi.mocked(readAdminSessionMetadata).mockResolvedValue(null);

    const response = await GET(request());

    expect(response.status).toBe(401);
  });

  it("returns protected draw state with a no-store response", async () => {
    vi.mocked(readAdminSessionMetadata).mockResolvedValue({
      expiresAt: 1_788_000_000,
      serverTime: 1_787_999_995_250,
    });

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(await response.json()).toMatchObject({
      authenticated: true,
      remainingMs: 4_750,
      draws: expect.any(Array),
    });
  });
});
