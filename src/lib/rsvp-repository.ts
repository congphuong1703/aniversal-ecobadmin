import "server-only";

import { z } from "zod";

import type { GuestRecord } from "@/data/guests";
import { GUESTS } from "@/data/guests";
import { rsvpMessageSchema } from "@/lib/rsvp-schema";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const rsvpSubmissionRowSchema = z.object({
  id: z.uuid(),
  guest_id: z.string().min(1).max(100),
  attending: z.boolean(),
  message: rsvpMessageSchema.nullable(),
  client_submission_id: z.uuid(),
  created_at: z.iso.datetime({ offset: true }),
});

export type RsvpSubmissionRow = z.infer<typeof rsvpSubmissionRowSchema>;

export type RsvpSubmissionInsert = Omit<RsvpSubmissionRow, "id" | "created_at">;

export type RsvpSubmission = {
  id: string;
  guestId: string;
  attending: boolean;
  message: string | null;
  clientSubmissionId: string;
  createdAt: string;
};

export type CreateSubmissionInput = {
  guestId: string;
  attending: boolean;
  message?: string | null;
  clientSubmissionId: string;
};

export type AdminGuestRow = GuestRecord & {
  currentSubmission: RsvpSubmission | null;
  history: RsvpSubmission[];
};

export type DashboardSummary = {
  total: number;
  attending: number;
  declined: number;
  pending: number;
};

export type AdminDashboard = {
  summary: DashboardSummary;
  guests: AdminGuestRow[];
};

export type RsvpPersistenceAdapter = {
  findByClientSubmissionId(
    clientSubmissionId: string,
  ): Promise<RsvpSubmissionRow | null>;
  insertSubmission(input: RsvpSubmissionInsert): Promise<RsvpSubmissionRow>;
  insertSubmissionWithMetadata(
    input: RsvpSubmissionInsert,
  ): Promise<{ row: RsvpSubmissionRow; deduplicated: boolean }>;
  listSubmissions(): Promise<readonly RsvpSubmissionRow[]>;
};

export type RsvpRepository = {
  createSubmission(input: CreateSubmissionInput): Promise<RsvpSubmission>;
  createSubmissionWithMetadata(
    input: CreateSubmissionInput,
  ): Promise<{ submission: RsvpSubmission; deduplicated: boolean }>;
  getAdminDashboard(): Promise<AdminDashboard>;
};

export type SubmissionCursor = {
  createdAt: string;
  id: string;
};

export type SubmissionPageLoader = (
  cursor: SubmissionCursor | null,
  pageSize: number,
) => Promise<readonly RsvpSubmissionRow[]>;

export async function collectSubmissionPages(
  loadPage: SubmissionPageLoader,
  pageSize = 1000,
): Promise<RsvpSubmissionRow[]> {
  const rows: RsvpSubmissionRow[] = [];
  let cursor: SubmissionCursor | null = null;

  while (true) {
    const page = await loadPage(cursor, pageSize);
    rows.push(...page);

    if (page.length < pageSize) {
      return rows;
    }

    const lastRow = page.at(-1);

    if (!lastRow) {
      return rows;
    }

    cursor = { createdAt: lastRow.created_at, id: lastRow.id };
  }
}

type InsertSubmissionResult = {
  data: unknown;
  error: unknown;
};

function errorCode(error: unknown) {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }

  return typeof error.code === "string" ? error.code : undefined;
}

export async function insertSubmissionWithRaceRecovery(
  input: RsvpSubmissionInsert,
  insert: () => Promise<InsertSubmissionResult>,
  findExisting: (
    clientSubmissionId: string,
  ) => Promise<RsvpSubmissionRow | null>,
): Promise<RsvpSubmissionRow> {
  const result = await insertSubmissionWithRaceRecoveryMetadata(
    input,
    insert,
    findExisting,
  );

  return result.row;
}

export async function insertSubmissionWithRaceRecoveryMetadata(
  input: RsvpSubmissionInsert,
  insert: () => Promise<InsertSubmissionResult>,
  findExisting: (
    clientSubmissionId: string,
  ) => Promise<RsvpSubmissionRow | null>,
): Promise<{ row: RsvpSubmissionRow; deduplicated: boolean }> {
  const { data, error } = await insert();

  if (!error && data) {
    return {
      row: rsvpSubmissionRowSchema.parse(data),
      deduplicated: false,
    };
  }

  if (errorCode(error) === "23505") {
    const existing = await findExisting(input.client_submission_id);

    if (existing) {
      return { row: existing, deduplicated: true };
    }
  }

  throw persistenceError("create", error);
}

function mapSubmission(row: RsvpSubmissionRow): RsvpSubmission {
  return {
    id: row.id,
    guestId: row.guest_id,
    attending: row.attending,
    message: row.message,
    clientSubmissionId: row.client_submission_id,
    createdAt: row.created_at,
  };
}

function timestampToMicroseconds(timestamp: string) {
  const match = /^(.*?)(?:\.(\d+))?(Z|[+-]\d{2}:\d{2})$/.exec(timestamp);

  if (!match) {
    throw new Error(`Invalid timestamp: ${timestamp}`);
  }

  const [, wholeSecond, fraction = "", offset] = match;
  const milliseconds = Date.parse(`${wholeSecond}${offset}`);
  const microseconds = fraction.padEnd(6, "0").slice(0, 6);

  return BigInt(milliseconds) * BigInt(1000) + BigInt(microseconds || "0");
}

function newestFirst(left: RsvpSubmissionRow, right: RsvpSubmissionRow) {
  const leftTimestamp = timestampToMicroseconds(left.created_at);
  const rightTimestamp = timestampToMicroseconds(right.created_at);

  if (leftTimestamp !== rightTimestamp) {
    return leftTimestamp > rightTimestamp ? -1 : 1;
  }

  return right.id.localeCompare(left.id);
}

export function createRsvpRepository(
  persistence: RsvpPersistenceAdapter,
  guests: readonly GuestRecord[] = GUESTS,
): RsvpRepository {
  async function createSubmissionWithMetadata(input: CreateSubmissionInput) {
    if (!guests.some(({ id }) => id === input.guestId)) {
      throw new Error(`Unknown guest ID: ${input.guestId}`);
    }

    const existing = await persistence.findByClientSubmissionId(
      input.clientSubmissionId,
    );

    if (existing) {
      return { submission: mapSubmission(existing), deduplicated: true };
    }

    const insert = {
      guest_id: input.guestId,
      attending: input.attending,
      message: input.message ?? null,
      client_submission_id: input.clientSubmissionId,
    };
    const result = await persistence.insertSubmissionWithMetadata(insert);

    return {
      submission: mapSubmission(result.row),
      deduplicated: result.deduplicated,
    };
  }

  return {
    async createSubmission(input) {
      return (await createSubmissionWithMetadata(input)).submission;
    },

    createSubmissionWithMetadata,

    async getAdminDashboard() {
      const rowsByGuestId = new Map<string, RsvpSubmissionRow[]>();

      for (const row of await persistence.listSubmissions()) {
        const guestRows = rowsByGuestId.get(row.guest_id) ?? [];
        guestRows.push(row);
        rowsByGuestId.set(row.guest_id, guestRows);
      }

      const dashboardGuests = guests.map<AdminGuestRow>((guest) => {
        const history = (rowsByGuestId.get(guest.id) ?? [])
          .sort(newestFirst)
          .map(mapSubmission);

        return {
          ...guest,
          currentSubmission: history[0] ?? null,
          history,
        };
      });
      const attending = dashboardGuests.filter(
        ({ currentSubmission }) => currentSubmission?.attending === true,
      ).length;
      const declined = dashboardGuests.filter(
        ({ currentSubmission }) => currentSubmission?.attending === false,
      ).length;

      return {
        summary: {
          total: dashboardGuests.length,
          attending,
          declined,
          pending: dashboardGuests.length - attending - declined,
        },
        guests: dashboardGuests,
      };
    },
  };
}

function persistenceError(operation: string, cause: unknown) {
  return new Error(`Unable to ${operation} RSVP submissions.`, { cause });
}

async function findProductionSubmission(clientSubmissionId: string) {
  const { data, error } = await getSupabaseServerClient()
    .from("rsvp_submissions")
    .select(
      "id, guest_id, attending, message, client_submission_id, created_at",
    )
    .eq("client_submission_id", clientSubmissionId)
    .maybeSingle();

  if (error) {
    throw persistenceError("read", error);
  }

  return data ? rsvpSubmissionRowSchema.parse(data) : null;
}

function insertProductionSubmission(input: RsvpSubmissionInsert) {
  return insertSubmissionWithRaceRecoveryMetadata(
    input,
    async () =>
      getSupabaseServerClient()
        .from("rsvp_submissions")
        .insert(input)
        .select(
          "id, guest_id, attending, message, client_submission_id, created_at",
        )
        .single(),
    findProductionSubmission,
  );
}

const supabasePersistence: RsvpPersistenceAdapter = {
  findByClientSubmissionId: findProductionSubmission,

  async insertSubmission(input) {
    return (await insertProductionSubmission(input)).row;
  },

  insertSubmissionWithMetadata: insertProductionSubmission,

  async listSubmissions() {
    return collectSubmissionPages(async (cursor, pageSize) => {
      let query = getSupabaseServerClient()
        .from("rsvp_submissions")
        .select(
          "id, guest_id, attending, message, client_submission_id, created_at",
        )
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(pageSize);

      if (cursor) {
        query = query.or(
          `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
        );
      }

      const { data, error } = await query;

      if (error) {
        throw persistenceError("list", error);
      }

      return z.array(rsvpSubmissionRowSchema).parse(data ?? []);
    });
  },
};

const productionRepository = createRsvpRepository(supabasePersistence);

export function createSubmission(input: CreateSubmissionInput) {
  return productionRepository.createSubmission(input);
}

export function createSubmissionWithMetadata(input: CreateSubmissionInput) {
  return productionRepository.createSubmissionWithMetadata(input);
}

export function getAdminDashboard() {
  return productionRepository.getAdminDashboard();
}
