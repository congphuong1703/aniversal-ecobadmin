import "server-only";

import type { GuestRecord } from "@/data/guests";
import { GUESTS } from "@/data/guests";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type RsvpSubmissionRow = {
  id: string;
  guest_id: string;
  attending: boolean;
  message: string | null;
  client_submission_id: string;
  created_at: string;
};

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

    return data as RsvpSubmissionRow | null;
  },

  async insertSubmission(input) {
    const { data, error } = await getSupabaseServerClient()
      .from("rsvp_submissions")
      .insert(input)
      .select(
        "id, guest_id, attending, message, client_submission_id, created_at",
      )
      .single();

    if (!error && data) {
      return data as RsvpSubmissionRow;
    }

    if (error?.code === "23505") {
      const existing = await this.findByClientSubmissionId(
        input.client_submission_id,
      );

      if (existing) {
        return existing;
      }
    }

    throw persistenceError("create", error);
  },

  async listSubmissions() {
    const { data, error } = await getSupabaseServerClient()
      .from("rsvp_submissions")
      .select(
        "id, guest_id, attending, message, client_submission_id, created_at",
      )
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });

    if (error) {
      throw persistenceError("list", error);
    }

    return (data ?? []) as RsvpSubmissionRow[];
  },
};

const productionRepository = createRsvpRepository(supabasePersistence);

export function createSubmission(input: CreateSubmissionInput) {
  return productionRepository.createSubmission(input);
}

export function getAdminDashboard() {
  return productionRepository.getAdminDashboard();
}
