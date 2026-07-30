import { NextResponse } from "next/server";

import { parseJson } from "@/lib/api-response";
import { resetE2eRsvpState } from "@/lib/e2e-rsvp-repository";
import { isE2eMemoryRepositoryEnabled } from "@/lib/e2e-mode";
import { e2eResetSchema, readE2eWorkerScope } from "@/lib/e2e-test-api";
import { resetE2eRateLimitState } from "@/lib/rate-limit";

export async function POST(request: Request) {
  if (!isE2eMemoryRepositoryEnabled()) {
    return new NextResponse(null, { status: 404 });
  }

  const scope = readE2eWorkerScope(request);

  if (!scope) {
    return new NextResponse(null, { status: 404 });
  }

  const parsed = await parseJson(request, e2eResetSchema);

  if ("response" in parsed) {
    return parsed.response;
  }

  resetE2eRsvpState(
    scope,
    parsed.data.submissions.map((submission) => ({
      guest_id: submission.guestId,
      attending: submission.attending,
      message: submission.message,
      client_submission_id: submission.clientSubmissionId,
    })),
  );
  resetE2eRateLimitState(scope);

  return NextResponse.json({ reset: true });
}
