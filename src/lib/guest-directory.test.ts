// @vitest-environment node

import { describe, expect, it } from "vitest";

import { E2E_GUESTS } from "@/data/e2e-guests";
import { GUESTS } from "@/data/guests";
import { getGuestDirectory } from "./guest-directory";

describe("server guest directory selection", () => {
  it("uses deterministic E2E identities only in explicit non-production memory mode", () => {
    expect(
      getGuestDirectory({ NODE_ENV: "test", E2E_REPOSITORY: "memory" }),
    ).toBe(E2E_GUESTS);
    expect(
      getGuestDirectory({
        NODE_ENV: "development",
        E2E_REPOSITORY: "memory",
      }),
    ).toBe(E2E_GUESTS);
  });

  it.each([
    { NODE_ENV: "production", E2E_REPOSITORY: "memory" },
    { NODE_ENV: "test", E2E_REPOSITORY: undefined },
    { NODE_ENV: "development", E2E_REPOSITORY: "supabase" },
  ])("keeps the production directory for unsafe or implicit mode %#", (env) => {
    expect(getGuestDirectory(env)).toBe(GUESTS);
  });

  it("keeps stable IDs and assets while isolating names from replaceable production data", () => {
    expect(E2E_GUESTS).toHaveLength(25);
    expect(E2E_GUESTS.map(({ id }) => id)).toEqual(
      GUESTS.map(({ id }) => id),
    );
    expect(E2E_GUESTS.map(({ imagePath }) => imagePath)).toEqual(
      GUESTS.map(({ imagePath }) => imagePath),
    );
    expect(E2E_GUESTS[0]?.fullName).toBe("E2E Guest 01");
    expect(E2E_GUESTS[1]?.fullName).toBe("E2E Guest 02");

    for (const guest of E2E_GUESTS) {
      expect(GUESTS.some(({ fullName }) => fullName === guest.fullName)).toBe(
        false,
      );
    }
  });
});
