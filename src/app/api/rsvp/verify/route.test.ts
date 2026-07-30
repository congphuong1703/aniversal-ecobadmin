// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

import { findGuestInActiveDirectory } from "@/lib/guest-directory";
import { enforceRateLimit, RATE_LIMIT_POLICIES } from "@/lib/rate-limit";
import { signVerificationToken } from "@/lib/verification-token";
import { POST } from "./route";

vi.mock("@/lib/guest-directory", () => ({
  findGuestInActiveDirectory: vi.fn(),
}));

vi.mock("@/lib/verification-token", () => ({
  signVerificationToken: vi.fn(),
}));

vi.mock("@/lib/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/rate-limit")>();
  return { ...actual, enforceRateLimit: vi.fn() };
});

const GUEST = {
  id: "guest-01",
  fullName: "E2E Guest 01",
  imagePath: "/guests/guest-01.svg",
};

function request(body: unknown, contentType = "application/json") {
  return new Request("http://localhost/api/rsvp/verify", {
    method: "POST",
    headers: {
      "content-type": contentType,
      "x-e2e-worker-id": "worker-verify",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/rsvp/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enforceRateLimit).mockResolvedValue(null);
    vi.mocked(findGuestInActiveDirectory).mockReturnValue(GUEST);
    vi.mocked(signVerificationToken).mockResolvedValue("signed-token");
  });

  it("accepts a normalized matching name and returns a public guest", async () => {
    const verifyRequest = request({
      guestId: GUEST.id,
      name: "  e2e   GUEST 01  ",
    });
    const response = await POST(verifyRequest);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      verificationToken: "signed-token",
      guest: {
        id: GUEST.id,
        maskedName: "E2E G**** 0*",
        imagePath: GUEST.imagePath,
      },
    });
    expect(JSON.stringify(body)).not.toContain(GUEST.fullName);
    expect(signVerificationToken).toHaveBeenCalledWith(GUEST.id);
    expect(enforceRateLimit).toHaveBeenCalledWith(verifyRequest, {
      e2eScope: "worker-verify",
      policy: RATE_LIMIT_POLICIES.guestVerification,
    });
  });

  it("uses the same generic error for an incorrect name and an unknown guest", async () => {
    const incorrectName = await POST(
      request({ guestId: GUEST.id, name: "Someone Else" }),
    );

    vi.mocked(findGuestInActiveDirectory).mockReturnValue(undefined);
    const unknownGuest = await POST(
      request({ guestId: "guest-99", name: "Someone Else" }),
    );

    expect(incorrectName.status).toBe(400);
    expect(unknownGuest.status).toBe(400);
    expect(await incorrectName.json()).toEqual(await unknownGuest.json());
    expect(
      await POST(request({ guestId: GUEST.id, name: "" })).then((r) =>
        r.json(),
      ),
    ).toEqual({
      error: {
        code: "INVALID_REQUEST",
        message: "Invalid request.",
        field: "name",
      },
    });
    expect(signVerificationToken).not.toHaveBeenCalled();
  });

  it("returns the limiter response before looking up a guest", async () => {
    const limited = NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many requests." } },
      { status: 429, headers: { "Retry-After": "600" } },
    );
    vi.mocked(enforceRateLimit).mockResolvedValue(limited);

    const response = await POST(request({ guestId: GUEST.id, name: "Name" }));

    expect(response).toBe(limited);
    expect(findGuestInActiveDirectory).not.toHaveBeenCalled();
    expect(signVerificationToken).not.toHaveBeenCalled();
  });

  it("rejects non-JSON verification requests", async () => {
    const response = await POST(
      request({ guestId: GUEST.id, name: GUEST.fullName }, "text/plain"),
    );

    expect(response.status).toBe(415);
    expect(findGuestInActiveDirectory).not.toHaveBeenCalled();
  });
});
