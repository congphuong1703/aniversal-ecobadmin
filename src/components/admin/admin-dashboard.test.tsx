import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AdminGuestRow, DashboardSummary } from "@/lib/rsvp-repository";
import { AdminDashboard } from "./admin-dashboard";

const { refresh, replace, router } = vi.hoisted(() => {
  const refresh = vi.fn();
  const replace = vi.fn();

  return { refresh, replace, router: { refresh, replace } };
});

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

const SESSION_EXPIRES_AT = Date.parse("2050-07-29T10:00:00.000Z") / 1000;
const SESSION_SERVER_TIME = Date.parse("2050-07-29T09:00:00.000Z");
const EXPIRING_SESSION_EXPIRES_AT =
  Date.parse("2026-07-29T10:00:00.000Z") / 1000;
const EXPIRING_SESSION_SERVER_TIME = Date.parse("2026-07-29T09:59:59.000Z");

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
    replace.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("renders all summary values, the latest RSVP, and pending guests in a semantic table", () => {
    render(
      <AdminDashboard
        sessionExpiresAt={SESSION_EXPIRES_AT}
        sessionServerTime={SESSION_SERVER_TIME}
        summary={SUMMARY}
        guests={GUESTS}
      />,
    );

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
    render(
      <AdminDashboard
        sessionExpiresAt={SESSION_EXPIRES_AT}
        sessionServerTime={SESSION_SERVER_TIME}
        summary={SUMMARY}
        guests={GUESTS}
      />,
    );

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
        sessionExpiresAt={SESSION_EXPIRES_AT}
        sessionServerTime={SESSION_SERVER_TIME}
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

  it("clears private data before a successful logout refresh completes", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ authenticated: false }), { status: 200 }),
    );
    refresh.mockReturnValue(new Promise<void>(() => {}));
    const user = userEvent.setup();
    render(
      <AdminDashboard
        sessionExpiresAt={SESSION_EXPIRES_AT}
        sessionServerTime={SESSION_SERVER_TIME}
        summary={SUMMARY}
        guests={GUESTS}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /xem lịch sử.*nguyễn văn an/i }),
    );
    expect(screen.getByText("Mình có lịch công tác.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /đăng xuất/i }));

    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(screen.queryByText("Nguyễn Văn An")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Mình có lịch công tác."),
    ).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/logout", {
      method: "POST",
    });
  });

  it("unmounts private data at the exact session boundary before navigating", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-29T09:59:59.000Z"));
    replace.mockImplementation(() => {
      expect(screen.queryByText("Nguyễn Văn An")).not.toBeInTheDocument();
      expect(
        screen.queryByText("Mình có lịch công tác."),
      ).not.toBeInTheDocument();
    });
    render(
      <AdminDashboard
        sessionExpiresAt={EXPIRING_SESSION_EXPIRES_AT}
        sessionServerTime={EXPIRING_SESSION_SERVER_TIME}
        summary={SUMMARY}
        guests={GUESTS}
      />,
    );

    expect(screen.getByText("Nguyễn Văn An")).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(999);
    });
    expect(screen.getByText("Nguyễn Văn An")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(screen.queryByText("Nguyễn Văn An")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Mình có lịch công tác."),
    ).not.toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith("/admin");
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("uses server time for the initial duration when the client clock is behind", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2000-01-01T00:00:00.000Z"));
    render(
      <AdminDashboard
        sessionExpiresAt={EXPIRING_SESSION_EXPIRES_AT}
        sessionServerTime={EXPIRING_SESSION_SERVER_TIME}
        summary={SUMMARY}
        guests={GUESTS}
      />,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(screen.queryByText("Nguyễn Văn An")).not.toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith("/admin");
  });

  it("does not extend access when the wall clock moves backward", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-29T09:59:59.000Z"));
    render(
      <AdminDashboard
        sessionExpiresAt={EXPIRING_SESSION_EXPIRES_AT}
        sessionServerTime={EXPIRING_SESSION_SERVER_TIME}
        summary={SUMMARY}
        guests={GUESTS}
      />,
    );

    vi.setSystemTime(new Date("2000-01-01T00:00:00.000Z"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(screen.queryByText("Nguyễn Văn An")).not.toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith("/admin");
  });

  it.each(["focus", "visibilitychange"])(
    "revalidates and clears private data on invalid %s resume",
    async (eventName) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2000-01-01T00:00:00.000Z"));
      fetchMock.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: { code: "UNAUTHORIZED", message: "Unauthorized." },
          }),
          { status: 401 },
        ),
      );
      const visibility = vi
        .spyOn(document, "visibilityState", "get")
        .mockReturnValue("visible");
      render(
        <AdminDashboard
          sessionExpiresAt={SESSION_EXPIRES_AT}
          sessionServerTime={SESSION_SERVER_TIME}
          summary={SUMMARY}
          guests={GUESTS}
        />,
      );

      await act(async () => {
        if (eventName === "focus") {
          window.dispatchEvent(new Event(eventName));
        } else {
          document.dispatchEvent(new Event(eventName));
        }
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(screen.queryByText("Nguyễn Văn An")).not.toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledWith("/api/admin/dashboard", {
        cache: "no-store",
      });
      expect(replace).toHaveBeenCalledWith("/admin");
      visibility.mockRestore();
    },
  );

  it("coalesces simultaneous resume events into one authoritative check", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2000-01-01T00:00:00.000Z"));
    let resolveRevalidation!: (response: Response) => void;
    fetchMock.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        resolveRevalidation = resolve;
      }),
    );
    const visibility = vi
      .spyOn(document, "visibilityState", "get")
      .mockReturnValue("visible");
    render(
      <AdminDashboard
        sessionExpiresAt={SESSION_EXPIRES_AT}
        sessionServerTime={SESSION_SERVER_TIME}
        summary={SUMMARY}
        guests={GUESTS}
      />,
    );

    window.dispatchEvent(new Event("focus"));
    document.dispatchEvent(new Event("visibilitychange"));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveRevalidation(
        new Response(
          JSON.stringify({
            error: { code: "UNAUTHORIZED", message: "Unauthorized." },
          }),
          { status: 401 },
        ),
      );
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.queryByText("Nguyễn Văn An")).not.toBeInTheDocument();
    visibility.mockRestore();
  });
});
