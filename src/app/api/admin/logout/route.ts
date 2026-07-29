import { NextResponse } from "next/server";

import { clearAdminSession } from "@/lib/admin-session";
import { jsonError } from "@/lib/api-response";

export async function POST() {
  try {
    await clearAdminSession();
    return NextResponse.json({ authenticated: false });
  } catch {
    return jsonError(500, "INTERNAL_ERROR", "Unable to clear session.");
  }
}
