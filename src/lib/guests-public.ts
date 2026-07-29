import { GUESTS, type GuestRecord } from "@/data/guests";
import { maskGuestName } from "@/lib/guest-name";

export type PublicGuest = Omit<GuestRecord, "fullName"> & {
  maskedName: string;
};

export function getPublicGuests(): readonly PublicGuest[] {
  return GUESTS.map(({ fullName, id, imagePath, imagePosition }) => ({
    id,
    maskedName: maskGuestName(fullName),
    imagePath,
    ...(imagePosition ? { imagePosition } : {}),
  }));
}
