// @vitest-environment node

import { beforeEach, describe, expect, it } from "vitest";

import { getE2eLuckyDrawPersistence, getE2eLuckyNumberPersistence, resetE2eLuckyNumberState } from "./e2e-lucky-number-state";
import {
  AllPrizesDrawnError,
  NoEligibleLuckyNumberError,
  createLuckyDrawRepository,
} from "./lucky-draw-repository";

const SCOPE = "draw-repository-test";

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
    await seedAssignments([
      { guest_id: "guest-01", numbers: [10, 11, 12, 13, 14] },
    ]);

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

  it("rejects a special draw when every number has multiple owners", async () => {
    await seedAssignments([
      { guest_id: "guest-01", numbers: [10, 11, 12, 13, 14] },
      { guest_id: "guest-02", numbers: [10, 11, 12, 13, 14] },
    ]);

    await expect(repository().drawNext()).rejects.toBeInstanceOf(
      NoEligibleLuckyNumberError,
    );
  });

  it("serializes concurrent draws so only one result is created for a rank", async () => {
    await seedAssignments([
      { guest_id: "guest-01", numbers: [10, 11, 12, 13, 14] },
    ]);

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
    await seedAssignments([
      { guest_id: "guest-01", numbers: [10, 11, 12, 13, 14] },
    ]);
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
    await seedAssignments([
      { guest_id: "guest-01", numbers: [10, 11, 12, 13, 14] },
    ]);

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
