import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { readAdminSessionMetadata } from "@/lib/admin-session";
import { getAdminDashboard } from "@/lib/rsvp-repository";
import AdminPage from "./page";

const { headers } = vi.hoisted(() => ({ headers: vi.fn() }));

vi.mock("next/headers", () => ({ headers }));

vi.mock("@/lib/admin-session", () => ({
  readAdminSessionMetadata: vi.fn(),
}));

vi.mock("@/lib/rsvp-repository", () => ({
  getAdminDashboard: vi.fn(),
}));

vi.mock("@/components/admin/admin-login", () => ({
  AdminLogin: () => <div>Admin login only</div>,
}));

vi.mock("@/components/admin/admin-dashboard", () => ({
  AdminDashboard: ({
    guests,
    sessionExpiresAt,
  }: {
    guests: { fullName: string }[];
    sessionExpiresAt: number;
  }) => (
    <div>
      <span>{guests.map((guest) => guest.fullName).join(", ")}</span>
      <span>expires at {sessionExpiresAt}</span>
    </div>
  ),
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

describe("AdminPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    headers.mockResolvedValue(
      new Headers({ "x-e2e-worker-id": "  worker-9  " }),
    );
  });

  afterEach(cleanup);

  it("renders only login and never fetches dashboard data without a valid session", async () => {
    vi.mocked(readAdminSessionMetadata).mockResolvedValue(null);

    render(await AdminPage());

    expect(screen.getByText("Admin login only")).toBeInTheDocument();
    expect(screen.queryByText("Nguyễn Văn An")).not.toBeInTheDocument();
    expect(getAdminDashboard).not.toHaveBeenCalled();
  });

  it("loads full-name dashboard data only after the server session is valid", async () => {
    vi.mocked(readAdminSessionMetadata).mockResolvedValue({
      expiresAt: 1_788_000_000,
    });
    vi.mocked(getAdminDashboard).mockResolvedValue(DASHBOARD);

    render(await AdminPage());

    expect(screen.getByText("Nguyễn Văn An")).toBeInTheDocument();
    expect(screen.getByText(/expires at 1788000000/i)).toBeInTheDocument();
    expect(getAdminDashboard).toHaveBeenCalledWith("worker-9");
  });
});
