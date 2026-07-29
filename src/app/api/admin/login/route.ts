import { createHash, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { createAdminSession } from "@/lib/admin-session";
import { jsonError, parseJson } from "@/lib/api-response";
import { getEnv } from "@/lib/env";
import { loginInputSchema } from "@/lib/rsvp-schema";

function passwordDigest(value: string) {
  return createHash("sha256").update(value, "utf8").digest();
}

export async function POST(request: Request) {
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
