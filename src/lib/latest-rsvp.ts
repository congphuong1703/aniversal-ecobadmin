import "server-only";

import { z } from "zod";

import { getSupabaseServerClient } from "@/lib/supabase/server";

export type LatestRsvpRow = {
  id: string;
  guest_id: string;
  attending: boolean;
  created_at: string;
};

const latestRsvpRowSchema = z.object({
  id: z.uuid(),
  guest_id: z.string().min(1).max(100),
  attending: z.boolean(),
  created_at: z.iso.datetime({ offset: true }),
});

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

export function compareRsvpRecency(
  left: LatestRsvpRow,
  right: LatestRsvpRow,
) {
  const leftTimestamp = timestampToMicroseconds(left.created_at);
  const rightTimestamp = timestampToMicroseconds(right.created_at);

  if (leftTimestamp !== rightTimestamp) {
    return leftTimestamp > rightTimestamp ? 1 : -1;
  }

  if (left.id === right.id) {
    return 0;
  }

  return left.id > right.id ? 1 : -1;
}

export function getLatestRsvpByGuest(rows: readonly LatestRsvpRow[]) {
  const latest = new Map<string, LatestRsvpRow>();

  for (const row of rows) {
    const existing = latest.get(row.guest_id);
    if (!existing || compareRsvpRecency(row, existing) > 0) {
      latest.set(row.guest_id, row);
    }
  }

  return latest;
}

export function getAttendingGuestIds(
  latest: ReadonlyMap<string, Pick<LatestRsvpRow, "attending">>,
) {
  return new Set(
    [...latest]
      .filter(([, row]) => row.attending)
      .map(([guestId]) => guestId),
  );
}

export async function listLatestRsvpSubmissions() {
  const rows: LatestRsvpRow[] = [];
  const pageSize = 1000;
  let cursor: Pick<LatestRsvpRow, "created_at" | "id"> | null = null;

  while (true) {
    let query = getSupabaseServerClient()
      .from("rsvp_submissions")
      .select("id, guest_id, attending, created_at")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(pageSize);

    if (cursor) {
      query = query.or(
        `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`,
      );
    }

    const { data, error } = await query;
    if (error) {
      throw new Error("Unable to list RSVP submissions.", { cause: error });
    }

    const page = z.array(latestRsvpRowSchema).parse(data ?? []);
    rows.push(...page);

    if (page.length < pageSize) {
      break;
    }

    const lastRow = page.at(-1);
    if (!lastRow) {
      break;
    }

    cursor = { created_at: lastRow.created_at, id: lastRow.id };
  }

  return [...getLatestRsvpByGuest(rows).values()];
}

export async function listAttendingGuestIds() {
  return getAttendingGuestIds(
    getLatestRsvpByGuest(await listLatestRsvpSubmissions()),
  );
}
