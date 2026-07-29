// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

import { findGuestById } from "@/data/guests";
import { signVerificationToken } from "@/lib/verification-token";
import { POST } from "./route";

vi.mock("@/data/guests", () => ({
  findGuestById: vi.fn(),
}));

vi.mock("@/lib/verification-token", () => ({
  signVerificationToken: vi.fn(),
}));

const GUEST = {
  id: "guest-01",
  fullName: "Nguyễn Văn An",
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
    vi.mocked(findGuestById).mockReturnValue(GUEST);
    vi.mocked(signVerificationToken).mockResolvedValue("signed-token");
  });

  it("accepts a normalized matching name and returns a public guest", async () => {
    const response = await POST(
      request({ guestId: GUEST.id, name: "  NGUYỄN   VĂN AN  " }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      verificationToken: "signed-token",
      guest: {
        id: GUEST.id,
        maskedName: "Nguyễn V** A*",
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

    vi.mocked(findGuestById).mockReturnValue(undefined);
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
