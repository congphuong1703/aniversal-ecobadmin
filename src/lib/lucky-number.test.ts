import { describe, expect, it } from "vitest";

import {
  formatLuckyNumber,
  generateLuckyNumbers,
  isEligibleOwnerCount,
  selectEligibleNumber,
  selectSupplementalGuestIds,
} from "@/lib/lucky-number";

describe("lucky number rules", () => {
  it("generates five distinct values in the inclusive 00-99 range", () => {
    const values = generateLuckyNumbers((min, max) => min + (max - min) / 2);
    expect(values).toHaveLength(5);
    expect(new Set(values).size).toBe(5);
    expect(values.every((value) => value >= 0 && value <= 99)).toBe(true);
  });

  it("formats single-digit values with a leading zero", () => {
    expect(formatLuckyNumber(1)).toBe("01");
    expect(formatLuckyNumber(12)).toBe("12");
  });

  it("applies exact-one ownership to special and maximum ownership to later prizes", () => {
    expect(isEligibleOwnerCount(1, 1)).toBe(true);
    expect(isEligibleOwnerCount(1, 2)).toBe(false);
    expect(isEligibleOwnerCount(2, 2)).toBe(true);
    expect(isEligibleOwnerCount(2, 3)).toBe(false);
    expect(isEligibleOwnerCount(5, 5)).toBe(true);
    expect(isEligibleOwnerCount(5, 6)).toBe(false);
  });

  it("never selects a number that was already drawn", () => {
    expect(
      selectEligibleNumber(
        new Map([
          [12, 1],
          [53, 2],
        ]),
        [12],
        2,
        () => 0,
      ),
    ).toBe(53);
  });

  it("fills a short prize with unique candidates outside the existing winners", () => {
    expect(
      selectSupplementalGuestIds(
        ["guest-01", "guest-02", "guest-02", "guest-03", "guest-04", "guest-05"],
        ["guest-01"],
        4,
        () => 0,
      ),
    ).toEqual(["guest-02", "guest-03", "guest-04"]);
  });

  it("returns null when the available candidates cannot fill the prize", () => {
    expect(
      selectSupplementalGuestIds(
        ["guest-01", "guest-02", "guest-02"],
        ["guest-01"],
        4,
        () => 0,
      ),
    ).toBeNull();
  });
});
