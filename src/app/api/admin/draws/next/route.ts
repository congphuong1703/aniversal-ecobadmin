import { NextResponse } from "next/server";

import { readAdminSessionMetadata } from "@/lib/admin-session";
import { adminSessionRemainingMs } from "@/lib/admin-session-contract";
import { jsonError } from "@/lib/api-response";
import { E2E_WORKER_HEADER, normalizeE2eWorkerScope } from "@/lib/e2e-mode";
import {
  AllPrizesDrawnError,
  drawNextLuckyPrize,
  InsufficientPrizeWinnersError,
  NoEligibleLuckyNumberError,
} from "@/lib/lucky-draw-repository";

async function readSessionFailClosed() {
  try {
    return await readAdminSessionMetadata();
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const session = await readSessionFailClosed();

  if (!session || adminSessionRemainingMs(session) === null) {
    return jsonError(401, "UNAUTHORIZED", "Unauthorized.");
  }

  try {
    const result = await drawNextLuckyPrize(
      normalizeE2eWorkerScope(request.headers.get(E2E_WORKER_HEADER)),
    );

    return NextResponse.json(
      { result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof NoEligibleLuckyNumberError) {
      return jsonError(409, error.code, error.message);
    }

    if (error instanceof AllPrizesDrawnError) {
      return jsonError(409, error.code, error.message);
    }

    if (error instanceof InsufficientPrizeWinnersError) {
      return jsonError(
        409,
        error.code,
        "Không đủ người tham dự để bổ sung đủ người trúng giải.",
      );
    }

    return jsonError(500, "INTERNAL_ERROR", "Unable to draw next prize.");
  }
}
