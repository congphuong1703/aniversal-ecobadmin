import "server-only";

import { randomInt } from "node:crypto";
import { z } from "zod";

import type { GuestRecord } from "@/data/guests";
import { GUESTS } from "@/data/guests";
import { DRAW_PRIZES } from "@/data/draw-prizes";
import { getE2eLuckyDrawPersistence } from "@/lib/e2e-lucky-number-state";
import { isE2eMemoryRepositoryEnabled } from "@/lib/e2e-mode";
import { getGuestDirectory } from "@/lib/guest-directory";
import {
  isEligibleOwnerCount,
  selectEligibleNumber,
  type LuckyNumber,
  type RandomIndex,
} from "@/lib/lucky-number";
import {
  listLuckyNumberAssignments,
  type LuckyNumberAssignmentRow,
} from "@/lib/lucky-number-repository";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export type LuckyDrawResultRow = {
  prize_rank: number;
  winning_number: number;
  created_at: string;
};

export type LuckyDrawResult = {
  prizeRank: number;
  prizeKey: string;
  label: string;
  reward?: string;
  winningNumber: number;
  winners: readonly string[];
  createdAt: string;
};

export type LuckyDrawEntry = {
  prizeRank: number;
  prizeKey: string;
  label: string;
  reward?: string;
  result: LuckyDrawResult | null;
};

export type LuckyDrawState = {
  draws: readonly LuckyDrawEntry[];
};

export class NoEligibleLuckyNumberError extends Error {
  readonly code = "NO_ELIGIBLE_LUCKY_NUMBER";

  constructor() {
    super("No eligible lucky number is available.");
    this.name = "NoEligibleLuckyNumberError";
  }
}

export class AllPrizesDrawnError extends Error {
  readonly code = "ALL_PRIZES_DRAWN";

  constructor() {
    super("All prizes have already been drawn.");
    this.name = "AllPrizesDrawnError";
  }
}

const resultRowSchema = z.object({
  prize_rank: z.number().int().min(1).max(5),
  winning_number: z.number().int().min(0).max(99),
  created_at: z.iso.datetime({ offset: true }),
});

export type LuckyDrawResultInsert = Pick<
  LuckyDrawResultRow,
  "prize_rank" | "winning_number"
>;

export type LuckyDrawPersistenceAdapter = {
  listAssignments(): Promise<readonly LuckyNumberAssignmentRow[]>;
  listResults(): Promise<readonly LuckyDrawResultRow[]>;
  insertResult(input: LuckyDrawResultInsert): Promise<LuckyDrawResultRow>;
  withDrawLock?<T>(operation: () => Promise<T>): Promise<T>;
  drawNextAtomic?(): Promise<LuckyDrawResultRow>;
};

export type LuckyDrawRepository = {
  getState(): Promise<LuckyDrawState>;
  getAdminState(): Promise<LuckyDrawState>;
  drawNext(): Promise<LuckyDrawResult>;
};

type LuckyDrawRepositoryOptions = {
  guests?: readonly GuestRecord[];
  randomIndex?: RandomIndex;
};

function parseResult(row: unknown) {
  return resultRowSchema.parse(row) as LuckyDrawResultRow;
}

function prizeForRank(rank: number) {
  return DRAW_PRIZES.find((prize) => prize.rank === rank)!;
}

function prizeReward(prize: ReturnType<typeof prizeForRank>) {
  return "reward" in prize ? prize.reward : undefined;
}

function mapResult(
  row: LuckyDrawResultRow,
  assignments: readonly LuckyNumberAssignmentRow[],
  guests: readonly GuestRecord[],
): LuckyDrawResult {
  const prize = prizeForRank(row.prize_rank);
  const guestNames = new Map(guests.map((guest) => [guest.id, guest.fullName]));
  const winners = assignments
    .filter(({ numbers }) => numbers.includes(row.winning_number))
    .map(({ guest_id }) => guestNames.get(guest_id))
    .filter((name): name is string => name !== undefined);

  return {
    prizeRank: row.prize_rank,
    prizeKey: prize.key,
    label: prize.label,
    ...(prizeReward(prize) ? { reward: prizeReward(prize) } : {}),
    winningNumber: row.winning_number,
    winners,
    createdAt: row.created_at,
  };
}

function mapState(
  rows: readonly LuckyDrawResultRow[],
  assignments: readonly LuckyNumberAssignmentRow[],
  guests: readonly GuestRecord[],
): LuckyDrawState {
  const resultsByRank = new Map(
    rows.map((row) => [row.prize_rank, parseResult(row)]),
  );

  return {
    draws: DRAW_PRIZES.map((prize) => {
      const row = resultsByRank.get(prize.rank);
      return {
        prizeRank: prize.rank,
        prizeKey: prize.key,
        label: prize.label,
        ...(prizeReward(prize) ? { reward: prizeReward(prize) } : {}),
        result: row ? mapResult(row, assignments, guests) : null,
      };
    }),
  };
}

function ownerCounts(assignments: readonly LuckyNumberAssignmentRow[]) {
  const owners = new Map<LuckyNumber, Set<string>>();

  for (const assignment of assignments) {
    for (const number of assignment.numbers) {
      const guestIds = owners.get(number) ?? new Set<string>();
      guestIds.add(assignment.guest_id);
      owners.set(number, guestIds);
    }
  }

  return new Map(
    [...owners].map(([number, guestIds]) => [number, guestIds.size]),
  );
}

function persistenceError(operation: string, cause: unknown) {
  return new Error(`Unable to ${operation} lucky draws.`, { cause });
}

function drawError(error: unknown) {
  if (error instanceof NoEligibleLuckyNumberError || error instanceof AllPrizesDrawnError) {
    return error;
  }

  const message =
    typeof error === "object" && error !== null && "message" in error
      ? error.message
      : undefined;

  if (message === "NO_ELIGIBLE_LUCKY_NUMBER") {
    return new NoEligibleLuckyNumberError();
  }

  if (message === "ALL_PRIZES_DRAWN") {
    return new AllPrizesDrawnError();
  }

  return persistenceError("draw", error);
}

export function createLuckyDrawRepository(
  persistence: LuckyDrawPersistenceAdapter,
  options: LuckyDrawRepositoryOptions = {},
): LuckyDrawRepository {
  const guests = options.guests ?? GUESTS;
  const randomIndex = options.randomIndex;

  async function readState(): Promise<LuckyDrawState> {
    const [rows, assignments] = await Promise.all([
      persistence.listResults(),
      persistence.listAssignments(),
    ]);
    return mapState(rows, assignments, guests);
  }

  async function completeInMemoryDraw() {
    const rows = (await persistence.listResults()).map(parseResult);
    const drawnRanks = new Set(rows.map(({ prize_rank }) => prize_rank));
    const pendingRanks = DRAW_PRIZES.filter(
      ({ rank }) => !drawnRanks.has(rank),
    ).map(({ rank }) => rank);
    const nextRank =
      pendingRanks[
        (randomIndex ?? ((min, max) => randomInt(min, max)))
          (0, pendingRanks.length)
      ];

    if (nextRank === undefined) {
      throw new AllPrizesDrawnError();
    }

    const assignments = await persistence.listAssignments();
    const winningNumber = selectEligibleNumber(
      ownerCounts(assignments),
      rows.map(({ winning_number }) => winning_number),
      nextRank,
      randomIndex,
    );

    if (winningNumber === null) {
      throw new NoEligibleLuckyNumberError();
    }

    return parseResult(
      await persistence.insertResult({
        prize_rank: nextRank,
        winning_number: winningNumber,
      }),
    );
  }

  async function drawNext() {
    try {
      const row = persistence.drawNextAtomic
        ? await persistence.drawNextAtomic()
        : await (persistence.withDrawLock
            ? persistence.withDrawLock(completeInMemoryDraw)
            : completeInMemoryDraw());
      const assignments = await persistence.listAssignments();
      return mapResult(parseResult(row), assignments, guests);
    } catch (error) {
      throw drawError(error);
    }
  }

  return {
    getState: readState,
    getAdminState: readState,
    drawNext,
  };
}

async function listProductionAssignments() {
  return listLuckyNumberAssignments();
}

const productionPersistence: LuckyDrawPersistenceAdapter = {
  listAssignments: listProductionAssignments,

  async listResults() {
    const { data, error } = await getSupabaseServerClient()
      .from("lucky_draw_results")
      .select("prize_rank, winning_number, created_at")
      .order("prize_rank", { ascending: true });

    if (error) {
      throw persistenceError("read", error);
    }

    return z.array(resultRowSchema).parse(data ?? []);
  },

  async insertResult(input) {
    const { data, error } = await getSupabaseServerClient()
      .from("lucky_draw_results")
      .insert(input)
      .select("prize_rank, winning_number, created_at")
      .single();

    if (error || !data) {
      throw persistenceError("create", error);
    }

    return parseResult(data);
  },

  async drawNextAtomic() {
    const { data, error } = await getSupabaseServerClient().rpc(
      "draw_next_lucky_prize",
    );

    if (error || !data) {
      throw drawError(error);
    }

    return parseResult(data);
  },
};

const productionRepository = createLuckyDrawRepository(productionPersistence, {
  guests: GUESTS,
});

function activeRepository(scope = "default") {
  return isE2eMemoryRepositoryEnabled()
    ? createLuckyDrawRepository(getE2eLuckyDrawPersistence(scope), {
        guests: getGuestDirectory(),
      })
    : productionRepository;
}

export function getLuckyDrawState(scope?: string) {
  return activeRepository(scope).getState();
}

export function getAdminLuckyDrawState(scope?: string) {
  return activeRepository(scope).getAdminState();
}

export function drawNextLuckyPrize(scope?: string) {
  return activeRepository(scope).drawNext();
}

export { isEligibleOwnerCount };
