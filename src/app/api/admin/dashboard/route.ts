import { NextResponse } from "next/server";

import { readAdminSession } from "@/lib/admin-session";
import { jsonError } from "@/lib/api-response";
import { E2E_WORKER_HEADER, normalizeE2eWorkerScope } from "@/lib/e2e-mode";
import { getAdminDashboard } from "@/lib/rsvp-repository";

export async function GET(request: Request) {
  let authenticated = false;

  try {
    authenticated = await readAdminSession();
  } catch {
    // Session failures are indistinguishable from an invalid session.
  }

  if (!authenticated) {
    return jsonError(401, "UNAUTHORIZED", "Unauthorized.");
  }

  try {
    const { summary, guests } = await getAdminDashboard(
      normalizeE2eWorkerScope(request.headers.get(E2E_WORKER_HEADER)),
    );
    return NextResponse.json({ summary, guests });
  } catch {
    return jsonError(500, "INTERNAL_ERROR", "Unable to load dashboard.");
  }
}
