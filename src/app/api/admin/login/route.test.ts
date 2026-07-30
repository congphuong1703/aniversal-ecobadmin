// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

import { createAdminSession } from "@/lib/admin-session";
import { getEnv } from "@/lib/env";
import { enforceRateLimit, RATE_LIMIT_POLICIES } from "@/lib/rate-limit";
import { POST } from "./route";

vi.mock("@/lib/admin-session", () => ({
  createAdminSession: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  getEnv: vi.fn(),
}));

vi.mock("@/lib/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/rate-limit")>();
  return { ...actual, enforceRateLimit: vi.fn() };
});

function request(password: string, contentType = "application/json") {
  return new Request("http://localhost/api/admin/login", {
    method: "POST",
    headers: {
      "content-type": contentType,
      "x-e2e-worker-id": "worker-login",
    },
    body: JSON.stringify({ password }),
  });
}

describe("POST /api/admin/login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockResolvedValue(null);
    vi.mocked(getEnv).mockReturnValue({
      ADMIN_PASSWORD: "correct horse battery staple",
    } as ReturnType<typeof getEnv>);
  });

  it("returns a generic 401 for the wrong password", async () => {
    const loginRequest = request("wrong password");
    const response = await POST(loginRequest);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: { code: "INVALID_CREDENTIALS", message: "Invalid credentials." },
    });
    expect(createAdminSession).not.toHaveBeenCalled();
    expect(enforceRateLimit).toHaveBeenCalledWith(loginRequest, {
      e2eScope: "worker-login",
      policy: RATE_LIMIT_POLICIES.adminLogin,
    });
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

  it("returns the limiter response before checking credentials", async () => {
    const limited = NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many requests." } },
      { status: 429, headers: { "Retry-After": "600" } },
    );
    vi.mocked(enforceRateLimit).mockResolvedValue(limited);

    const response = await POST(request("correct horse battery staple"));

    expect(response).toBe(limited);
    expect(getEnv).not.toHaveBeenCalled();
    expect(createAdminSession).not.toHaveBeenCalled();
  });

  it("rejects a non-JSON login before reading the password", async () => {
    const response = await POST(request("wrong password", "text/plain"));

    expect(response.status).toBe(415);
    expect(await response.json()).toEqual({
      error: {
        code: "UNSUPPORTED_MEDIA_TYPE",
        message: "Content-Type must be application/json.",
      },
    });
    expect(getEnv).not.toHaveBeenCalled();
  });
});
