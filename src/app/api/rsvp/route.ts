import { NextResponse } from "next/server";

import { jsonError, parseJson } from "@/lib/api-response";
import { E2E_WORKER_HEADER, normalizeE2eWorkerScope } from "@/lib/e2e-mode";
import {
  createSubmissionWithMetadata,
  SubmissionIdConflictError,
} from "@/lib/rsvp-repository";
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
    const result = await createSubmissionWithMetadata(
      {
        guestId,
        attending: parsed.data.attending,
        message: parsed.data.message,
        clientSubmissionId: parsed.data.clientSubmissionId,
      },
      normalizeE2eWorkerScope(request.headers.get(E2E_WORKER_HEADER)),
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SubmissionIdConflictError) {
      return jsonError(
        409,
        "SUBMISSION_ID_CONFLICT",
        "Unable to save RSVP with this submission ID.",
      );
    }

    return jsonError(500, "INTERNAL_ERROR", "Unable to save RSVP.");
  }
}
