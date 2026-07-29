import { NextResponse } from "next/server";

import { readAdminSession } from "@/lib/admin-session";
import { jsonError } from "@/lib/api-response";
import { getAdminDashboard } from "@/lib/rsvp-repository";

export async function GET() {
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
    const { summary, guests } = await getAdminDashboard();
    return NextResponse.json({ summary, guests });
  } catch {
    return jsonError(500, "INTERNAL_ERROR", "Unable to load dashboard.");
  }
}
