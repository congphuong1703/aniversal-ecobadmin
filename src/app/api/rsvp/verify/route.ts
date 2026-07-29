import { NextResponse } from "next/server";

import { findGuestById } from "@/data/guests";
import { jsonError, parseJson } from "@/lib/api-response";
import { maskGuestName, normalizeGuestName } from "@/lib/guest-name";
import { verifyInputSchema } from "@/lib/rsvp-schema";
import { signVerificationToken } from "@/lib/verification-token";

export async function POST(request: Request) {
  const parsed = await parseJson(request, verifyInputSchema);

  if ("response" in parsed) {
    return parsed.response;
  }

  const guest = findGuestById(parsed.data.guestId);

  if (
    !guest ||
    normalizeGuestName(parsed.data.name) !== normalizeGuestName(guest.fullName)
  ) {
    return jsonError(
      400,
      "GUEST_VERIFICATION_FAILED",
      "Guest details could not be verified.",
    );
  }

  try {
    const verificationToken = await signVerificationToken(guest.id);
    const publicGuest = {
      id: guest.id,
      maskedName: maskGuestName(guest.fullName),
      imagePath: guest.imagePath,
      ...(guest.imagePosition ? { imagePosition: guest.imagePosition } : {}),
    };

    return NextResponse.json({ verificationToken, guest: publicGuest });
  } catch {
    return jsonError(500, "INTERNAL_ERROR", "Unable to verify guest.");
  }
}
