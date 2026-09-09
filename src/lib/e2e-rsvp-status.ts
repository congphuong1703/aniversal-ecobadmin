import "server-only";

import {
  getAttendingGuestIds,
  getLatestRsvpByGuest,
  type LatestRsvpRow,
} from "@/lib/latest-rsvp";

const E2E_STATUS_KEY = "__ecobadmintonE2eRsvpStatus";

type GlobalWithE2eStatus = typeof globalThis & {
  [E2E_STATUS_KEY]?: Map<string, LatestRsvpRow[]>;
};

function stores() {
  const globalState = globalThis as GlobalWithE2eStatus;
  globalState[E2E_STATUS_KEY] ??= new Map<string, LatestRsvpRow[]>();
  return globalState[E2E_STATUS_KEY];
}

export function resetE2eRsvpStatus(
  scope: string,
  rows: readonly LatestRsvpRow[] = [],
) {
  stores().set(scope, [...rows]);
}

export function clearE2eRsvpStatus(scope: string) {
  stores().delete(scope);
}

export function recordE2eRsvpStatus(scope: string, row: LatestRsvpRow) {
  const current = stores().get(scope) ?? [];
  current.push(row);
  stores().set(scope, current);
}

export function getE2eAttendingGuestIds(scope: string) {
  const rows = stores().get(scope);

  if (!rows) {
    return null;
  }

  return getAttendingGuestIds(getLatestRsvpByGuest(rows));
}
