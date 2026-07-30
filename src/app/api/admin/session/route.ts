import { NextResponse } from "next/server";

import { readAdminSessionMetadata } from "@/lib/admin-session";
import { adminSessionRemainingMs } from "@/lib/admin-session-contract";
import { jsonError } from "@/lib/api-response";

export async function GET() {
  let session = null;

  try {
    session = await readAdminSessionMetadata();
  } catch {
    // Session failures are indistinguishable from an invalid session.
  }

  if (!session) {
    return jsonError(401, "UNAUTHORIZED", "Unauthorized.");
  }

  const remainingMs = adminSessionRemainingMs(session);

  if (remainingMs === null) {
    return jsonError(401, "UNAUTHORIZED", "Unauthorized.");
  }

  return NextResponse.json(
    { authenticated: true, remainingMs },
    { headers: { "Cache-Control": "no-store" } },
  );
}
