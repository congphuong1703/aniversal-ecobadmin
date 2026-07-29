// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

import { createAdminSession } from "@/lib/admin-session";
import { getEnv } from "@/lib/env";
import { POST } from "./route";

vi.mock("@/lib/admin-session", () => ({
  createAdminSession: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  getEnv: vi.fn(),
}));

function request(password: string) {
  return new Request("http://localhost/api/admin/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password }),
  });
}

describe("POST /api/admin/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getEnv).mockReturnValue({
      ADMIN_PASSWORD: "correct horse battery staple",
    } as ReturnType<typeof getEnv>);
  });

  it("returns a generic 401 for the wrong password", async () => {
    const response = await POST(request("wrong password"));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: { code: "INVALID_CREDENTIALS", message: "Invalid credentials." },
    });
    expect(createAdminSession).not.toHaveBeenCalled();
  });

  it("creates the session for the correct password", async () => {
    const response = await POST(request("correct horse battery staple"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ authenticated: true });
    expect(createAdminSession).toHaveBeenCalledOnce();
  });

  it("returns a JSON error when server configuration is unavailable", async () => {
    vi.mocked(getEnv).mockImplementation(() => {
      throw new Error("configuration unavailable");
    });

    const response = await POST(request("any password"));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: { code: "INTERNAL_ERROR", message: "Unable to create session." },
    });
    expect(createAdminSession).not.toHaveBeenCalled();
  });
});
