// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import { clearAdminSession } from "@/lib/admin-session";
import { POST } from "./route";

vi.mock("@/lib/admin-session", () => ({
  clearAdminSession: vi.fn(),
}));

describe("POST /api/admin/logout", () => {
  it("clears the admin session", async () => {
    const response = await POST();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ authenticated: false });
    expect(clearAdminSession).toHaveBeenCalledOnce();
  });
});
