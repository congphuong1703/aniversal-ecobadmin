import { NextResponse } from "next/server";

import { readAdminSessionMetadata } from "@/lib/admin-session";
import { adminSessionRemainingMs } from "@/lib/admin-session-contract";
import { jsonError } from "@/lib/api-response";
import { E2E_WORKER_HEADER, normalizeE2eWorkerScope } from "@/lib/e2e-mode";
import { getAdminLuckyDrawState } from "@/lib/lucky-draw-repository";

async function readSessionFailClosed() {
  try {
    return await readAdminSessionMetadata();
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const initialSession = await readSessionFailClosed();

  if (!initialSession) {
    return jsonError(401, "UNAUTHORIZED", "Unauthorized.");
  }

  let draws;
  try {
    draws = await getAdminLuckyDrawState(
      normalizeE2eWorkerScope(request.headers.get(E2E_WORKER_HEADER)),
    );
  } catch {
    return jsonError(500, "INTERNAL_ERROR", "Unable to load draws.");
  }

  const renderSession = await readSessionFailClosed();
  const remainingMs = renderSession
    ? adminSessionRemainingMs(renderSession)
    : null;

  if (remainingMs === null) {
    return jsonError(401, "UNAUTHORIZED", "Unauthorized.");
  }

  return NextResponse.json(
    { authenticated: true, remainingMs, ...draws },
    { headers: { "Cache-Control": "no-store" } },
  );
}
