import { NextResponse } from "next/server";

import { getE2eRsvpState } from "@/lib/e2e-rsvp-repository";
import { isE2eMemoryRepositoryEnabled } from "@/lib/e2e-mode";
import { readE2eWorkerScope } from "@/lib/e2e-test-api";

export async function GET(request: Request) {
  if (!isE2eMemoryRepositoryEnabled()) {
    return new NextResponse(null, { status: 404 });
  }

  const scope = readE2eWorkerScope(request);

  if (!scope) {
    return new NextResponse(null, { status: 404 });
  }

  const rows = await getE2eRsvpState(scope);
  const submissions = rows.map((row) => ({
    id: row.id,
    guestId: row.guest_id,
    attending: row.attending,
    message: row.message,
    clientSubmissionId: row.client_submission_id,
    createdAt: row.created_at,
  }));

  return NextResponse.json({ submissions });
}
