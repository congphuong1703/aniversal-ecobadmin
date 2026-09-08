// @vitest-environment node

import { describe, expect, it } from "vitest";

import {
  createLuckyNumberRepository,
  type LuckyNumberAssignmentRow,
  type LuckyNumberPersistenceAdapter,
} from "./lucky-number-repository";

const GUEST_ID = "guest-01";
const CREATED_AT = "2026-09-08T12:00:00.000Z";
const ASSIGNMENT = [12, 1, 22, 53, 52] as const;

function createMemoryAdapter(
  initialRows: LuckyNumberAssignmentRow[] = [],
): LuckyNumberPersistenceAdapter {
  const rows = [...initialRows];
  let insertAttempts = 0;

  return {
    async findByGuestId(guestId) {
      return rows.find((row) => row.guest_id === guestId) ?? null;
    },
    async insertAssignment(input) {
      insertAttempts += 1;
      if (insertAttempts === 1 && rows.length > 0) {
        throw Object.assign(new Error("duplicate guest"), { code: "23505" });
      }

      const row = {
        ...input,
        created_at: CREATED_AT,
      };
      rows.push(row);
      return row;
    },
    async listAssignments() {
      return [...rows];
    },
  };
}

describe("Lucky number repository", () => {
  it("creates and returns one assignment for a guest", async () => {
    const repository = createLuckyNumberRepository(createMemoryAdapter());

    const numbers = await repository.ensureAssignment(GUEST_ID);

    expect(numbers).toHaveLength(5);
    expect(new Set(numbers).size).toBe(5);
    expect(numbers.every((number) => number >= 0 && number <= 99)).toBe(true);
    await expect(repository.listAssignments()).resolves.toEqual([
      expect.objectContaining({ guest_id: GUEST_ID, numbers }),
    ]);
  });

  it("returns the same assignment on the second call", async () => {
    const repository = createLuckyNumberRepository(createMemoryAdapter());

    const first = await repository.ensureAssignment(GUEST_ID);
    const second = await repository.ensureAssignment(GUEST_ID);

    expect(second).toEqual(first);
    await expect(repository.listAssignments()).resolves.toHaveLength(1);
  });

  it("recovers an assignment after a unique-key insert conflict", async () => {
    const existing = {
      guest_id: GUEST_ID,
      numbers: ASSIGNMENT,
      created_at: CREATED_AT,
    } satisfies LuckyNumberAssignmentRow;
    let reads = 0;
    const adapter: LuckyNumberPersistenceAdapter = {
      async findByGuestId() {
        reads += 1;
        return reads === 1 ? null : existing;
      },
      async insertAssignment() {
        throw Object.assign(new Error("duplicate guest"), { code: "23505" });
      },
      async listAssignments() {
        return [existing];
      },
    };
    const repository = createLuckyNumberRepository(adapter);

    await expect(repository.ensureAssignment(GUEST_ID)).resolves.toEqual(
      ASSIGNMENT,
    );
    expect(reads).toBe(2);
  });

  it("rejects malformed persisted rows at the repository boundary", async () => {
    const malformed = {
      guest_id: GUEST_ID,
      numbers: [12, 12, 22, 53, 52],
      created_at: CREATED_AT,
    } as unknown as LuckyNumberAssignmentRow;
    const repository = createLuckyNumberRepository(
      createMemoryAdapter([malformed]),
    );

    await expect(repository.ensureAssignment(GUEST_ID)).rejects.toThrow();
    await expect(repository.listAssignments()).rejects.toThrow();
  });
});
