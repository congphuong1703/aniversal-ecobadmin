import "server-only";

import type {
  LuckyNumberAssignmentInsert,
  LuckyNumberAssignmentRow,
  LuckyNumberPersistenceAdapter,
} from "@/lib/lucky-number-repository";

type MemoryStore = {
  rows: LuckyNumberAssignmentRow[];
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
    store = { rows: [] };
    allStores.set(scope, store);
  }

  return store;
}

export function resetE2eLuckyNumberState(scope: string) {
  stores().set(scope, { rows: [] });
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
      return getE2eLuckyNumberState(scope);
    },
  };
}
