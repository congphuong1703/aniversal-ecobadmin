// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

import { resetE2eRsvpState } from "@/lib/e2e-rsvp-repository";
import { GET } from "./route";

const WORKER_ID = "worker-4";

function stateRequest(workerId: string | null = WORKER_ID) {
  const headers = new Headers();

  if (workerId !== null) {
    headers.set("x-e2e-worker-id", workerId);
  }

  return new Request("http://localhost/api/test/rsvp-state", { headers });
}

describe.sequential("GET /api/test/rsvp-state", () => {
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

      const response = await GET(stateRequest());

      expect(response.status).toBe(404);
    },
  );

  it("returns only the requesting worker's submissions", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("E2E_REPOSITORY", "memory");
    resetE2eRsvpState(WORKER_ID, [
      {
        guest_id: "guest-02",
        attending: false,
        message: null,
        client_submission_id: "20000000-0000-4000-8000-000000000002",
      },
    ]);

    const response = await GET(stateRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      submissions: [
        expect.objectContaining({
          guestId: "guest-02",
          attending: false,
          message: null,
          clientSubmissionId: "20000000-0000-4000-8000-000000000002",
        }),
      ],
    });
  });

  it.each([null, "contains spaces", "x".repeat(65)])(
    "returns 404 for missing or malformed worker scope %#",
    async (scope) => {
      vi.stubEnv("NODE_ENV", "test");
      vi.stubEnv("E2E_REPOSITORY", "memory");

      const response = await GET(stateRequest(scope));

      expect(response.status).toBe(404);
    },
  );
});
