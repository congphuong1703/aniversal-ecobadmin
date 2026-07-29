import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AdminGuestRow, DashboardSummary } from "@/lib/rsvp-repository";
import { AdminDashboard } from "./admin-dashboard";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const SUMMARY: DashboardSummary = {
  total: 2,
  attending: 0,
  declined: 1,
  pending: 1,
};

const GUESTS: AdminGuestRow[] = [
  {
    id: "guest-01",
    fullName: "Nguyễn Văn An",
    imagePath: "/guests/guest-01.svg",
    currentSubmission: {
      id: "20000000-0000-4000-8000-000000000002",
      guestId: "guest-01",
      attending: false,
      message: "Mình có lịch công tác.",
      clientSubmissionId: "10000000-0000-4000-8000-000000000002",
      createdAt: "2026-09-17T12:30:00.000Z",
    },
    history: [
      {
        id: "20000000-0000-4000-8000-000000000002",
        guestId: "guest-01",
        attending: false,
        message: "Mình có lịch công tác.",
        clientSubmissionId: "10000000-0000-4000-8000-000000000002",
        createdAt: "2026-09-17T12:30:00.000Z",
      },
      {
        id: "20000000-0000-4000-8000-000000000001",
        guestId: "guest-01",
        attending: true,
        message: null,
        clientSubmissionId: "10000000-0000-4000-8000-000000000001",
        createdAt: "2026-09-16T01:15:00.000Z",
      },
    ],
  },
  {
    id: "guest-02",
    fullName: "Trần Minh Châu",
    imagePath: "/guests/guest-02.svg",
    currentSubmission: null,
    history: [],
  },
];

const fetchMock = vi.fn<typeof fetch>();

describe("AdminDashboard", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    refresh.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders all summary values, the latest RSVP, and pending guests in a semantic table", () => {
    render(<AdminDashboard summary={SUMMARY} guests={GUESTS} />);

    const table = screen.getByRole("table", { name: /danh sách phản hồi/i });
    expect(table).toBeInTheDocument();
    expect(screen.getByText("2", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText("0", { selector: "strong" })).toBeInTheDocument();
    expect(screen.getAllByText("1", { selector: "strong" })).toHaveLength(2);
    expect(within(table).getByText("Nguyễn Văn An")).toBeInTheDocument();
    expect(within(table).getByText("Trần Minh Châu")).toBeInTheDocument();
    expect(within(table).getByText("Không tham dự")).toBeInTheDocument();
    expect(within(table).getByText("Chưa phản hồi")).toBeInTheDocument();
    expect(within(table).getByText(/19:30.*17\/09\/2026/i)).toBeInTheDocument();
  });

  it("opens newest-first full history with optional comments by keyboard", async () => {
    const user = userEvent.setup();
    render(<AdminDashboard summary={SUMMARY} guests={GUESTS} />);

    const disclosure = screen.getByRole("button", {
      name: /xem lịch sử.*nguyễn văn an/i,
    });
    expect(disclosure).toHaveAttribute("aria-expanded", "false");
    expect(disclosure).toHaveAttribute("aria-controls");

    disclosure.focus();
    await user.keyboard("{Enter}");

    expect(disclosure).toHaveAttribute("aria-expanded", "true");
    const history = screen.getByRole("region", {
      name: /lịch sử phản hồi của nguyễn văn an/i,
    });
    const entries = within(history).getAllByRole("listitem");
    expect(entries).toHaveLength(2);
    expect(entries[0]).toHaveTextContent(/không tham dự/i);
    expect(entries[0]).toHaveTextContent(/19:30.*17\/09\/2026/i);
    expect(entries[0]).toHaveTextContent("Mình có lịch công tác.");
    expect(entries[1]).toHaveTextContent(/tham dự/i);
    expect(entries[1]).toHaveTextContent(/08:15.*16\/09\/2026/i);
    expect(within(entries[1]).queryByText(/lời nhắn/i)).not.toBeInTheDocument();

    await user.keyboard(" ");
    expect(disclosure).toHaveAttribute("aria-expanded", "false");
  });

  it("preserves repository ordering for timestamps that differ only by microseconds", async () => {
    const newest = {
      id: "20000000-0000-4000-8000-000000000001",
      guestId: "guest-precision",
      attending: false,
      message: "Phản hồi mới nhất",
      clientSubmissionId: "10000000-0000-4000-8000-000000000001",
      createdAt: "2026-09-17T12:30:00.123999Z",
    };
    const older = {
      id: "20000000-0000-4000-8000-000000000002",
      guestId: "guest-precision",
      attending: true,
      message: "Phản hồi cũ hơn",
      clientSubmissionId: "10000000-0000-4000-8000-000000000002",
      createdAt: "2026-09-17T12:30:00.123456Z",
    };
    const user = userEvent.setup();

    render(
      <AdminDashboard
        summary={{ total: 1, attending: 0, declined: 1, pending: 0 }}
        guests={[
          {
            id: "guest-precision",
            fullName: "Nguyễn Vi Giây",
            imagePath: "/guests/guest-01.svg",
            currentSubmission: newest,
            history: [newest, older],
          },
        ]}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /xem lịch sử.*nguyễn vi giây/i }),
    );
    const entries = within(
      screen.getByRole("region", {
        name: /lịch sử phản hồi của nguyễn vi giây/i,
      }),
    ).getAllByRole("listitem");

    expect(entries[0]).toHaveTextContent("Phản hồi mới nhất");
    expect(entries[1]).toHaveTextContent("Phản hồi cũ hơn");
  });

  it("logs out and refreshes the server route", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ authenticated: false }), { status: 200 }),
    );
    const user = userEvent.setup();
    render(<AdminDashboard summary={SUMMARY} guests={GUESTS} />);

    await user.click(screen.getByRole("button", { name: /đăng xuất/i }));

    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/logout", {
      method: "POST",
    });
  });
});
