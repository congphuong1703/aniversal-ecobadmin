import { NextResponse } from "next/server";

import { getPublicGuests } from "@/lib/guests-public";

export function GET() {
  return NextResponse.json({ guests: getPublicGuests() });
}
