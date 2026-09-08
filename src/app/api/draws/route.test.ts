// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

import { getE2eLuckyNumberPersistence, resetE2eLuckyNumberState } from "@/lib/e2e-lucky-number-state";
import { GET } from "./route";

const SCOPE = "public-draw-route-test";

function request() {
  return new Request("http://localhost/api/draws", {
    headers: { "x-e2e-worker-id": SCOPE },
  });
}

describe("GET /api/draws", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("E2E_REPOSITORY", "memory");
    resetE2eLuckyNumberState(SCOPE);
  });

  it("returns public five-round state without exposing assignments", async () => {
    await getE2eLuckyNumberPersistence(SCOPE).insertAssignment({
      guest_id: "guest-01",
      numbers: [10, 11, 12, 13, 14],
    });

    const response = await GET(request());
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(body.draws).toHaveLength(5);
    expect(serialized).not.toContain("guest_id");
    expect(serialized).not.toContain("numbers");
  });

  it("returns a generic error when public state cannot be loaded", async () => {
    vi.stubEnv("E2E_REPOSITORY", undefined);
    vi.stubEnv("NODE_ENV", "production");

    const response = await GET(request());

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: { code: "INTERNAL_ERROR", message: "Unable to load draws." },
    });
  });
});
