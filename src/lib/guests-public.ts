import type { GuestRecord } from "@/data/guests";
import type { E2eEnvironment } from "@/lib/e2e-mode";
import { getGuestDirectory } from "@/lib/guest-directory";
import { maskGuestName } from "@/lib/guest-name";

export type PublicGuest = Omit<GuestRecord, "fullName"> & {
  maskedName: string;
};

export function getPublicGuests(
  environment?: E2eEnvironment,
): readonly PublicGuest[] {
  return getGuestDirectory(environment).map(
    ({ fullName, id, imagePath, imagePosition }) => ({
      id,
      maskedName: maskGuestName(fullName),
      imagePath,
      ...(imagePosition ? { imagePosition } : {}),
    }),
  );
}
