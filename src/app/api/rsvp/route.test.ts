// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

import { enforceRateLimit, RATE_LIMIT_POLICIES } from "@/lib/rate-limit";
import {
  createSubmissionWithMetadata,
  SubmissionIdConflictError,
} from "@/lib/rsvp-repository";
import { verifyVerificationToken } from "@/lib/verification-token";
import { POST } from "./route";

vi.mock("@/lib/rsvp-repository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/rsvp-repository")>();

  return { ...actual, createSubmissionWithMetadata: vi.fn() };
});

vi.mock("@/lib/verification-token", () => ({
  verifyVerificationToken: vi.fn(),
}));

vi.mock("@/lib/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/rate-limit")>();
  return { ...actual, enforceRateLimit: vi.fn() };
});

const CLIENT_SUBMISSION_ID = "10000000-0000-4000-8000-000000000001";
const SUBMISSION = {
  id: "20000000-0000-4000-8000-000000000001",
  guestId: "guest-07",
  attending: true,
  message: "See you there",
  clientSubmissionId: CLIENT_SUBMISSION_ID,
  createdAt: "2026-07-29T02:00:00.000Z",
};

function request(
  body: unknown,
  workerScope = "  worker-7  ",
  contentType = "application/json",
) {
  return new Request("http://localhost/api/rsvp", {
    method: "POST",
    headers: {
      "content-type": contentType,
      "x-e2e-worker-id": workerScope,
    },
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
    vi.mocked(enforceRateLimit).mockResolvedValue(null);
    vi.mocked(verifyVerificationToken).mockResolvedValue("guest-07");
    vi.mocked(createSubmissionWithMetadata).mockResolvedValue({
      submission: SUBMISSION,
      deduplicated: false,
    });
  });

  it("derives the guest id from the verified token and returns repository metadata", async () => {
    const rsvpRequest = request(validBody());
    const response = await POST(rsvpRequest);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      submission: SUBMISSION,
      deduplicated: false,
    });
    expect(createSubmissionWithMetadata).toHaveBeenCalledWith(
      {
        guestId: "guest-07",
        attending: true,
        message: "See you there",
        clientSubmissionId: CLIENT_SUBMISSION_ID,
      },
      "worker-7",
    );
    expect(enforceRateLimit).toHaveBeenNthCalledWith(1, rsvpRequest, {
      e2eScope: "worker-7",
      policy: RATE_LIMIT_POLICIES.rsvpWriteClient,
    });
    expect(enforceRateLimit).toHaveBeenNthCalledWith(2, rsvpRequest, {
      e2eScope: "worker-7",
      identifier: "guest-07",
      policy: RATE_LIMIT_POLICIES.rsvpWriteGuest,
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

  it("does not pass a malformed worker scope to the repository", async () => {
    await POST(request(validBody(), "contains spaces"));

    expect(createSubmissionWithMetadata).toHaveBeenCalledWith(
      expect.any(Object),
      undefined,
    );
  });

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

  it("returns a generic conflict without exposing another guest's submission", async () => {
    vi.mocked(createSubmissionWithMetadata).mockRejectedValue(
      new SubmissionIdConflictError(),
    );

    const response = await POST(request(validBody()));
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(409);
    expect(body).toEqual({
      error: {
        code: "SUBMISSION_ID_CONFLICT",
        message: "Unable to save RSVP with this submission ID.",
      },
    });
    expect(serialized).not.toContain("guest-01");
    expect(serialized).not.toContain("false");
    expect(serialized).not.toContain("Private response");
    expect(serialized).not.toContain("signed-token");
  });

  it("returns a client limiter response before verifying a token", async () => {
    const limited = NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many requests." } },
      { status: 429, headers: { "Retry-After": "600" } },
    );
    vi.mocked(enforceRateLimit).mockResolvedValueOnce(limited);

    const response = await POST(request(validBody()));

    expect(response).toBe(limited);
    expect(verifyVerificationToken).not.toHaveBeenCalled();
    expect(createSubmissionWithMetadata).not.toHaveBeenCalled();
  });

  it("returns a guest limiter response before writing an RSVP", async () => {
    const limited = NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "Too many requests." } },
      { status: 429, headers: { "Retry-After": "600" } },
    );
    vi.mocked(enforceRateLimit)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(limited);

    const response = await POST(request(validBody()));

    expect(response).toBe(limited);
    expect(verifyVerificationToken).toHaveBeenCalledOnce();
    expect(createSubmissionWithMetadata).not.toHaveBeenCalled();
  });

  it("rejects non-JSON RSVP writes before token verification", async () => {
    const response = await POST(
      request(validBody(), "worker-7", "application/x-www-form-urlencoded"),
    );

    expect(response.status).toBe(415);
    expect(verifyVerificationToken).not.toHaveBeenCalled();
    expect(createSubmissionWithMetadata).not.toHaveBeenCalled();
  });
});
