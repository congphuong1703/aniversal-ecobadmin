// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

import { createSubmissionWithMetadata } from "@/lib/rsvp-repository";
import { verifyVerificationToken } from "@/lib/verification-token";
import { POST } from "./route";

vi.mock("@/lib/rsvp-repository", () => ({
  createSubmissionWithMetadata: vi.fn(),
}));

vi.mock("@/lib/verification-token", () => ({
  verifyVerificationToken: vi.fn(),
}));

const CLIENT_SUBMISSION_ID = "10000000-0000-4000-8000-000000000001";
const SUBMISSION = {
  id: "20000000-0000-4000-8000-000000000001",
  guestId: "guest-07",
  attending: true,
  message: "See you there",
  clientSubmissionId: CLIENT_SUBMISSION_ID,
  createdAt: "2026-07-29T02:00:00.000Z",
};

function request(body: unknown) {
  return new Request("http://localhost/api/rsvp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function validBody() {
  return {
    verificationToken: "signed-token",
    attending: true,
    message: "See you there",
    clientSubmissionId: CLIENT_SUBMISSION_ID,
  };
}

describe("POST /api/rsvp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyVerificationToken).mockResolvedValue("guest-07");
    vi.mocked(createSubmissionWithMetadata).mockResolvedValue({
      submission: SUBMISSION,
      deduplicated: false,
    });
  });

  it("derives the guest id from the verified token and returns repository metadata", async () => {
    const response = await POST(request(validBody()));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      submission: SUBMISSION,
      deduplicated: false,
    });
    expect(createSubmissionWithMetadata).toHaveBeenCalledWith({
      guestId: "guest-07",
      attending: true,
      message: "See you there",
      clientSubmissionId: CLIENT_SUBMISSION_ID,
    });
  });

  it.each(["invalid", "expired"])(
    "rejects an %s verification token",
    async () => {
      vi.mocked(verifyVerificationToken).mockRejectedValue(
        new Error("token rejected"),
      );

      const response = await POST(request(validBody()));

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({
        error: {
          code: "INVALID_VERIFICATION_TOKEN",
          message: "Verification is invalid or expired.",
        },
      });
      expect(createSubmissionWithMetadata).not.toHaveBeenCalled();
    },
  );

  it.each([
    {
      name: "an invalid UUID",
      body: { ...validBody(), clientSubmissionId: "not-a-uuid" },
      field: "clientSubmissionId",
    },
    {
      name: "a missing attending value",
      body: {
        verificationToken: "signed-token",
        message: "See you there",
        clientSubmissionId: CLIENT_SUBMISSION_ID,
      },
      field: "attending",
    },
    {
      name: "a message over 1,000 characters",
      body: { ...validBody(), message: "🙂".repeat(1001) },
      field: "message",
    },
  ])("rejects $name", async ({ body, field }) => {
    const response = await POST(request(body));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: {
        code: "INVALID_REQUEST",
        message: "Invalid request.",
        field,
      },
    });
    expect(verifyVerificationToken).not.toHaveBeenCalled();
    expect(createSubmissionWithMetadata).not.toHaveBeenCalled();
  });
});
