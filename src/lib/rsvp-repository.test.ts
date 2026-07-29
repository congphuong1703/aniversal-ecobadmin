import { describe, expect, it } from "vitest";

import { GUEST_FIXTURES } from "@/test/fixtures";
import { envSchema } from "./env";
import {
  collectSubmissionPages,
  createRsvpRepository,
  insertSubmissionWithRaceRecovery,
  insertSubmissionWithRaceRecoveryMetadata,
  rsvpSubmissionRowSchema,
  SubmissionIdConflictError,
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

  async function insertSubmission(input: RsvpSubmissionInsert) {
    insertCount += 1;
    const row = makeRow(input, {
      id: `00000000-0000-4000-8000-${String(insertCount).padStart(12, "0")}`,
      created_at: `2026-07-29T00:00:0${insertCount}.000Z`,
    });
    rows.push(row);
    return row;
  }

  const adapter: RsvpPersistenceAdapter = {
    async findByClientSubmissionId(clientSubmissionId) {
      return (
        rows.find((row) => row.client_submission_id === clientSubmissionId) ??
        null
      );
    },
    insertSubmission,
    async insertSubmissionWithMetadata(input) {
      return { row: await insertSubmission(input), deduplicated: false };
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
  it("reports whether a submission was deduplicated without changing createSubmission", async () => {
    const memory = createMemoryAdapter();
    const repository = createRsvpRepository(memory.adapter, GUEST_FIXTURES);
    const input = {
      guestId: "guest-01",
      attending: true,
      message: null,
      clientSubmissionId: "10000000-0000-4000-8000-000000000009",
    };

    await expect(
      repository.createSubmissionWithMetadata(input),
    ).resolves.toEqual({
      submission: expect.objectContaining({
        clientSubmissionId: input.clientSubmissionId,
      }),
      deduplicated: false,
    });
    await expect(
      repository.createSubmissionWithMetadata(input),
    ).resolves.toEqual({
      submission: expect.objectContaining({
        clientSubmissionId: input.clientSubmissionId,
      }),
      deduplicated: true,
    });
    await expect(repository.createSubmission(input)).resolves.toEqual(
      expect.objectContaining({ clientSubmissionId: input.clientSubmissionId }),
    );
    expect(memory.insertCount).toBe(1);
  });

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

  it("rejects a pre-existing submission id owned by another guest", async () => {
    const clientSubmissionId = "10000000-0000-4000-8000-000000000004";
    const memory = createMemoryAdapter([
      makeRow(
        {
          guest_id: "guest-01",
          attending: false,
          message: "Private response",
          client_submission_id: clientSubmissionId,
        },
        {
          id: "20000000-0000-4000-8000-000000000004",
          created_at: "2026-07-29T00:00:00.000Z",
        },
      ),
    ]);
    const repository = createRsvpRepository(memory.adapter, GUEST_FIXTURES);

    await expect(
      repository.createSubmissionWithMetadata({
        guestId: "guest-02",
        attending: true,
        message: "Different response",
        clientSubmissionId,
      }),
    ).rejects.toBeInstanceOf(SubmissionIdConflictError);
    expect(memory.insertCount).toBe(0);
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

  it("preserves PostgreSQL microseconds before using the id tie-breaker", async () => {
    const memory = createMemoryAdapter([
      makeRow(
        {
          guest_id: "guest-01",
          attending: false,
          message: null,
          client_submission_id: "70000000-0000-4000-8000-000000000003",
        },
        {
          id: "f0000000-0000-4000-8000-000000000001",
          created_at: "2026-07-29T03:00:00.123456Z",
        },
      ),
      makeRow(
        {
          guest_id: "guest-01",
          attending: true,
          message: null,
          client_submission_id: "70000000-0000-4000-8000-000000000004",
        },
        {
          id: "10000000-0000-4000-8000-000000000002",
          created_at: "2026-07-29T03:00:00.123999Z",
        },
      ),
    ]);
    const repository = createRsvpRepository(memory.adapter, GUEST_FIXTURES);

    const dashboard = await repository.getAdminDashboard();
    const guest = dashboard.guests.find(({ id }) => id === "guest-01");

    expect(guest?.currentSubmission?.createdAt).toBe(
      "2026-07-29T03:00:00.123999Z",
    );
  });

  it("collects every persistence page using the last row as its cursor", async () => {
    const rows = [1, 2, 3, 4, 5].map((value) =>
      makeRow(
        {
          guest_id: "guest-01",
          attending: true,
          message: null,
          client_submission_id: `90000000-0000-4000-8000-${String(value).padStart(12, "0")}`,
        },
        {
          id: `a0000000-0000-4000-8000-${String(value).padStart(12, "0")}`,
          created_at: `2026-07-29T05:00:0${6 - value}.000Z`,
        },
      ),
    );
    const seenCursors: Array<{ createdAt: string; id: string } | null> = [];

    const collected = await collectSubmissionPages(async (cursor, pageSize) => {
      seenCursors.push(cursor);
      const start = cursor
        ? rows.findIndex(({ id }) => id === cursor.id) + 1
        : 0;
      return rows.slice(start, start + pageSize);
    }, 2);

    expect(collected).toEqual(rows);
    expect(seenCursors).toEqual([
      null,
      { createdAt: rows[1].created_at, id: rows[1].id },
      { createdAt: rows[3].created_at, id: rows[3].id },
    ]);
  });

  it("recovers the winning row after an insert uniqueness race", async () => {
    const input: RsvpSubmissionInsert = {
      guest_id: "guest-01",
      attending: true,
      message: null,
      client_submission_id: "b0000000-0000-4000-8000-000000000001",
    };
    const winner = makeRow(input, {
      id: "c0000000-0000-4000-8000-000000000001",
      created_at: "2026-07-29T06:00:00.000Z",
    });
    const lookedUpIds: string[] = [];

    const result = await insertSubmissionWithRaceRecovery(
      input,
      async () => ({ data: null, error: { code: "23505" } }),
      async (clientSubmissionId) => {
        lookedUpIds.push(clientSubmissionId);
        return winner;
      },
    );

    expect(result).toEqual(winner);
    expect(lookedUpIds).toEqual([input.client_submission_id]);
  });

  it("marks a uniqueness-race recovery as deduplicated", async () => {
    const input: RsvpSubmissionInsert = {
      guest_id: "guest-01",
      attending: true,
      message: null,
      client_submission_id: "b0000000-0000-4000-8000-000000000010",
    };
    const winner = makeRow(input, {
      id: "c0000000-0000-4000-8000-000000000010",
      created_at: "2026-07-29T06:00:00.000Z",
    });

    await expect(
      insertSubmissionWithRaceRecoveryMetadata(
        input,
        async () => ({ data: null, error: { code: "23505" } }),
        async () => winner,
      ),
    ).resolves.toEqual({ row: winner, deduplicated: true });
  });

  it("rejects a uniqueness-race winner owned by another guest", async () => {
    const input: RsvpSubmissionInsert = {
      guest_id: "guest-02",
      attending: true,
      message: "Different response",
      client_submission_id: "b0000000-0000-4000-8000-000000000011",
    };
    const winner = makeRow(
      {
        ...input,
        guest_id: "guest-01",
        attending: false,
        message: "Private response",
      },
      {
        id: "c0000000-0000-4000-8000-000000000011",
        created_at: "2026-07-29T06:00:00.000Z",
      },
    );

    await expect(
      insertSubmissionWithRaceRecoveryMetadata(
        input,
        async () => ({ data: null, error: { code: "23505" } }),
        async () => winner,
      ),
    ).rejects.toBeInstanceOf(SubmissionIdConflictError);
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
      verifyInputSchema.parse({
        guestId: " guest-01 ",
        name: " Nguyễn Văn An ",
      }),
    ).toEqual({ guestId: "guest-01", name: "Nguyễn Văn An" });
    expect(
      rsvpInputSchema.parse({
        verificationToken: " signed-token ",
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

  it("bounds non-message request strings", () => {
    expect(() =>
      verifyInputSchema.parse({ guestId: "g".repeat(101), name: "Guest" }),
    ).toThrow();
    expect(() =>
      verifyInputSchema.parse({ guestId: "guest-01", name: "n".repeat(201) }),
    ).toThrow();
    expect(() =>
      rsvpInputSchema.parse({
        verificationToken: "t".repeat(4097),
        attending: true,
        clientSubmissionId: "60000000-0000-4000-8000-000000000002",
      }),
    ).toThrow();
    expect(() =>
      loginInputSchema.parse({ password: "p".repeat(257) }),
    ).toThrow();
  });

  it("counts message limits in Unicode code points like PostgreSQL", () => {
    const validInput = {
      verificationToken: "signed-token",
      attending: true,
      message: "🙂".repeat(1000),
      clientSubmissionId: "60000000-0000-4000-8000-000000000003",
    };
    const validRow = {
      id: "c0000000-0000-4000-8000-000000000003",
      guest_id: "guest-01",
      attending: true,
      message: validInput.message,
      client_submission_id: validInput.clientSubmissionId,
      created_at: "2026-07-29T06:00:00.000Z",
    };

    expect(rsvpInputSchema.parse(validInput).message).toBe(validInput.message);
    expect(rsvpSubmissionRowSchema.parse(validRow).message).toBe(
      validInput.message,
    );
    expect(
      rsvpInputSchema.safeParse({
        ...validInput,
        message: "🙂".repeat(1001),
      }).success,
    ).toBe(false);
    expect(
      rsvpSubmissionRowSchema.safeParse({
        ...validRow,
        message: "🙂".repeat(1001),
      }).success,
    ).toBe(false);
    expect(
      rsvpInputSchema.parse({ ...validInput, message: null }).message,
    ).toBe(null);
  });

  it("validates rows returned by external persistence", () => {
    const validRow = {
      id: "c0000000-0000-4000-8000-000000000002",
      guest_id: "guest-01",
      attending: true,
      message: null,
      client_submission_id: "b0000000-0000-4000-8000-000000000002",
      created_at: "2026-07-29T06:00:00.000Z",
    };

    expect(rsvpSubmissionRowSchema.parse(validRow)).toEqual(validRow);
    expect(() =>
      rsvpSubmissionRowSchema.parse({
        ...validRow,
        created_at: "not-a-timestamp",
      }),
    ).toThrow();
  });
});
