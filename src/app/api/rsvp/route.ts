import { NextResponse } from "next/server";

import { jsonError, parseJson } from "@/lib/api-response";
import { createSubmissionWithMetadata } from "@/lib/rsvp-repository";
import { rsvpInputSchema } from "@/lib/rsvp-schema";
import { verifyVerificationToken } from "@/lib/verification-token";

export async function POST(request: Request) {
  const parsed = await parseJson(request, rsvpInputSchema);

  if ("response" in parsed) {
    return parsed.response;
  }

  let guestId: string;

  try {
    guestId = await verifyVerificationToken(parsed.data.verificationToken);
  } catch {
    return jsonError(
      401,
      "INVALID_VERIFICATION_TOKEN",
      "Verification is invalid or expired.",
    );
  }

  try {
    const result = await createSubmissionWithMetadata({
      guestId,
      attending: parsed.data.attending,
      message: parsed.data.message,
      clientSubmissionId: parsed.data.clientSubmissionId,
    });

    return NextResponse.json(result);
  } catch {
    return jsonError(500, "INTERNAL_ERROR", "Unable to save RSVP.");
  }
}
