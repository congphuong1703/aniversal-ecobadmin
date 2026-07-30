// @vitest-environment node

import { cookies } from "next/headers";
import { decodeJwt } from "jose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getEnv } from "@/lib/env";

import {
  ADMIN_SESSION_COOKIE_NAME,
  clearAdminSession,
  createAdminSession,
  readAdminSession,
  readAdminSessionMetadata,
  signAdminSessionToken,
  verifyAdminSessionToken,
} from "./admin-session";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  getEnv: vi.fn(),
}));

const NOW = new Date("2026-07-29T02:00:00.000Z");
const ADMIN_SECRET = "fixed-admin-secret";

function createCookieStore() {
  return {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  };
}

describe("admin sessions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    vi.mocked(getEnv).mockReturnValue({
      ADMIN_SESSION_SECRET: ADMIN_SECRET,
    } as ReturnType<typeof getEnv>);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("expires exactly 8 hours after issue", async () => {
    const token = await signAdminSessionToken({
      secret: ADMIN_SECRET,
      now: () => new Date(),
    });
    const payload = decodeJwt(token);

    expect(payload).toMatchObject({
      iss: "ecobadminton-rsvp",
      aud: "admin",
    });
    expect(payload.exp! - payload.iat!).toBe(8 * 60 * 60);
    expect(Object.keys(payload).sort()).toEqual(["aud", "exp", "iat", "iss"]);

    vi.setSystemTime(new Date(NOW.getTime() + 8 * 60 * 60 * 1000 - 1));
    await expect(
      verifyAdminSessionToken(token, {
        secret: ADMIN_SECRET,
        now: () => new Date(),
      }),
    ).resolves.toEqual({
      expiresAt: payload.exp,
      serverTime: NOW.getTime() + 8 * 60 * 60 * 1000 - 1,
    });

    vi.setSystemTime(new Date(NOW.getTime() + 8 * 60 * 60 * 1000));
    await expect(
      verifyAdminSessionToken(token, {
        secret: ADMIN_SECRET,
        now: () => new Date(),
      }),
    ).rejects.toThrow();
  });

  it("sets the production cookie with protected 8-hour options", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const cookieStore = createCookieStore();
    vi.mocked(cookies).mockResolvedValue(
      cookieStore as unknown as Awaited<ReturnType<typeof cookies>>,
    );

    await createAdminSession();

    expect(cookieStore.set).toHaveBeenCalledWith(
      ADMIN_SESSION_COOKIE_NAME,
      expect.any(String),
      {
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        path: "/",
        maxAge: 8 * 60 * 60,
      },
    );
  });

  it("does not mark the cookie secure outside production", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const cookieStore = createCookieStore();
    vi.mocked(cookies).mockResolvedValue(
      cookieStore as unknown as Awaited<ReturnType<typeof cookies>>,
    );

    await createAdminSession();

    expect(cookieStore.set).toHaveBeenCalledWith(
      ADMIN_SESSION_COOKIE_NAME,
      expect.any(String),
      expect.objectContaining({ secure: false }),
    );
  });

  it("reads a valid signed cookie and rejects a tampered one", async () => {
    const cookieStore = createCookieStore();
    const token = await signAdminSessionToken({
      secret: ADMIN_SECRET,
      now: () => new Date(),
    });
    vi.mocked(cookies).mockResolvedValue(
      cookieStore as unknown as Awaited<ReturnType<typeof cookies>>,
    );

    cookieStore.get.mockReturnValue({ value: token });
    await expect(readAdminSession()).resolves.toBe(true);
    await expect(readAdminSessionMetadata()).resolves.toEqual({
      expiresAt: Math.floor(NOW.getTime() / 1000) + 8 * 60 * 60,
      serverTime: NOW.getTime(),
    });

    cookieStore.get.mockReturnValue({ value: `${token}tampered` });
    await expect(readAdminSession()).resolves.toBe(false);
    await expect(readAdminSessionMetadata()).resolves.toBeNull();
  });

  it("returns false when the admin cookie is absent", async () => {
    const cookieStore = createCookieStore();
    vi.mocked(cookies).mockResolvedValue(
      cookieStore as unknown as Awaited<ReturnType<typeof cookies>>,
    );

    await expect(readAdminSession()).resolves.toBe(false);
    await expect(readAdminSessionMetadata()).resolves.toBeNull();
  });

  it("clears the admin cookie by its exact name", async () => {
    const cookieStore = createCookieStore();
    vi.mocked(cookies).mockResolvedValue(
      cookieStore as unknown as Awaited<ReturnType<typeof cookies>>,
    );

    await clearAdminSession();

    expect(cookieStore.delete).toHaveBeenCalledOnce();
    expect(cookieStore.delete).toHaveBeenCalledWith(ADMIN_SESSION_COOKIE_NAME);
    expect(cookieStore.set).not.toHaveBeenCalled();
  });
});
