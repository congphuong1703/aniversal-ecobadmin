import { randomInt } from "node:crypto";

import { DRAW_PRIZES } from "@/data/draw-prizes";

export type LuckyNumber = number;
export type LuckyNumbers = readonly [
  LuckyNumber,
  LuckyNumber,
  LuckyNumber,
  LuckyNumber,
  LuckyNumber,
];
export type RandomInt = (min: number, max: number) => number;
export type RandomIndex = (min: number, max: number) => number;

export { DRAW_PRIZES };

export { formatLuckyNumber } from "@/lib/lucky-number-format";

export function generateLuckyNumbers(
  randomIntGenerator: RandomInt = randomInt,
): LuckyNumbers {
  const available = Array.from({ length: 100 }, (_, value) => value);
  const values: number[] = [];

  while (values.length < 5) {
    const index = randomIntGenerator(0, available.length);
    values.push(available.splice(index, 1)[0]!);
  }

  return [values[0]!, values[1]!, values[2]!, values[3]!, values[4]!];
}

export function ownerLimitForPrize(rank: number): number {
  return rank === 1 ? 1 : rank;
}

export function isEligibleOwnerCount(rank: number, ownerCount: number): boolean {
  return rank === 1 ? ownerCount === 1 : ownerCount >= 0 && ownerCount <= rank;
}

export function selectEligibleNumber(
  ownerCounts: ReadonlyMap<LuckyNumber, number>,
  drawnNumbers: readonly LuckyNumber[],
  rank: number,
  randomIndex: RandomIndex = (min, max) => randomInt(min, max),
): LuckyNumber | null {
  const drawn = new Set(drawnNumbers);
  const candidates = [...ownerCounts].filter(
    ([number, ownerCount]) =>
      !drawn.has(number) && isEligibleOwnerCount(rank, ownerCount),
  );

  if (candidates.length === 0) {
    return null;
  }

  return candidates[randomIndex(0, candidates.length)]![0];
}
