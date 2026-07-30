import "server-only";

import type {
  RsvpPersistenceAdapter,
  RsvpSubmissionInsert,
  RsvpSubmissionRow,
} from "@/lib/rsvp-repository";

type MemoryStore = {
  rows: RsvpSubmissionRow[];
  sequence: number;
};

const E2E_STORES_KEY = "__ecobadmintonE2eRsvpStores";

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
    store = { rows: [], sequence: 0 };
    allStores.set(scope, store);
  }

  return store;
}

function createDeterministicRow(
  store: MemoryStore,
  input: RsvpSubmissionInsert,
): RsvpSubmissionRow {
  store.sequence += 1;
  const sequence = String(store.sequence).padStart(12, "0");
  const createdAt = new Date(
    Date.UTC(2026, 8, 17, 12, 0, 0) + store.sequence * 1000,
  ).toISOString();

  return {
    ...input,
    id: `e2e00000-0000-4000-8000-${sequence}`,
    created_at: createdAt,
  };
}

export function resetE2eRsvpState(
  scope: string,
  submissions: readonly RsvpSubmissionInsert[] = [],
) {
  const store: MemoryStore = { rows: [], sequence: 0 };

  for (const submission of submissions) {
    store.rows.push(createDeterministicRow(store, submission));
  }

  stores().set(scope, store);
}

export async function getE2eRsvpState(scope: string) {
  return [...getStore(scope).rows];
}

export function getE2eRsvpPersistence(scope: string): RsvpPersistenceAdapter {
  async function findByClientSubmissionId(clientSubmissionId: string) {
    return (
      getStore(scope).rows.find(
        (row) => row.client_submission_id === clientSubmissionId,
      ) ?? null
    );
  }

  async function insertSubmissionWithMetadata(input: RsvpSubmissionInsert) {
    const store = getStore(scope);
    const existing =
      store.rows.find(
        (row) => row.client_submission_id === input.client_submission_id,
      ) ?? null;

    if (existing) {
      return { row: existing, deduplicated: true };
    }

    const row = createDeterministicRow(store, input);
    store.rows.push(row);
    return { row, deduplicated: false };
  }

  return {
    findByClientSubmissionId,

    async insertSubmission(input) {
      return (await insertSubmissionWithMetadata(input)).row;
    },

    insertSubmissionWithMetadata,

    async listSubmissions() {
      return getE2eRsvpState(scope);
    },
  };
}
