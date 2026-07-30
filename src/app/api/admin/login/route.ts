import { createHash, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { createAdminSession } from "@/lib/admin-session";
import { jsonError, parseJson } from "@/lib/api-response";
import { E2E_WORKER_HEADER, normalizeE2eWorkerScope } from "@/lib/e2e-mode";
import { getEnv } from "@/lib/env";
import { enforceRateLimit, RATE_LIMIT_POLICIES } from "@/lib/rate-limit";
import { loginInputSchema } from "@/lib/rsvp-schema";

function passwordDigest(value: string) {
  return createHash("sha256").update(value, "utf8").digest();
}

export async function POST(request: Request) {
  const rateLimitResponse = await enforceRateLimit(request, {
    e2eScope: normalizeE2eWorkerScope(request.headers.get(E2E_WORKER_HEADER)),
    policy: RATE_LIMIT_POLICIES.adminLogin,
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  const parsed = await parseJson(request, loginInputSchema);

  if ("response" in parsed) {
    return parsed.response;
  }

  const suppliedPassword = passwordDigest(parsed.data.password);
  let configuredPassword: Buffer;

  try {
    configuredPassword = passwordDigest(getEnv().ADMIN_PASSWORD);
  } catch {
    return jsonError(500, "INTERNAL_ERROR", "Unable to create session.");
  }

  if (!timingSafeEqual(suppliedPassword, configuredPassword)) {
    return jsonError(401, "INVALID_CREDENTIALS", "Invalid credentials.");
  }

  try {
    await createAdminSession();
    return NextResponse.json({ authenticated: true });
  } catch {
    return jsonError(500, "INTERNAL_ERROR", "Unable to create session.");
  }
}
