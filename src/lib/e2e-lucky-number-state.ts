import "server-only";

import type {
  LuckyNumberAssignmentInsert,
  LuckyNumberAssignmentRow,
  LuckyNumberPersistenceAdapter,
} from "@/lib/lucky-number-repository";
import type {
  LuckyDrawPersistenceAdapter,
  LuckyDrawResultRow,
} from "@/lib/lucky-draw-repository";
import {
  clearE2eRsvpStatus,
  getE2eAttendingGuestIds,
} from "@/lib/e2e-rsvp-status";

type MemoryStore = {
  rows: LuckyNumberAssignmentRow[];
  drawRows: LuckyDrawResultRow[];
  drawLock: Promise<void>;
};

const E2E_STORES_KEY = "__ecobadmintonE2eLuckyNumberStores";

type GlobalWithE2eStores = typeof globalThis & {
  [E2E_STORES_KEY]?: Map<string, MemoryStore>;
};

function stores() {
  const globalState = globalThis as GlobalWithE2eStores;
  globalState[E2E_STORES_KEY] ??= new Map<string, MemoryStore>();
  return globalState[E2E_STORES_KEY];
}

function getStore(scope: string) {
  const allStores = stores();
  let store = allStores.get(scope);

  if (!store) {
    store = { rows: [], drawRows: [], drawLock: Promise.resolve() };
    allStores.set(scope, store);
  }

  return store;
}

export function resetE2eLuckyNumberState(scope: string) {
  clearE2eRsvpStatus(scope);
  stores().set(scope, {
    rows: [],
    drawRows: [],
    drawLock: Promise.resolve(),
  });
}

export async function getE2eLuckyNumberState(scope: string) {
  return [...getStore(scope).rows];
}

export function getE2eLuckyNumberPersistence(
  scope: string,
): LuckyNumberPersistenceAdapter {
  return {
    async findByGuestId(guestId) {
      return getStore(scope).rows.find((row) => row.guest_id === guestId) ?? null;
    },

    async insertAssignment(input: LuckyNumberAssignmentInsert) {
      const store = getStore(scope);
      const existing = store.rows.find((row) => row.guest_id === input.guest_id);

      if (existing) {
        throw Object.assign(new Error("duplicate guest"), { code: "23505" });
      }

      const row: LuckyNumberAssignmentRow = {
        ...input,
        created_at: new Date().toISOString(),
      };
      store.rows.push(row);
      return row;
    },

    async listAssignments() {
      const assignments = await getE2eLuckyNumberState(scope);
      const attendingGuestIds = getE2eAttendingGuestIds(scope);

      return attendingGuestIds
        ? assignments.filter(({ guest_id }) => attendingGuestIds.has(guest_id))
        : assignments;
    },
  };
}

export function getE2eLuckyDrawPersistence(
  scope: string,
): LuckyDrawPersistenceAdapter {
  return {
    async listAssignments() {
      const assignments = await getE2eLuckyNumberState(scope);
      const attendingGuestIds = getE2eAttendingGuestIds(scope);

      return attendingGuestIds
        ? assignments.filter(({ guest_id }) => attendingGuestIds.has(guest_id))
        : assignments;
    },

    async listResults() {
      return [...getStore(scope).drawRows];
    },

    async insertResult(input) {
      const store = getStore(scope);
      const duplicate = store.drawRows.some(
        (row) =>
          row.prize_rank === input.prize_rank ||
          row.winning_number === input.winning_number,
      );

      if (duplicate) {
        throw Object.assign(new Error("duplicate draw result"), {
          code: "23505",
        });
      }

      const row: LuckyDrawResultRow = {
        ...input,
        created_at: new Date().toISOString(),
      };
      store.drawRows.push(row);
      return row;
    },

    async withDrawLock<T>(operation: () => Promise<T>) {
      const store = getStore(scope);
      const previous = store.drawLock;
      let release!: () => void;
      store.drawLock = new Promise<void>((resolve) => {
        release = resolve;
      });

      await previous;
      try {
        return await operation();
      } finally {
        release();
      }
    },
  };
}
