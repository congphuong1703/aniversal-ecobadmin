// @vitest-environment node

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  extractE2eGuestFullNames,
  extractGuestFullNames,
  findLeakedGuestNames,
} from "../../scripts/check-client-privacy.mjs";

describe("client bundle privacy scan", () => {
  it("extracts all 25 configured names and reports every leaked name", () => {
    const guestSource = readFileSync("src/data/guests.ts", "utf8");
    const names = extractGuestFullNames(guestSource);

    expect(names).toHaveLength(25);
    expect(
      findLeakedGuestNames(names, [
        `first bundle contains ${names[0]}`,
        "safe bundle",
        `third bundle contains ${names[24]}`,
      ]),
    ).toEqual([names[0], names[24]]);
  });

  it("extracts all 25 deterministic E2E names for the client-bundle audit", () => {
    const e2eGuestSource = readFileSync("src/data/e2e-guests.ts", "utf8");
    const names = extractE2eGuestFullNames(e2eGuestSource);

    expect(names).toHaveLength(25);
    expect(names[0]).toBe("E2E Guest 01");
    expect(names[24]).toBe("E2E Guest 25");
    expect(
      findLeakedGuestNames(names, [
        `first bundle contains ${names[0]}`,
        "safe bundle",
        `third bundle contains ${names[24]}`,
      ]),
    ).toEqual([names[0], names[24]]);
  });
});
