// @vitest-environment node

import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  extractE2eGuestFullNames,
  extractGuestFullNames,
  findLeakedGuestNames,
} from "../../scripts/check-client-privacy.mjs";

describe("client bundle privacy scan", () => {
  it("extracts all 27 configured names and reports every leaked name", () => {
    const guestSource = readFileSync("src/data/guests.ts", "utf8");
    const names = extractGuestFullNames(guestSource);

    expect(names).toHaveLength(27);
    expect(
      findLeakedGuestNames(names, [
        `first bundle contains ${names[0]}`,
        "safe bundle",
        `third bundle contains ${names[26]}`,
      ]),
    ).toEqual([names[0], names[26]]);
  });

  it("extracts all 27 deterministic E2E names for the client-bundle audit", () => {
    const e2eGuestSource = readFileSync("src/data/e2e-guests.ts", "utf8");
    const names = extractE2eGuestFullNames(e2eGuestSource);

    expect(names).toHaveLength(27);
    expect(names[0]).toBe("E2E Guest 01");
    expect(names[26]).toBe("E2E Guest 27");
    expect(
      findLeakedGuestNames(names, [
        `first bundle contains ${names[0]}`,
        "safe bundle",
        `third bundle contains ${names[26]}`,
      ]),
    ).toEqual([names[0], names[26]]);
  });
});
