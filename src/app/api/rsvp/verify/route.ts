import { NextResponse } from "next/server";

import { jsonError, parseJson } from "@/lib/api-response";
import { E2E_WORKER_HEADER, normalizeE2eWorkerScope } from "@/lib/e2e-mode";
import { findGuestInActiveDirectory } from "@/lib/guest-directory";
import { maskGuestName, normalizeGuestName } from "@/lib/guest-name";
import { enforceRateLimit, RATE_LIMIT_POLICIES } from "@/lib/rate-limit";
import { verifyInputSchema } from "@/lib/rsvp-schema";
import { signVerificationToken } from "@/lib/verification-token";

export async function POST(request: Request) {
  const rateLimitResponse = await enforceRateLimit(request, {
    e2eScope: normalizeE2eWorkerScope(request.headers.get(E2E_WORKER_HEADER)),
    policy: RATE_LIMIT_POLICIES.guestVerification,
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const parsed = await parseJson(request, verifyInputSchema);

  if ("response" in parsed) {
    return parsed.response;
  }

  const guest = findGuestInActiveDirectory(parsed.data.guestId);

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
