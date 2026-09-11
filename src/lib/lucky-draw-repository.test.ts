// @vitest-environment node

import { beforeEach, describe, expect, it } from "vitest";

import { DRAW_PRIZES } from "@/data/draw-prizes";
import {
  getE2eLuckyDrawPersistence,
  getE2eLuckyNumberPersistence,
  resetE2eLuckyNumberState,
} from "./e2e-lucky-number-state";
import {
  getE2eRsvpPersistence,
  resetE2eRsvpState,
} from "./e2e-rsvp-repository";
import {
  AllPrizesDrawnError,
  InsufficientPrizeWinnersError,
  NoEligibleLuckyNumberError,
  createLuckyDrawRepository,
} from "./lucky-draw-repository";

const SCOPE = "draw-repository-test";
const EXPECTED_REWARDS = [
  "1 giải trúng thưởng - Bình nước thể thao giữ nhiệt",
  "2 giải - Băng đô thể thao",
  "3 giải - Bình xịt lạnh giảm đau",
  "4 giải - mỗi giải gồm 1 cốc bia hơi Hà Nội (nam 1 cốc, nữ nửa cốc), sau khi thực hiện xong có quà bí mật",
  "5 giải - mỗi giải gồm 1 cốc bia hơi Hà Nội (nam 1 cốc, nữ nửa cốc) và quà bí mật sau khi thực hiện",
] as const;

function numbers(values: number[]) {
  return values as [number, number, number, number, number];
}

async function seedAssignments(
  assignments: readonly { guest_id: string; numbers: number[] }[],
) {
  const persistence = getE2eLuckyNumberPersistence(SCOPE);

  for (const assignment of assignments) {
    await persistence.insertAssignment({
      guest_id: assignment.guest_id,
      numbers: numbers(assignment.numbers),
    });
  }
}

async function seedDistinctGuests(count: number) {
  await seedAssignments(
    Array.from({ length: count }, (_, index) => ({
      guest_id: `guest-${String(index + 1).padStart(2, "0")}`,
      numbers: Array.from({ length: 5 }, (_, numberIndex) =>
        index * 10 + numberIndex + (index === 0 ? 10 : 10),
      ),
    })),
  );
}

function repository() {
  return createLuckyDrawRepository(getE2eLuckyDrawPersistence(SCOPE), {
    randomIndex: () => 0,
  });
}

describe("Lucky draw repository", () => {
  beforeEach(() => {
    resetE2eLuckyNumberState(SCOPE);
  });

  it("aggregates owners and maps a winning number to public guest names", async () => {
    await seedAssignments([
      { guest_id: "guest-01", numbers: [10, 11, 12, 13, 14] },
      { guest_id: "guest-02", numbers: [10, 11, 12, 13, 15] },
    ]);

    const result = await repository().drawNext();

    expect(result).toMatchObject({
      prizeRank: 1,
      winningNumber: 14,
      winners: ["Mads Werner"],
    });
  });

  it("allows a guest to win more than one round and excludes prior winning numbers", async () => {
    await seedAssignments([
      { guest_id: "guest-01", numbers: [10, 11, 12, 13, 14] },
      { guest_id: "guest-02", numbers: [10, 11, 12, 13, 15] },
    ]);

    const first = await repository().drawNext();
    const second = await repository().drawNext();

    expect(first.winningNumber).not.toBe(second.winningNumber);
    expect(second.winners).toContain("Mads Werner");
  });

  it("returns all five prize entries in draw order", async () => {
    await seedDistinctGuests(5);

    const repositoryInstance = repository();
    await repositoryInstance.drawNext();
    await repositoryInstance.drawNext();
    await repositoryInstance.drawNext();
    await repositoryInstance.drawNext();
    await repositoryInstance.drawNext();

    const state = await repositoryInstance.getState();

    expect(state.draws.map(({ prizeRank, result }) => [prizeRank, result !== null])).toEqual([
      [1, true],
      [2, true],
      [3, true],
      [4, true],
      [5, true],
    ]);
    expect(state.draws.map(({ result }) => result?.winningNumber)).toEqual([10, 11, 12, 13, 14]);
  });

  it("maps every configured reward into state and results", async () => {
    await seedDistinctGuests(5);

    const repositoryInstance = repository();
    for (let index = 0; index < DRAW_PRIZES.length; index += 1) {
      await repositoryInstance.drawNext();
    }

    const state = await repositoryInstance.getState();

    expect(DRAW_PRIZES.map(({ reward }) => reward)).toEqual(EXPECTED_REWARDS);
    expect(DRAW_PRIZES.map(({ label }) => label)).toEqual([
      "Giải nhất",
      "Giải nhì",
      "Giải ba",
      "Giải tư",
      "Giải năm",
    ]);
    expect(state.draws.map(({ prizeRank, reward }) => ({ prizeRank, reward }))).toEqual(
      DRAW_PRIZES.map(({ rank, reward }) => ({ prizeRank: rank, reward })),
    );
    expect(state.draws.map(({ result }) => result?.reward)).toEqual(
      DRAW_PRIZES.map(({ reward }) => reward),
    );
  });

  it("rejects a special draw when every number has multiple owners", async () => {
    await seedAssignments([
      { guest_id: "guest-01", numbers: [10, 11, 12, 13, 14] },
      { guest_id: "guest-02", numbers: [10, 11, 12, 13, 14] },
    ]);

    await expect(repository().drawNext()).rejects.toBeInstanceOf(
      NoEligibleLuckyNumberError,
    );
  });

  it("fills a short winning number with unique supplemental attendees", async () => {
    await seedAssignments([
      { guest_id: "guest-01", numbers: [14, 15, 16, 17, 18] },
      { guest_id: "guest-02", numbers: [14, 19, 20, 21, 22] },
      { guest_id: "guest-03", numbers: [23, 24, 25, 26, 27] },
      { guest_id: "guest-04", numbers: [28, 29, 30, 31, 32] },
      { guest_id: "guest-05", numbers: [33, 34, 35, 36, 37] },
    ]);
    const persistence = getE2eLuckyDrawPersistence(SCOPE);
    for (const [prize_rank, winning_number] of [
      [1, 10],
      [2, 11],
      [3, 12],
      [4, 13],
    ] as const) {
      await persistence.insertResult({ prize_rank, winning_number });
    }

    const result = await repository().drawNext();

    expect(result.prizeRank).toBe(5);
    expect(result.winningNumber).toBe(14);
    expect(result.winners).toHaveLength(5);
    expect(new Set(result.winners).size).toBe(5);
    expect(result.winners).toContain("Mads Werner");
    await expect(persistence.listResults()).resolves.toContainEqual(
      expect.objectContaining({
        prize_rank: 5,
        supplemental_guest_ids: ["guest-03", "guest-04", "guest-05"],
      }),
    );
  });

  it("rejects a prize without enough attending guests before saving it", async () => {
    await seedAssignments([
      { guest_id: "guest-01", numbers: [14, 15, 16, 17, 18] },
      { guest_id: "guest-02", numbers: [19, 20, 21, 22, 23] },
    ]);
    const persistence = getE2eLuckyDrawPersistence(SCOPE);
    for (const [prize_rank, winning_number] of [
      [1, 10],
      [2, 11],
      [3, 12],
      [4, 13],
    ] as const) {
      await persistence.insertResult({ prize_rank, winning_number });
    }

    await expect(repository().drawNext()).rejects.toBeInstanceOf(
      InsufficientPrizeWinnersError,
    );
    await expect(persistence.listResults()).resolves.toHaveLength(4);
  });

  it("counts and maps only guests whose latest RSVP is attending", async () => {
    resetE2eRsvpState(SCOPE);
    const rsvp = getE2eRsvpPersistence(SCOPE);
    await rsvp.insertSubmission({
      guest_id: "guest-01",
      attending: true,
      message: null,
      client_submission_id: "10000000-0000-4000-8000-000000000001",
    });
    await rsvp.insertSubmission({
      guest_id: "guest-02",
      attending: true,
      message: null,
      client_submission_id: "10000000-0000-4000-8000-000000000002",
    });
    await rsvp.insertSubmission({
      guest_id: "guest-02",
      attending: false,
      message: null,
      client_submission_id: "10000000-0000-4000-8000-000000000003",
    });
    await seedAssignments([
      { guest_id: "guest-01", numbers: [10, 11, 12, 13, 14] },
      { guest_id: "guest-02", numbers: [10, 11, 12, 13, 14] },
    ]);

    await expect(repository().drawNext()).resolves.toMatchObject({
      prizeRank: 1,
      winningNumber: 10,
      winners: ["Mads Werner"],
    });
  });

  it("serializes concurrent draws so only one result is created for a rank", async () => {
    await seedDistinctGuests(2);

    const [first, second] = await Promise.all([
      repository().drawNext(),
      repository().drawNext(),
    ]);

    expect(first.prizeRank).toBe(1);
    expect(second.prizeRank).toBe(2);
    await expect(repository().getState()).resolves.toMatchObject({
      draws: expect.any(Array),
    });
  });

  it("selects a random pending prize rank", async () => {
    await seedDistinctGuests(3);
    await getE2eLuckyDrawPersistence(SCOPE).insertResult({
      prize_rank: 2,
      winning_number: 10,
    });

    const values = [1, 0];
    const randomRepository = createLuckyDrawRepository(
      getE2eLuckyDrawPersistence(SCOPE),
      {
        randomIndex: () => values.shift() ?? 0,
      },
    );

    await expect(randomRepository.drawNext()).resolves.toMatchObject({
      prizeRank: 3,
      winningNumber: 11,
    });
  });

  it("rejects a sixth draw after all five prizes are complete", async () => {
    await seedDistinctGuests(5);

    const repositoryInstance = repository();
    for (let index = 0; index < 5; index += 1) {
      await repositoryInstance.drawNext();
    }

    const guardedRepository = createLuckyDrawRepository(
      getE2eLuckyDrawPersistence(SCOPE),
      {
        randomIndex: () => {
          throw new Error("random index should not be requested");
        },
      },
    );

    await expect(guardedRepository.drawNext()).rejects.toBeInstanceOf(
      AllPrizesDrawnError,
    );
  });
});
