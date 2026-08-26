import "server-only";

import { GUESTS, type GuestRecord } from "@/data/guests";

export const E2E_GUEST_FULL_NAMES = [
  "E2E Guest 01",
  "E2E Guest 02",
  "E2E Guest 03",
  "E2E Guest 04",
  "E2E Guest 05",
  "E2E Guest 06",
  "E2E Guest 07",
  "E2E Guest 08",
  "E2E Guest 09",
  "E2E Guest 10",
  "E2E Guest 11",
  "E2E Guest 12",
  "E2E Guest 13",
  "E2E Guest 14",
  "E2E Guest 15",
  "E2E Guest 16",
  "E2E Guest 17",
  "E2E Guest 18",
  "E2E Guest 19",
  "E2E Guest 20",
  "E2E Guest 21",
  "E2E Guest 22",
  "E2E Guest 23",
  "E2E Guest 24",
  "E2E Guest 25",
] as const;

export const E2E_GUESTS: readonly GuestRecord[] = E2E_GUEST_FULL_NAMES.map(
  (fullName, index) => {
    const guest = GUESTS[index];

    if (!guest) {
      throw new Error(`Missing production guest metadata at index ${index}.`);
    }

    return {
      id: guest.id,
      fullName,
      imagePath: guest.imagePath,
      ...(guest.imagePosition ? { imagePosition: guest.imagePosition } : {}),
    };
  },
);
