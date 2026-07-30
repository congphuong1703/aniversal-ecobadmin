// @vitest-environment node

import { beforeEach, describe, expect, it } from "vitest";

import {
  getE2eRsvpPersistence,
  getE2eRsvpState,
  resetE2eRsvpState,
} from "./e2e-rsvp-repository";
import { SubmissionIdConflictError } from "./rsvp-repository";

const FIRST_SUBMISSION = {
  guest_id: "guest-01",
  attending: true,
  message: "Worker zero",
  client_submission_id: "10000000-0000-4000-8000-000000000001",
};

describe("E2E RSVP persistence", () => {
  beforeEach(() => {
    resetE2eRsvpState("worker-0");
    resetE2eRsvpState("worker-1");
  });

  it("keeps deterministic seeded state isolated per Playwright worker", async () => {
    resetE2eRsvpState("worker-0", [FIRST_SUBMISSION]);

    await expect(getE2eRsvpState("worker-0")).resolves.toEqual([
      expect.objectContaining({
        id: "e2e00000-0000-4000-8000-000000000001",
        created_at: "2026-09-17T12:00:01.000Z",
        ...FIRST_SUBMISSION,
      }),
    ]);
    await expect(getE2eRsvpState("worker-1")).resolves.toEqual([]);
  });

  it("deduplicates a response-lost retry without inserting another row", async () => {
    const persistence = getE2eRsvpPersistence("worker-0");

    const first =
      await persistence.insertSubmissionWithMetadata(FIRST_SUBMISSION);
    const retry =
      await persistence.insertSubmissionWithMetadata(FIRST_SUBMISSION);

    expect(first.deduplicated).toBe(false);
    expect(retry).toEqual({ row: first.row, deduplicated: true });
    await expect(getE2eRsvpState("worker-0")).resolves.toHaveLength(1);
  });

  it("deduplicates concurrent inserts with the same client submission id", async () => {
    const persistence = getE2eRsvpPersistence("worker-0");

    const results = await Promise.all([
      persistence.insertSubmissionWithMetadata(FIRST_SUBMISSION),
      persistence.insertSubmissionWithMetadata(FIRST_SUBMISSION),
    ]);

    expect(results.map(({ deduplicated }) => deduplicated).sort()).toEqual([
      false,
      true,
    ]);
    expect(results[0]?.row).toEqual(results[1]?.row);
    await expect(getE2eRsvpState("worker-0")).resolves.toHaveLength(1);
  });

  it("rejects concurrent cross-guest reuse of a client submission id without leaking data", async () => {
    const persistence = getE2eRsvpPersistence("worker-0");
    const conflictingSubmission = {
      ...FIRST_SUBMISSION,
      guest_id: "guest-02",
      message: "Conflicting private message",
    };

    const results = await Promise.allSettled([
      persistence.insertSubmissionWithMetadata(FIRST_SUBMISSION),
      persistence.insertSubmissionWithMetadata(conflictingSubmission),
    ]);
    const fulfilled = results.filter(
      (result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof persistence.insertSubmissionWithMetadata>>> =>
        result.status === "fulfilled",
    );
    const rejected = results.filter(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );

    expect(fulfilled).toHaveLength(1);
    expect(fulfilled[0]?.value.deduplicated).toBe(false);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.reason).toBeInstanceOf(SubmissionIdConflictError);
    expect(rejected[0]?.reason).toMatchObject({
      message: "Submission ID is already in use.",
    });
    expect(String(rejected[0]?.reason)).not.toContain(FIRST_SUBMISSION.guest_id);
    expect(String(rejected[0]?.reason)).not.toContain(
      conflictingSubmission.guest_id,
    );
    expect(String(rejected[0]?.reason)).not.toContain(
      conflictingSubmission.message,
    );
    await expect(getE2eRsvpState("worker-0")).resolves.toHaveLength(1);
  });

  it("clears existing rows and restarts deterministic identifiers", async () => {
    const persistence = getE2eRsvpPersistence("worker-0");
    await persistence.insertSubmission(FIRST_SUBMISSION);

    resetE2eRsvpState("worker-0");
    const row = await persistence.insertSubmission({
      ...FIRST_SUBMISSION,
      client_submission_id: "10000000-0000-4000-8000-000000000002",
    });

    expect(row.id).toBe("e2e00000-0000-4000-8000-000000000001");
    expect(row.created_at).toBe("2026-09-17T12:00:01.000Z");
  });

  it("keeps deterministic timestamps valid when a seed crosses a minute", async () => {
    resetE2eRsvpState(
      "worker-0",
      Array.from({ length: 61 }, (_, index) => ({
        ...FIRST_SUBMISSION,
        client_submission_id: `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      })),
    );

    const rows = await getE2eRsvpState("worker-0");
    expect(rows[60]?.created_at).toBe("2026-09-17T12:01:01.000Z");
  });
});
