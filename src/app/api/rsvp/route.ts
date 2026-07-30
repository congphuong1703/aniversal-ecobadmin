import { NextResponse } from "next/server";

import { jsonError, parseJson } from "@/lib/api-response";
import { E2E_WORKER_HEADER, normalizeE2eWorkerScope } from "@/lib/e2e-mode";
import { enforceRateLimit, RATE_LIMIT_POLICIES } from "@/lib/rate-limit";
import {
  createSubmissionWithMetadata,
  SubmissionIdConflictError,
} from "@/lib/rsvp-repository";
import { rsvpInputSchema } from "@/lib/rsvp-schema";
import { verifyVerificationToken } from "@/lib/verification-token";

export async function POST(request: Request) {
  const e2eScope = normalizeE2eWorkerScope(
    request.headers.get(E2E_WORKER_HEADER),
  );
  const clientRateLimitResponse = await enforceRateLimit(request, {
    e2eScope,
    policy: RATE_LIMIT_POLICIES.rsvpWriteClient,
  });

  if (clientRateLimitResponse) {
    return clientRateLimitResponse;
  }

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

  const guestRateLimitResponse = await enforceRateLimit(request, {
    e2eScope,
    identifier: guestId,
    policy: RATE_LIMIT_POLICIES.rsvpWriteGuest,
  });

  if (guestRateLimitResponse) {
    return guestRateLimitResponse;
  }

  try {
    const result = await createSubmissionWithMetadata(
      {
        guestId,
        attending: parsed.data.attending,
        message: parsed.data.message,
        clientSubmissionId: parsed.data.clientSubmissionId,
      },
      e2eScope,
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
