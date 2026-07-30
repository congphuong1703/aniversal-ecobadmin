// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

import { E2E_GUESTS } from "@/data/e2e-guests";
import { resetE2eRsvpState } from "@/lib/e2e-rsvp-repository";
import { getAdminDashboard } from "@/lib/rsvp-repository";

describe.sequential("E2E repository guest directory", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses deterministic E2E names in the memory admin dashboard", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("E2E_REPOSITORY", "memory");
    resetE2eRsvpState("directory-worker");

    const dashboard = await getAdminDashboard("directory-worker");

    expect(dashboard.guests.map(({ fullName }) => fullName)).toEqual(
      E2E_GUESTS.map(({ fullName }) => fullName),
    );
  });
});
