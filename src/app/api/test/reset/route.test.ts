// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

import { getE2eRsvpState } from "@/lib/e2e-rsvp-repository";
import { POST } from "./route";

const WORKER_ID = "worker-2";

function resetRequest() {
  return new Request("http://localhost/api/test/reset", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-e2e-worker-id": WORKER_ID,
    },
    body: JSON.stringify({
      submissions: [
        {
          guestId: "guest-01",
          attending: true,
          message: "Seeded history",
          clientSubmissionId: "20000000-0000-4000-8000-000000000001",
        },
      ],
    }),
  });
}

describe.sequential("POST /api/test/reset", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([
    { NODE_ENV: "production", E2E_REPOSITORY: "memory" },
    { NODE_ENV: "test", E2E_REPOSITORY: undefined },
  ])(
    "returns 404 outside explicit non-production E2E mode",
    async (environment) => {
      vi.stubEnv("NODE_ENV", environment.NODE_ENV);
      vi.stubEnv("E2E_REPOSITORY", environment.E2E_REPOSITORY);

      const response = await POST(resetRequest());

      expect(response.status).toBe(404);
    },
  );

  it("resets and seeds only the requesting Playwright worker", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("E2E_REPOSITORY", "memory");

    const response = await POST(resetRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ reset: true });
    await expect(getE2eRsvpState(WORKER_ID)).resolves.toEqual([
      expect.objectContaining({
        guest_id: "guest-01",
        attending: true,
        message: "Seeded history",
      }),
    ]);
    await expect(getE2eRsvpState("worker-3")).resolves.toEqual([]);
  });
});
