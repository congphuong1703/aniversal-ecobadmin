import { describe, expect, it } from "vitest";

import { GUEST_FIXTURES } from "@/test/fixtures";
import { envSchema } from "./env";
import {
  createRsvpRepository,
  type RsvpPersistenceAdapter,
  type RsvpSubmissionInsert,
  type RsvpSubmissionRow,
} from "./rsvp-repository";
import {
  loginInputSchema,
  rsvpInputSchema,
  verifyInputSchema,
} from "./rsvp-schema";

function createMemoryAdapter(initialRows: RsvpSubmissionRow[] = []) {
  const rows = [...initialRows];
  let insertCount = 0;

  const adapter: RsvpPersistenceAdapter = {
    async findByClientSubmissionId(clientSubmissionId) {
      return (
        rows.find((row) => row.client_submission_id === clientSubmissionId) ??
        null
      );
    },
    async insertSubmission(input) {
      insertCount += 1;
      const row = makeRow(input, {
        id: `00000000-0000-4000-8000-${String(insertCount).padStart(12, "0")}`,
        created_at: `2026-07-29T00:00:0${insertCount}.000Z`,
      });
      rows.push(row);
      return row;
    },
    async listSubmissions() {
      return [...rows];
    },
  };

  return {
    adapter,
    get insertCount() {
      return insertCount;
    },
  };
}

function makeRow(
  input: RsvpSubmissionInsert,
  generated: Pick<RsvpSubmissionRow, "id" | "created_at">,
): RsvpSubmissionRow {
  return { ...input, ...generated };
}

describe("RSVP repository", () => {
  it("deduplicates retries but appends distinct intentional submissions", async () => {
    const memory = createMemoryAdapter();
    const repository = createRsvpRepository(memory.adapter, GUEST_FIXTURES);
    const firstInput = {
      guestId: "guest-01",
      attending: true,
      message: "See you there",
      clientSubmissionId: "10000000-0000-4000-8000-000000000001",
    };

    const first = await repository.createSubmission(firstInput);
    const retry = await repository.createSubmission(firstInput);
    const changedResponse = await repository.createSubmission({
      ...firstInput,
      attending: false,
      message: null,
      clientSubmissionId: "10000000-0000-4000-8000-000000000002",
    });

    expect(retry).toEqual(first);
    expect(changedResponse.id).not.toBe(first.id);
    expect(memory.insertCount).toBe(2);

    const dashboard = await repository.getAdminDashboard();
    const guest = dashboard.guests.find(({ id }) => id === "guest-01");

    expect(guest?.history).toHaveLength(2);
    expect(guest?.currentSubmission).toEqual(changedResponse);
  });

  it("rejects submissions for guests outside the static directory", async () => {
    const memory = createMemoryAdapter();
    const repository = createRsvpRepository(memory.adapter, GUEST_FIXTURES);

    await expect(
      repository.createSubmission({
        guestId: "unknown-guest",
        attending: true,
        message: null,
        clientSubmissionId: "10000000-0000-4000-8000-000000000003",
      }),
    ).rejects.toThrow("Unknown guest ID");
    expect(memory.insertCount).toBe(0);
  });

  it("includes every static guest and summarizes their latest response", async () => {
    const memory = createMemoryAdapter([
      makeRow(
        {
          guest_id: "guest-01",
          attending: true,
          message: "Original response",
          client_submission_id: "20000000-0000-4000-8000-000000000001",
        },
        {
          id: "30000000-0000-4000-8000-000000000001",
          created_at: "2026-07-29T01:00:00.000Z",
        },
      ),
      makeRow(
        {
          guest_id: "guest-01",
          attending: false,
          message: null,
          client_submission_id: "20000000-0000-4000-8000-000000000002",
        },
        {
          id: "30000000-0000-4000-8000-000000000002",
          created_at: "2026-07-29T02:00:00.000Z",
        },
      ),
      makeRow(
        {
          guest_id: "guest-02",
          attending: true,
          message: "Count me in",
          client_submission_id: "20000000-0000-4000-8000-000000000003",
        },
        {
          id: "30000000-0000-4000-8000-000000000003",
          created_at: "2026-07-29T03:00:00.000Z",
        },
      ),
    ]);
    const repository = createRsvpRepository(memory.adapter, GUEST_FIXTURES);

    const dashboard = await repository.getAdminDashboard();
    const respondingGuest = dashboard.guests.find(
      ({ id }) => id === "guest-01",
    );
    const absentGuest = dashboard.guests.find(({ id }) => id === "guest-20");

    expect(dashboard.guests).toHaveLength(20);
    expect(respondingGuest?.history.map(({ attending }) => attending)).toEqual([
      false,
      true,
    ]);
    expect(respondingGuest?.currentSubmission?.attending).toBe(false);
    expect(absentGuest?.currentSubmission).toBeNull();
    expect(absentGuest?.history).toEqual([]);
    expect(dashboard.summary).toEqual({
      total: 20,
      attending: 1,
      declined: 1,
      pending: 18,
    });
  });

  it("uses the submission id as a deterministic tie-breaker", async () => {
    const createdAt = "2026-07-29T04:00:00.000Z";
    const memory = createMemoryAdapter([
      makeRow(
        {
          guest_id: "guest-01",
          attending: false,
          message: null,
          client_submission_id: "40000000-0000-4000-8000-000000000001",
        },
        { id: "50000000-0000-4000-8000-000000000001", created_at: createdAt },
      ),
      makeRow(
        {
          guest_id: "guest-01",
          attending: true,
          message: null,
          client_submission_id: "40000000-0000-4000-8000-000000000002",
        },
        { id: "50000000-0000-4000-8000-000000000002", created_at: createdAt },
      ),
    ]);
    const repository = createRsvpRepository(memory.adapter, GUEST_FIXTURES);

    const dashboard = await repository.getAdminDashboard();
    const guest = dashboard.guests.find(({ id }) => id === "guest-01");

    expect(guest?.currentSubmission?.id).toBe(
      "50000000-0000-4000-8000-000000000002",
    );
  });

  it("orders timestamps by instant even when offsets differ", async () => {
    const memory = createMemoryAdapter([
      makeRow(
        {
          guest_id: "guest-01",
          attending: true,
          message: null,
          client_submission_id: "70000000-0000-4000-8000-000000000001",
        },
        {
          id: "80000000-0000-4000-8000-000000000001",
          created_at: "2026-07-29T01:30:00+00:00",
        },
      ),
      makeRow(
        {
          guest_id: "guest-01",
          attending: false,
          message: null,
          client_submission_id: "70000000-0000-4000-8000-000000000002",
        },
        {
          id: "80000000-0000-4000-8000-000000000002",
          created_at: "2026-07-29T03:00:00+02:00",
        },
      ),
    ]);
    const repository = createRsvpRepository(memory.adapter, GUEST_FIXTURES);

    const dashboard = await repository.getAdminDashboard();
    const guest = dashboard.guests.find(({ id }) => id === "guest-01");

    expect(guest?.currentSubmission?.attending).toBe(true);
  });
});

describe("RSVP boundaries", () => {
  it("validates environment values without reading process.env on import", () => {
    expect(
      envSchema.parse({
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
        ADMIN_PASSWORD: "admin-password",
        ADMIN_SESSION_SECRET: "admin-session-secret",
        RSVP_VERIFICATION_SECRET: "verification-secret",
      }),
    ).toEqual({
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
      ADMIN_PASSWORD: "admin-password",
      ADMIN_SESSION_SECRET: "admin-session-secret",
      RSVP_VERIFICATION_SECRET: "verification-secret",
    });
  });

  it("validates verify, RSVP, and login request bodies", () => {
    expect(
      verifyInputSchema.parse({ guestId: "guest-01", name: " Nguyễn Văn An " }),
    ).toEqual({ guestId: "guest-01", name: "Nguyễn Văn An" });
    expect(
      rsvpInputSchema.parse({
        verificationToken: "signed-token",
        attending: false,
        message: null,
        clientSubmissionId: "60000000-0000-4000-8000-000000000001",
      }),
    ).toEqual({
      verificationToken: "signed-token",
      attending: false,
      message: null,
      clientSubmissionId: "60000000-0000-4000-8000-000000000001",
    });
    expect(loginInputSchema.parse({ password: "secret" })).toEqual({
      password: "secret",
    });
    expect(() =>
      rsvpInputSchema.parse({
        verificationToken: "signed-token",
        attending: true,
        message: "x".repeat(1001),
        clientSubmissionId: "not-a-uuid",
      }),
    ).toThrow();
  });
});
