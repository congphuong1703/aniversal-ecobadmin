import { NextResponse } from "next/server";

import { readAdminSessionMetadata } from "@/lib/admin-session";
import { adminSessionRemainingMs } from "@/lib/admin-session-contract";
import { jsonError } from "@/lib/api-response";
import { E2E_WORKER_HEADER, normalizeE2eWorkerScope } from "@/lib/e2e-mode";
import { getAdminDashboard } from "@/lib/rsvp-repository";

async function readSessionFailClosed() {
  try {
    return await readAdminSessionMetadata();
  } catch {
    // Session failures are indistinguishable from an invalid session.
    return null;
  }
}

export async function GET(request: Request) {
  const initialSession = await readSessionFailClosed();

  if (!initialSession) {
    return jsonError(401, "UNAUTHORIZED", "Unauthorized.");
  }

  let dashboard;

  try {
    dashboard = await getAdminDashboard(
      normalizeE2eWorkerScope(request.headers.get(E2E_WORKER_HEADER)),
    );
  } catch {
    return jsonError(500, "INTERNAL_ERROR", "Unable to load dashboard.");
  }

  const renderSession = await readSessionFailClosed();
  const remainingMs = renderSession
    ? adminSessionRemainingMs(renderSession)
    : null;

  if (remainingMs === null) {
    return jsonError(401, "UNAUTHORIZED", "Unauthorized.");
  }

  return NextResponse.json(
    { authenticated: true, remainingMs, ...dashboard },
    { headers: { "Cache-Control": "no-store" } },
  );
}
