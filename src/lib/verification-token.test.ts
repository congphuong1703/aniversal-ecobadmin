// @vitest-environment node

import { decodeJwt } from "jose";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  signAdminSessionToken,
  verifyAdminSessionToken,
} from "./admin-session";
import {
  signVerificationToken,
  verifyVerificationToken,
} from "./verification-token";

const NOW = new Date("2026-07-29T02:00:00.000Z");
const VERIFICATION_SECRET = "fixed-verification-secret";

describe("verification tokens", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("round-trips the guest id with the expected minimal claims", async () => {
    const token = await signVerificationToken("guest-07", {
      secret: VERIFICATION_SECRET,
      now: () => new Date(),
    });
    const payload = decodeJwt(token);

    await expect(
      verifyVerificationToken(token, {
        secret: VERIFICATION_SECRET,
        now: () => new Date(),
      }),
    ).resolves.toBe("guest-07");
    expect(payload).toMatchObject({
      iss: "ecobadminton-rsvp",
      aud: "rsvp-submit",
      sub: "guest-07",
    });
    expect(payload.exp! - payload.iat!).toBe(15 * 60);
    expect(Object.keys(payload).sort()).toEqual([
      "aud",
      "exp",
      "iat",
      "iss",
      "sub",
    ]);
  });

  it("expires exactly 15 minutes after issue", async () => {
    const token = await signVerificationToken("guest-07", {
      secret: VERIFICATION_SECRET,
      now: () => new Date(),
    });

    vi.setSystemTime(new Date(NOW.getTime() + 15 * 60 * 1000 - 1));
    await expect(
      verifyVerificationToken(token, {
        secret: VERIFICATION_SECRET,
        now: () => new Date(),
      }),
    ).resolves.toBe("guest-07");

    vi.setSystemTime(new Date(NOW.getTime() + 15 * 60 * 1000));
    await expect(
      verifyVerificationToken(token, {
        secret: VERIFICATION_SECRET,
        now: () => new Date(),
      }),
    ).rejects.toThrow();
  });

  it("rejects an admin token even when it uses the verification secret", async () => {
    const adminToken = await signAdminSessionToken({
      secret: VERIFICATION_SECRET,
      now: () => new Date(),
    });

    await expect(
      verifyVerificationToken(adminToken, {
        secret: VERIFICATION_SECRET,
        now: () => new Date(),
      }),
    ).rejects.toThrow();
  });

  it("rejects tokens signed with a different secret", async () => {
    const token = await signVerificationToken("guest-07", {
      secret: VERIFICATION_SECRET,
      now: () => new Date(),
    });

    await expect(
      verifyVerificationToken(token, {
        secret: "different-secret",
        now: () => new Date(),
      }),
    ).rejects.toThrow();
  });

  it("cannot be used as an admin token", async () => {
    const token = await signVerificationToken("guest-07", {
      secret: VERIFICATION_SECRET,
      now: () => new Date(),
    });

    await expect(
      verifyAdminSessionToken(token, {
        secret: VERIFICATION_SECRET,
        now: () => new Date(),
      }),
    ).rejects.toThrow();
  });
});
