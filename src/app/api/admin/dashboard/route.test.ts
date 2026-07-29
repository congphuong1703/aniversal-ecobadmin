// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

import { readAdminSession } from "@/lib/admin-session";
import { getAdminDashboard } from "@/lib/rsvp-repository";
import { GET } from "./route";

vi.mock("@/lib/admin-session", () => ({
  readAdminSession: vi.fn(),
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

function request() {
  return new Request("http://localhost/api/admin/dashboard", {
    headers: { "x-e2e-worker-id": "worker-8" },
  });
}

describe("GET /api/admin/dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 without invoking the repository when the session is invalid", async () => {
    vi.mocked(readAdminSession).mockResolvedValue(false);

    const response = await GET(request());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: { code: "UNAUTHORIZED", message: "Unauthorized." },
    });
    expect(getAdminDashboard).not.toHaveBeenCalled();
  });

  it("returns the dashboard for a valid admin session", async () => {
    vi.mocked(readAdminSession).mockResolvedValue(true);
    vi.mocked(getAdminDashboard).mockResolvedValue(DASHBOARD);

    const response = await GET(request());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(DASHBOARD);
    expect(getAdminDashboard).toHaveBeenCalledWith("worker-8");
  });
});
