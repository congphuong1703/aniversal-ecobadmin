// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

import { findGuestInActiveDirectory } from "@/lib/guest-directory";
import { signVerificationToken } from "@/lib/verification-token";
import { POST } from "./route";

vi.mock("@/lib/guest-directory", () => ({
  findGuestInActiveDirectory: vi.fn(),
}));

vi.mock("@/lib/verification-token", () => ({
  signVerificationToken: vi.fn(),
}));

const GUEST = {
  id: "guest-01",
  fullName: "E2E Guest 01",
  imagePath: "/guests/guest-01.svg",
};

function request(body: unknown) {
  return new Request("http://localhost/api/rsvp/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/rsvp/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findGuestInActiveDirectory).mockReturnValue(GUEST);
    vi.mocked(signVerificationToken).mockResolvedValue("signed-token");
  });

  it("accepts a normalized matching name and returns a public guest", async () => {
    const response = await POST(
      request({ guestId: GUEST.id, name: "  e2e   GUEST 01  " }),
    );
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
});
