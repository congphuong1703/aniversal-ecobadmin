// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

import { readAdminSessionMetadata } from "@/lib/admin-session";
import { getAdminDashboard } from "@/lib/rsvp-repository";
import { GET } from "./route";

vi.mock("@/lib/admin-session", () => ({
  readAdminSessionMetadata: vi.fn(),
}));

vi.mock("@/lib/rsvp-repository", () => ({
  getAdminDashboard: vi.fn(),
}));

const DASHBOARD = {
  summary: { total: 1, attending: 0, declined: 0, pending: 1 },
  guests: [
    {
      id: "guest-01",
      fullName: "Nguyễn Văn An",
      imagePath: "/guests/guest-01.svg",
      currentSubmission: null,
      history: [],
    },
  ],
};

const INITIAL_SESSION = {
  expiresAt: 1_788_000_000,
  serverTime: 1_787_999_990_000,
};

const RENDER_SESSION = {
  expiresAt: 1_788_000_000,
  serverTime: 1_787_999_995_250,
};

function request(workerScope = "  worker-8  ") {
  return new Request("http://localhost/api/admin/dashboard", {
    headers: { "x-e2e-worker-id": workerScope },
  });
}

describe("GET /api/admin/dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without invoking the repository when the session is invalid", async () => {
    vi.mocked(readAdminSessionMetadata).mockResolvedValue(null);

    const response = await GET(request());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: { code: "UNAUTHORIZED", message: "Unauthorized." },
    });
    expect(getAdminDashboard).not.toHaveBeenCalled();
  });

  it("returns the dashboard with fresh post-load session lifetime", async () => {
    vi.mocked(readAdminSessionMetadata)
      .mockResolvedValueOnce(INITIAL_SESSION)
      .mockResolvedValueOnce(RENDER_SESSION);
    vi.mocked(getAdminDashboard).mockResolvedValue(DASHBOARD);

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      authenticated: true,
      remainingMs: 4_750,
      ...DASHBOARD,
    });
    expect(getAdminDashboard).toHaveBeenCalledWith("worker-8");
    expect(readAdminSessionMetadata).toHaveBeenCalledTimes(2);
  });

  it("drops loaded private data if the session expires during repository work", async () => {
    vi.mocked(readAdminSessionMetadata)
      .mockResolvedValueOnce(INITIAL_SESSION)
      .mockResolvedValueOnce(null);
    vi.mocked(getAdminDashboard).mockResolvedValue(DASHBOARD);

    const response = await GET(request());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: { code: "UNAUTHORIZED", message: "Unauthorized." },
    });
  });

  it("does not pass a malformed worker scope to the repository", async () => {
    vi.mocked(readAdminSessionMetadata)
      .mockResolvedValueOnce(INITIAL_SESSION)
      .mockResolvedValueOnce(RENDER_SESSION);
    vi.mocked(getAdminDashboard).mockResolvedValue(DASHBOARD);

    await GET(request("contains spaces"));

    expect(getAdminDashboard).toHaveBeenCalledWith(undefined);
  });
});
