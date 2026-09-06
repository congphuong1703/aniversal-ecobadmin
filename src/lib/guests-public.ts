import type { GuestRecord } from "@/data/guests";
import type { E2eEnvironment } from "@/lib/e2e-mode";
import { getGuestDirectory } from "@/lib/guest-directory";

export type PublicGuest = GuestRecord;

export function getPublicGuests(
  environment?: E2eEnvironment,
): readonly PublicGuest[] {
  return getGuestDirectory(environment).map(
    ({ fullName, id, imagePath, imagePosition }) => ({
      id,
      fullName,
      imagePath,
      ...(imagePosition ? { imagePosition } : {}),
    }),
  );
}
