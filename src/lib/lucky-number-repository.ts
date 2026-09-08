import "server-only";

import { z } from "zod";

import type { GuestRecord } from "@/data/guests";
import { GUESTS } from "@/data/guests";
import { getE2eLuckyNumberPersistence } from "@/lib/e2e-lucky-number-state";
import { isE2eMemoryRepositoryEnabled } from "@/lib/e2e-mode";
import { getGuestDirectory } from "@/lib/guest-directory";
import {
  generateLuckyNumbers,
  type LuckyNumbers,
} from "@/lib/lucky-number";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const luckyNumberSchema = z.number().int().min(0).max(99);

export const luckyNumberAssignmentRowSchema = z.object({
  guest_id: z.string().min(1).max(100),
  numbers: z
    .array(luckyNumberSchema)
    .length(5)
    .refine((numbers) => new Set(numbers).size === numbers.length),
  created_at: z.iso.datetime({ offset: true }),
});

type ParsedLuckyNumberAssignmentRow = z.infer<
  typeof luckyNumberAssignmentRowSchema
>;

export type LuckyNumberAssignmentRow = Omit<
  ParsedLuckyNumberAssignmentRow,
  "numbers"
> & {
  numbers: LuckyNumbers;
};

export type LuckyNumberAssignmentInsert = Omit<
  LuckyNumberAssignmentRow,
  "created_at"
>;

export type LuckyNumberPersistenceAdapter = {
  findByGuestId(guestId: string): Promise<LuckyNumberAssignmentRow | null>;
  insertAssignment(
    input: LuckyNumberAssignmentInsert,
  ): Promise<LuckyNumberAssignmentRow>;
  listAssignments(): Promise<readonly LuckyNumberAssignmentRow[]>;
};

export type LuckyNumberRepository = {
  ensureAssignment(guestId: string): Promise<LuckyNumbers>;
  listAssignments(): Promise<readonly LuckyNumberAssignmentRow[]>;
};

function errorCode(error: unknown) {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }

  return typeof error.code === "string" ? error.code : undefined;
}

function parseAssignment(row: unknown) {
  return luckyNumberAssignmentRowSchema.parse(
    row,
  ) as unknown as LuckyNumberAssignmentRow;
}

function assignmentNumbers(row: LuckyNumberAssignmentRow): LuckyNumbers {
  return [
    row.numbers[0]!,
    row.numbers[1]!,
    row.numbers[2]!,
    row.numbers[3]!,
    row.numbers[4]!,
  ];
}

export function createLuckyNumberRepository(
  persistence: LuckyNumberPersistenceAdapter,
  guests: readonly GuestRecord[] = GUESTS,
): LuckyNumberRepository {
  async function ensureAssignment(guestId: string) {
    if (!guests.some(({ id }) => id === guestId)) {
      throw new Error(`Unknown guest ID: ${guestId}`);
    }

    const existing = await persistence.findByGuestId(guestId);

    if (existing) {
      return assignmentNumbers(parseAssignment(existing));
    }

    const input = {
      guest_id: guestId,
      numbers: generateLuckyNumbers(),
    } satisfies LuckyNumberAssignmentInsert;

    try {
      return assignmentNumbers(
        parseAssignment(await persistence.insertAssignment(input)),
      );
    } catch (error) {
      if (errorCode(error) === "23505") {
        const raced = await persistence.findByGuestId(guestId);

        if (raced) {
          return assignmentNumbers(parseAssignment(raced));
        }
      }

      throw persistenceError("create", error);
    }
  }

  return {
    ensureAssignment,

    async listAssignments() {
      return (await persistence.listAssignments()).map(parseAssignment);
    },
  };
}

function persistenceError(operation: string, cause: unknown) {
  return new Error(`Unable to ${operation} lucky number assignments.`, {
    cause,
  });
}

async function findProductionAssignment(guestId: string) {
  const { data, error } = await getSupabaseServerClient()
    .from("lucky_number_assignments")
    .select("guest_id, numbers, created_at")
    .eq("guest_id", guestId)
    .maybeSingle();

  if (error) {
    throw persistenceError("read", error);
  }

  return data ? parseAssignment(data) : null;
}

async function insertProductionAssignment(
  input: LuckyNumberAssignmentInsert,
): Promise<LuckyNumberAssignmentRow> {
  const { data, error } = await getSupabaseServerClient()
    .from("lucky_number_assignments")
    .insert(input)
    .select("guest_id, numbers, created_at")
    .single();

  if (error || !data) {
    const wrapped = persistenceError("create", error);
    if (errorCode(error) === "23505") {
      Object.assign(wrapped, { code: "23505" });
    }
    throw wrapped;
  }

  return parseAssignment(data);
}

const supabasePersistence: LuckyNumberPersistenceAdapter = {
  findByGuestId: findProductionAssignment,
  insertAssignment: insertProductionAssignment,

  async listAssignments() {
    const { data, error } = await getSupabaseServerClient()
      .from("lucky_number_assignments")
      .select("guest_id, numbers, created_at")
      .order("created_at", { ascending: true });

    if (error) {
      throw persistenceError("list", error);
    }

    return z.array(luckyNumberAssignmentRowSchema)
      .parse(data ?? [])
      .map(parseAssignment);
  },
};

const productionRepository = createLuckyNumberRepository(supabasePersistence);

type RepositoryEnvironment = {
  NODE_ENV?: string;
  E2E_REPOSITORY?: string;
};

type RepositorySelection<T> = {
  environment: RepositoryEnvironment;
  scope: string;
  production: T;
  createMemory: (scope: string) => T;
};

export function selectLuckyNumberRepository<T>({
  environment,
  scope,
  production,
  createMemory,
}: RepositorySelection<T>) {
  return isE2eMemoryRepositoryEnabled(environment)
    ? createMemory(scope)
    : production;
}

function activeRepository(scope = "default") {
  return selectLuckyNumberRepository({
    environment: process.env,
    scope,
    production: productionRepository,
    createMemory: (memoryScope) =>
      createLuckyNumberRepository(
        getE2eLuckyNumberPersistence(memoryScope),
        getGuestDirectory(),
      ),
  });
}

export function ensureLuckyNumberAssignment(
  guestId: string,
  scope?: string,
) {
  return activeRepository(scope).ensureAssignment(guestId);
}

export function listLuckyNumberAssignments(scope?: string) {
  return activeRepository(scope).listAssignments();
}
