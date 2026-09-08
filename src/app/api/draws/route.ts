import { NextResponse } from "next/server";

import { jsonError } from "@/lib/api-response";
import { E2E_WORKER_HEADER, normalizeE2eWorkerScope } from "@/lib/e2e-mode";
import { getLuckyDrawState } from "@/lib/lucky-draw-repository";

export async function GET(request: Request) {
  try {
    const draws = await getLuckyDrawState(
      normalizeE2eWorkerScope(request.headers.get(E2E_WORKER_HEADER)),
    );

    return NextResponse.json(draws, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return jsonError(500, "INTERNAL_ERROR", "Unable to load draws.");
  }
}
