import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
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

const SESSION_CONFIRMATION_TIMEOUT_MS = 5_000;

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

function sessionResponse(remainingMs = 60_000) {
  return new Response(
    JSON.stringify({ authenticated: true, remainingMs }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

function dashboardResponse(
  remainingMs = 60_000,
  summary = SUMMARY,
  guests = GUESTS,
) {
  return new Response(
    JSON.stringify({ authenticated: true, remainingMs, summary, guests }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

function renderDashboard() {
  return render(<AdminDashboard />);
}

async function renderConfirmedDashboard(remainingMs = 60_000) {
  fetchMock.mockResolvedValueOnce(dashboardResponse(remainingMs));
  renderDashboard();
  expect(await screen.findByText("Nguyễn Văn An")).toBeInTheDocument();
}

async function flushAsyncWork() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

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

  it("renders all summary values, the latest RSVP, and pending guests after confirmation", async () => {
    await renderConfirmedDashboard();

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
    await renderConfirmedDashboard();

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
    fetchMock.mockResolvedValueOnce(
      dashboardResponse(
        60_000,
        { total: 1, attending: 0, declined: 1, pending: 0 },
        [
          {
            id: "guest-precision",
            fullName: "Nguyễn Vi Giây",
            imagePath: "/guests/guest-01.svg",
            currentSubmission: newest,
            history: [newest, older],
          },
        ],
      ),
    );
    renderDashboard();

    expect(await screen.findByText("Nguyễn Vi Giây")).toBeInTheDocument();

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

  it("renders neutral server HTML so hydration delay never exposes private data", () => {
    const html = renderToString(<AdminDashboard />);

    expect(html).toContain("Đang kiểm tra phiên quản trị");
    expect(html).not.toContain("Nguyễn Văn An");
    expect(html).not.toContain("Mình có lịch công tác.");
  });

  it("requires initial server confirmation before private data appears", async () => {
    let resolveConfirmation!: (response: Response) => void;
    fetchMock.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        resolveConfirmation = resolve;
      }),
    );

    renderDashboard();

    expect(screen.getByText(/đang kiểm tra phiên quản trị/i)).toBeInTheDocument();
    expect(screen.queryByText("Nguyễn Văn An")).not.toBeInTheDocument();

    await act(async () => {
      resolveConfirmation(dashboardResponse());
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText("Nguyễn Văn An")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/dashboard",
      expect.objectContaining({
        cache: "no-store",
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("subtracts response delay from the server-authorized remaining lifetime", async () => {
    vi.useFakeTimers();
    let resolveConfirmation!: (response: Response) => void;
    fetchMock.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        resolveConfirmation = resolve;
      }),
    );
    renderDashboard();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(750);
    });
    expect(screen.queryByText("Nguyễn Văn An")).not.toBeInTheDocument();

    resolveConfirmation(dashboardResponse(1_000));
    await flushAsyncWork();
    expect(screen.getByText("Nguyễn Văn An")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(249);
    });
    expect(screen.getByText("Nguyễn Văn An")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(screen.queryByText("Nguyễn Văn An")).not.toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith("/admin");
  });

  it("keeps private data hidden when delayed hydration confirms an expired session", async () => {
    vi.useFakeTimers();
    let resolveConfirmation!: (response: Response) => void;
    fetchMock.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        resolveConfirmation = resolve;
      }),
    );
    renderDashboard();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });
    expect(screen.queryByText("Nguyễn Văn An")).not.toBeInTheDocument();

    resolveConfirmation(
      new Response(
        JSON.stringify({
          error: { code: "UNAUTHORIZED", message: "Unauthorized." },
        }),
        { status: 401 },
      ),
    );
    await flushAsyncWork();

    expect(screen.queryByText("Nguyễn Văn An")).not.toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith("/admin");
  });

  it("clears private data before a successful logout refresh completes", async () => {
    fetchMock
      .mockResolvedValueOnce(dashboardResponse())
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ authenticated: false }), { status: 200 }),
      );
    refresh.mockReturnValue(new Promise<void>(() => {}));
    const user = userEvent.setup();
    renderDashboard();

    expect(await screen.findByText("Nguyễn Văn An")).toBeInTheDocument();

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

  it.each(["focus", "visibilitychange"])(
    "hides private data before invalid %s revalidation completes",
    async (eventName) => {
      let sessionChecks = 0;
      fetchMock.mockImplementation(() => {
        sessionChecks += 1;

        if (sessionChecks === 1) {
          return Promise.resolve(dashboardResponse());
        }

        return Promise.resolve(
          new Response(
            JSON.stringify({
              error: { code: "UNAUTHORIZED", message: "Unauthorized." },
            }),
            { status: 401 },
          ),
        );
      });
      const visibility = vi
        .spyOn(document, "visibilityState", "get")
        .mockReturnValue("visible");
      renderDashboard();
      expect(await screen.findByText("Nguyễn Văn An")).toBeInTheDocument();

      act(() => {
        if (eventName === "focus") {
          window.dispatchEvent(new Event(eventName));
        } else {
          document.dispatchEvent(new Event(eventName));
        }
      });

      expect(screen.queryByText("Nguyễn Văn An")).not.toBeInTheDocument();
      await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin"));
      visibility.mockRestore();
    },
  );

  it("fails a hung resume confirmation closed after the bounded timeout", async () => {
    vi.useFakeTimers();
    fetchMock
      .mockResolvedValueOnce(dashboardResponse())
      .mockReturnValueOnce(new Promise<Response>(() => {}));
    replace.mockImplementation(() => {
      expect(screen.queryByText("Nguyễn Văn An")).not.toBeInTheDocument();
    });
    renderDashboard();
    await flushAsyncWork();
    expect(screen.getByText("Nguyễn Văn An")).toBeInTheDocument();

    act(() => window.dispatchEvent(new Event("focus")));
    expect(screen.queryByText("Nguyễn Văn An")).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(SESSION_CONFIRMATION_TIMEOUT_MS - 1);
    });
    expect(replace).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(replace).toHaveBeenCalledWith("/admin");
  });

  it("fails malformed successful confirmation responses closed", async () => {
    fetchMock
      .mockResolvedValueOnce(dashboardResponse())
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ authenticated: true }), { status: 200 }),
      );
    renderDashboard();
    expect(await screen.findByText("Nguyễn Văn An")).toBeInTheDocument();

    act(() => window.dispatchEvent(new Event("focus")));
    expect(screen.queryByText("Nguyễn Văn An")).not.toBeInTheDocument();

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin"));
  });

  it("re-anchors expiry to fresh server remaining time after resume", async () => {
    vi.useFakeTimers();
    fetchMock
      .mockResolvedValueOnce(dashboardResponse(1_000))
      .mockResolvedValueOnce(sessionResponse(5_000));
    renderDashboard();
    await flushAsyncWork();
    expect(screen.getByText("Nguyễn Văn An")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(900);
    });
    act(() => window.dispatchEvent(new Event("focus")));
    expect(screen.queryByText("Nguyễn Văn An")).not.toBeInTheDocument();
    await flushAsyncWork();
    expect(screen.getByText("Nguyễn Văn An")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_999);
    });
    expect(screen.getByText("Nguyễn Văn An")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(screen.queryByText("Nguyễn Văn An")).not.toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith("/admin");
  });

  it("subtracts wall elapsed when the monotonic clock pauses during confirmation", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-30T00:00:00.000Z"));
    let performanceTime = 0;
    const performanceNow = vi
      .spyOn(performance, "now")
      .mockImplementation(() => performanceTime);
    let resolveRevalidation!: (response: Response) => void;
    fetchMock
      .mockResolvedValueOnce(dashboardResponse(60_000))
      .mockReturnValueOnce(
        new Promise<Response>((resolve) => {
          resolveRevalidation = resolve;
        }),
      );
    renderDashboard();
    await flushAsyncWork();
    expect(screen.getByText("Nguyễn Văn An")).toBeInTheDocument();

    act(() => window.dispatchEvent(new Event("focus")));
    expect(screen.queryByText("Nguyễn Văn An")).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(750);
    });
    resolveRevalidation(sessionResponse(1_000));
    await flushAsyncWork();
    expect(screen.getByText("Nguyễn Văn An")).toBeInTheDocument();

    performanceTime = 249;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(249);
    });
    expect(screen.getByText("Nguyễn Văn An")).toBeInTheDocument();

    performanceTime = 250;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(screen.queryByText("Nguyễn Văn An")).not.toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith("/admin");

    performanceNow.mockRestore();
  });

  it("expires active data when wall time advances while the monotonic clock pauses", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-30T00:00:00.000Z"));
    const performanceNow = vi.spyOn(performance, "now").mockReturnValue(0);
    fetchMock.mockResolvedValueOnce(dashboardResponse(1_000));
    renderDashboard();
    await flushAsyncWork();
    expect(screen.getByText("Nguyễn Văn An")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });

    expect(screen.queryByText("Nguyễn Văn An")).not.toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith("/admin");
    performanceNow.mockRestore();
  });

  it("invalidates a pre-suspension response and requires a fresh visible check", async () => {
    let sessionChecks = 0;
    let resolveStaleRevalidation!: (response: Response) => void;
    let visibilityState: DocumentVisibilityState = "visible";
    fetchMock.mockImplementation(() => {
      sessionChecks += 1;

      if (sessionChecks === 1) {
        return Promise.resolve(dashboardResponse());
      }

      if (sessionChecks === 2) {
        return new Promise<Response>((resolve) => {
          resolveStaleRevalidation = resolve;
        });
      }

      return Promise.resolve(
        new Response(
          JSON.stringify({
            error: { code: "UNAUTHORIZED", message: "Unauthorized." },
          }),
          { status: 401 },
        ),
      );
    });
    const visibility = vi
      .spyOn(document, "visibilityState", "get")
      .mockImplementation(() => visibilityState);
    renderDashboard();
    expect(await screen.findByText("Nguyễn Văn An")).toBeInTheDocument();

    act(() => window.dispatchEvent(new Event("focus")));
    expect(screen.queryByText("Nguyễn Văn An")).not.toBeInTheDocument();

    act(() => {
      visibilityState = "hidden";
      document.dispatchEvent(new Event("visibilitychange"));
      visibilityState = "visible";
      document.dispatchEvent(new Event("visibilitychange"));
    });

    resolveStaleRevalidation(sessionResponse(60_000));
    await flushAsyncWork();

    expect(sessionChecks).toBe(3);
    expect(screen.queryByText("Nguyễn Văn An")).not.toBeInTheDocument();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin"));
    visibility.mockRestore();
  });

  it("rejects a confirmation lifetime above the session protocol maximum", async () => {
    fetchMock
      .mockResolvedValueOnce(dashboardResponse())
      .mockResolvedValueOnce(sessionResponse(8 * 60 * 60 * 1_000 + 1));
    renderDashboard();
    expect(await screen.findByText("Nguyễn Văn An")).toBeInTheDocument();

    act(() => window.dispatchEvent(new Event("focus")));
    expect(screen.queryByText("Nguyễn Văn An")).not.toBeInTheDocument();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin"));
  });

  it("coalesces simultaneous resume events without reopening private data", async () => {
    let sessionChecks = 0;
    let resolveRevalidation!: (response: Response) => void;
    fetchMock.mockImplementation(() => {
      sessionChecks += 1;

      if (sessionChecks === 1) {
        return Promise.resolve(dashboardResponse());
      }

      return new Promise<Response>((resolve) => {
        resolveRevalidation = resolve;
      });
    });
    const visibility = vi
      .spyOn(document, "visibilityState", "get")
      .mockReturnValue("visible");
    renderDashboard();
    expect(await screen.findByText("Nguyễn Văn An")).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new Event("focus"));
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(sessionChecks).toBe(2);
    expect(screen.queryByText("Nguyễn Văn An")).not.toBeInTheDocument();

    resolveRevalidation(sessionResponse());
    await flushAsyncWork();
    expect(screen.getByText("Nguyễn Văn An")).toBeInTheDocument();
    visibility.mockRestore();
  });
});
