import "server-only";

import { z } from "zod";

import type { GuestRecord } from "@/data/guests";
import { GUESTS } from "@/data/guests";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const rsvpSubmissionRowSchema = z.object({
  id: z.uuid(),
  guest_id: z.string().min(1).max(100),
  attending: z.boolean(),
  message: z.string().max(1000).nullable(),
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
  listSubmissions(): Promise<readonly RsvpSubmissionRow[]>;
};

export type RsvpRepository = {
  createSubmission(input: CreateSubmissionInput): Promise<RsvpSubmission>;
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
  const { data, error } = await insert();

  if (!error && data) {
    return rsvpSubmissionRowSchema.parse(data);
  }

  if (errorCode(error) === "23505") {
    const existing = await findExisting(input.client_submission_id);

    if (existing) {
      return existing;
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

function newestFirst(left: RsvpSubmissionRow, right: RsvpSubmissionRow) {
  return (
    Date.parse(right.created_at) - Date.parse(left.created_at) ||
    right.id.localeCompare(left.id)
  );
}

export function createRsvpRepository(
  persistence: RsvpPersistenceAdapter,
  guests: readonly GuestRecord[] = GUESTS,
): RsvpRepository {
  return {
    async createSubmission(input) {
      if (!guests.some(({ id }) => id === input.guestId)) {
        throw new Error(`Unknown guest ID: ${input.guestId}`);
      }

      const existing = await persistence.findByClientSubmissionId(
        input.clientSubmissionId,
      );

      if (existing) {
        return mapSubmission(existing);
      }

      const created = await persistence.insertSubmission({
        guest_id: input.guestId,
        attending: input.attending,
        message: input.message ?? null,
        client_submission_id: input.clientSubmissionId,
      });

      return mapSubmission(created);
    },

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

const supabasePersistence: RsvpPersistenceAdapter = {
  async findByClientSubmissionId(clientSubmissionId) {
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
  },

  async insertSubmission(input) {
    return insertSubmissionWithRaceRecovery(
      input,
      async () =>
        getSupabaseServerClient()
          .from("rsvp_submissions")
          .insert(input)
          .select(
            "id, guest_id, attending, message, client_submission_id, created_at",
          )
          .single(),
      (clientSubmissionId) => this.findByClientSubmissionId(clientSubmissionId),
    );
  },

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

export function getAdminDashboard() {
  return productionRepository.getAdminDashboard();
}
