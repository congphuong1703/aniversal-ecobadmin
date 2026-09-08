import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { findGuestById } from "@/data/guests";
import { E2E_GUESTS } from "@/data/e2e-guests";
import { GUEST_FIXTURES } from "@/test/fixtures";
import { getPublicGuests } from "./guests-public";

describe("public guests", () => {
  it("returns exactly 27 stable public guest projections", () => {
    const guests = getPublicGuests();

    expect(guests).toHaveLength(27);
    expect(guests.map(({ id }) => id)).toEqual(
      Array.from(
        { length: 27 },
        (_, index) => `guest-${String(index + 1).padStart(2, "0")}`,
      ),
    );

    expect(guests.at(-2)?.fullName).toBe("Nguyễn Thị Tuyết Trà");
    expect(guests.at(-1)?.fullName).toBe("Phạm Thị Thanh");
  });

  it("exposes the full names needed by the public invitation list", () => {
    const serializedGuests = JSON.stringify(getPublicGuests());

    expect(serializedGuests.includes("fullName")).toBe(true);

    expect(serializedGuests).toContain("Mads Werner");
  });

  it("projects the deterministic E2E directory only in explicit memory mode", () => {
    const guests = getPublicGuests({
      NODE_ENV: "test",
      E2E_REPOSITORY: "memory",
    });
    const serializedGuests = JSON.stringify(guests);

    expect(guests[0]?.fullName).toBe("E2E Guest 01");
    expect(guests[1]?.fullName).toBe("E2E Guest 02");

    for (const guest of E2E_GUESTS) {
      expect(serializedGuests).toContain(guest.fullName);
    }
  });

  it("uses one unique image path per guest", () => {
    const guests = getPublicGuests();
    const imagePaths = guests.map(({ imagePath }) => imagePath);

    expect(new Set(imagePaths)).toHaveLength(imagePaths.length);

    for (const guest of guests) {
      const expectedPath = `/guests/${guest.id}.svg`;
      const assetPath = join(process.cwd(), "public", expectedPath);
      const svg = readFileSync(assetPath, "utf8");

      expect(guest.imagePath === expectedPath).toBe(true);
      expect(svg.includes('viewBox="0 0 800 1000"')).toBe(true);
    }
  });

  it("finds server records by stable ID", () => {
    expect(findGuestById("guest-01")?.id).toBe("guest-01");
    expect(findGuestById("missing-guest")).toBeUndefined();
  });

  it("keeps every full guest name out of the client RSVP source", () => {
    const clientSource = readFileSync(
      join(process.cwd(), "src/components/landing/rsvp-experience.tsx"),
      "utf8",
    );

    for (const fixture of GUEST_FIXTURES) {
      expect(clientSource).not.toContain(fixture.fullName);
    }
  });
});
