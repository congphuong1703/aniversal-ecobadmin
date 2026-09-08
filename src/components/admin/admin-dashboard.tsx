"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";

import { ADMIN_SESSION_MAX_REMAINING_MS } from "@/lib/admin-session-contract";
import type { LuckyDrawState } from "@/lib/lucky-draw-repository";
import { formatLuckyNumber } from "@/lib/lucky-number-format";
import type {
  AdminGuestRow,
  DashboardSummary,
  RsvpSubmission,
} from "@/lib/rsvp-repository";

type DashboardData = {
  summary: DashboardSummary;
  guests: AdminGuestRow[];
};

type ResponseFilter = "all" | "attending" | "declined" | "pending";
type WinnerFilter = "all" | "winner" | "not-winner";

type ConfirmedSession = {
  remainingMs: number;
  dashboard: DashboardData | null;
};

const MAX_TIMER_DELAY_MS = 2_147_483_647;
const SESSION_CONFIRMATION_TIMEOUT_MS = 5_000;
type ClearReason = "expiry" | "logout";
type SessionState = "checking" | "active" | ClearReason;

function isTerminalSessionState(state: SessionState) {
  return state === "expiry" || state === "logout";
}

const timestampFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function formatTimestamp(timestamp: string) {
  const parts = Object.fromEntries(
    timestampFormatter
      .formatToParts(new Date(timestamp))
      .map(({ type, value }) => [type, value]),
  );

  return `${parts.hour}:${parts.minute} · ${parts.day}/${parts.month}/${parts.year}`;
}

function responseLabel(submission: RsvpSubmission | null) {
  if (!submission) {
    return "Chưa phản hồi";
  }

  return submission.attending ? "Tham dự" : "Không tham dự";
}

function responseClass(submission: RsvpSubmission | null) {
  if (!submission) {
    return "is-pending";
  }

  return submission.attending ? "is-attending" : "is-declined";
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("vi-VN")
    .trim();
}

function isSubmission(value: unknown): value is RsvpSubmission {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return (
    "id" in value &&
    typeof value.id === "string" &&
    "guestId" in value &&
    typeof value.guestId === "string" &&
    "attending" in value &&
    typeof value.attending === "boolean" &&
    "message" in value &&
    (typeof value.message === "string" || value.message === null) &&
    "clientSubmissionId" in value &&
    typeof value.clientSubmissionId === "string" &&
    "createdAt" in value &&
    typeof value.createdAt === "string"
  );
}

function isDashboardSummary(value: unknown): value is DashboardSummary {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const summary = value as Record<string, unknown>;

  return ["total", "attending", "declined", "pending"].every((key) => {
    const count = summary[key];
    return (
      typeof count === "number" && Number.isSafeInteger(count) && count >= 0
    );
  });
}

function isAdminGuestRow(value: unknown): value is AdminGuestRow {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return (
    "id" in value &&
    typeof value.id === "string" &&
    "fullName" in value &&
    typeof value.fullName === "string" &&
    "imagePath" in value &&
    typeof value.imagePath === "string" &&
    "currentSubmission" in value &&
    (value.currentSubmission === null ||
      isSubmission(value.currentSubmission)) &&
    "history" in value &&
    Array.isArray(value.history) &&
    value.history.every(isSubmission) &&
    "luckyNumbers" in value &&
    (value.luckyNumbers === null ||
      (Array.isArray(value.luckyNumbers) &&
        value.luckyNumbers.length === 5 &&
        value.luckyNumbers.every(
          (number) =>
            typeof number === "number" &&
            Number.isInteger(number) &&
            number >= 0 &&
            number <= 99,
        ))) &&
    "wonPrizes" in value &&
    Array.isArray(value.wonPrizes) &&
    value.wonPrizes.every((prize) => typeof prize === "string")
  );
}

function isLuckyDrawState(value: unknown): value is LuckyDrawState {
  if (typeof value !== "object" || value === null || !("draws" in value)) {
    return false;
  }

  return (
    Array.isArray(value.draws) &&
    value.draws.every((draw) => {
      if (
        typeof draw !== "object" ||
        draw === null ||
        !("prizeRank" in draw) ||
        !Number.isInteger(draw.prizeRank) ||
        !("label" in draw) ||
        typeof draw.label !== "string" ||
        !("result" in draw)
      ) {
        return false;
      }

      return (
        draw.result === null ||
        (typeof draw.result === "object" &&
          draw.result !== null &&
          "winningNumber" in draw.result &&
          typeof draw.result.winningNumber === "number" &&
          "winners" in draw.result &&
          Array.isArray(draw.result.winners))
      );
    })
  );
}

function confirmedSession(
  value: unknown,
  requiresDashboard: boolean,
): ConfirmedSession | null {
  if (
    typeof value !== "object" ||
    value === null ||
    !("authenticated" in value) ||
    value.authenticated !== true ||
    !("remainingMs" in value) ||
    !Number.isSafeInteger(value.remainingMs) ||
    (value.remainingMs as number) <= 0 ||
    (value.remainingMs as number) > ADMIN_SESSION_MAX_REMAINING_MS
  ) {
    return null;
  }

  if (!requiresDashboard) {
    return { remainingMs: value.remainingMs as number, dashboard: null };
  }

  if (
    !("summary" in value) ||
    !isDashboardSummary(value.summary) ||
    !("guests" in value) ||
    !Array.isArray(value.guests) ||
    !value.guests.every(isAdminGuestRow)
  ) {
    return null;
  }

  return {
    remainingMs: value.remainingMs as number,
    dashboard: { summary: value.summary, guests: value.guests },
  };
}

function AdminSessionChecking() {
  return (
    <main className="admin-page admin-login-page">
      <section
        aria-live="polite"
        className="admin-login-card"
        role="status"
      >
        <div className="brand-mark admin-brand">
          <span>Eco</span>
          <strong>Badminton</strong>
        </div>
        <span className="eyebrow">RSVP · Admin</span>
        <h1 className="font-display">Đang kiểm tra phiên quản trị…</h1>
        <p className="admin-login-intro">
          Dữ liệu riêng tư sẽ chỉ xuất hiện sau khi máy chủ xác nhận phiên hiện
          tại.
        </p>
      </section>
      <span
        aria-hidden="true"
        className="admin-orbit admin-orbit-large"
      />
      <span
        aria-hidden="true"
        className="admin-orbit admin-orbit-small"
      />
    </main>
  );
}

export function AdminDashboard() {
  const router = useRouter();
  const [sessionState, setSessionState] = useState<SessionState>("checking");
  const sessionStateRef = useRef<SessionState>("checking");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const dashboardRef = useRef<DashboardData | null>(null);
  const [drawState, setDrawState] = useState<LuckyDrawState | null>(null);
  const [drawError, setDrawError] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const [search, setSearch] = useState("");
  const [responseFilter, setResponseFilter] = useState<ResponseFilter>("all");
  const [winnerFilter, setWinnerFilter] = useState<WinnerFilter>("all");
  const expiryTimerRef = useRef<number | undefined>(undefined);
  const confirmationTimerRef = useRef<number | undefined>(undefined);
  const confirmationAbortRef = useRef<AbortController | null>(null);
  const drawLoadTimerRef = useRef<number | undefined>(undefined);
  const monotonicDeadlineRef = useRef<number | null>(null);
  const wallDeadlineRef = useRef<number | null>(null);
  const confirmationRequestRef = useRef(0);
  const confirmationInFlightRef = useRef(false);
  const [expandedGuestIds, setExpandedGuestIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const clearExpiryTimer = useCallback(() => {
    if (expiryTimerRef.current !== undefined) {
      window.clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = undefined;
    }
  }, []);

  const clearConfirmationTimer = useCallback(() => {
    if (confirmationTimerRef.current !== undefined) {
      window.clearTimeout(confirmationTimerRef.current);
      confirmationTimerRef.current = undefined;
    }
  }, []);

  const clearPrivateDashboard = useCallback(
    (reason: ClearReason) => {
      if (isTerminalSessionState(sessionStateRef.current)) {
        return;
      }

      sessionStateRef.current = reason;
      confirmationRequestRef.current += 1;
      confirmationInFlightRef.current = false;
      confirmationAbortRef.current?.abort();
      confirmationAbortRef.current = null;
      if (drawLoadTimerRef.current !== undefined) {
        window.clearTimeout(drawLoadTimerRef.current);
        drawLoadTimerRef.current = undefined;
      }
      monotonicDeadlineRef.current = null;
      wallDeadlineRef.current = null;
      dashboardRef.current = null;
      clearConfirmationTimer();
      clearExpiryTimer();
      setDashboard(null);
      setDrawState(null);
      setDrawError("");
      setSessionState(reason);
    },
    [clearConfirmationTimer, clearExpiryTimer],
  );

  const hideAndInvalidateConfirmation = useCallback(() => {
    if (isTerminalSessionState(sessionStateRef.current)) {
      return;
    }

    sessionStateRef.current = "checking";
    confirmationRequestRef.current += 1;
    confirmationInFlightRef.current = false;
    confirmationAbortRef.current?.abort();
    confirmationAbortRef.current = null;
    if (drawLoadTimerRef.current !== undefined) {
      window.clearTimeout(drawLoadTimerRef.current);
      drawLoadTimerRef.current = undefined;
    }
    monotonicDeadlineRef.current = null;
    wallDeadlineRef.current = null;
    clearConfirmationTimer();
    clearExpiryTimer();
    flushSync(() => setSessionState("checking"));
  }, [clearConfirmationTimer, clearExpiryTimer]);

  const loadDrawState = useCallback(async () => {
    const response = await fetch("/api/admin/draws", { cache: "no-store" });

    if (response.status === 401) {
      clearPrivateDashboard("expiry");
      return;
    }

    if (!response.ok) {
      throw new Error("Unable to load draws.");
    }

    const body: unknown = await response.json();

    if (!isLuckyDrawState(body)) {
      throw new Error("Malformed draw state.");
    }

    setDrawState(body);
    setDrawError("");
  }, [clearPrivateDashboard]);

  const scheduleDrawStateLoad = useCallback(() => {
    if (drawLoadTimerRef.current !== undefined) {
      return;
    }

    drawLoadTimerRef.current = window.setTimeout(() => {
      drawLoadTimerRef.current = undefined;
      void loadDrawState().catch(() => {
        setDrawError("Không thể tải trạng thái quay thưởng.");
      });
    }, 100);
  }, [loadDrawState]);

  const refreshDashboardAndDraws = useCallback(async () => {
    const [dashboardResponse, drawsResponse] = await Promise.all([
      fetch("/api/admin/dashboard", { cache: "no-store" }),
      fetch("/api/admin/draws", { cache: "no-store" }),
    ]);

    if (dashboardResponse.status === 401 || drawsResponse.status === 401) {
      clearPrivateDashboard("expiry");
      return;
    }

    if (!dashboardResponse.ok || !drawsResponse.ok) {
      throw new Error("Unable to refresh dashboard.");
    }

    const dashboardConfirmation = confirmedSession(
      await dashboardResponse.json(),
      true,
    );
    const drawsBody: unknown = await drawsResponse.json();

    if (
      dashboardConfirmation === null ||
      dashboardConfirmation.dashboard === null ||
      !isLuckyDrawState(drawsBody)
    ) {
      throw new Error("Malformed dashboard response.");
    }

    dashboardRef.current = dashboardConfirmation.dashboard;
    setDashboard(dashboardConfirmation.dashboard);
    setDrawState(drawsBody);
    setDrawError("");
  }, [clearPrivateDashboard]);

  const requestSessionConfirmation = useCallback(
    async () => {
      if (
        confirmationInFlightRef.current ||
        isTerminalSessionState(sessionStateRef.current)
      ) {
        return;
      }

      confirmationInFlightRef.current = true;
      const requestId = confirmationRequestRef.current + 1;
      confirmationRequestRef.current = requestId;
      const controller = new AbortController();
      confirmationAbortRef.current = controller;
      const requestStartedAt = performance.now();
      const requestStartedWallTime = Date.now();
      const requiresDashboard = dashboardRef.current === null;
      const endpoint = requiresDashboard
        ? "/api/admin/dashboard"
        : "/api/admin/session";

      confirmationTimerRef.current = window.setTimeout(() => {
        if (
          requestId !== confirmationRequestRef.current ||
          isTerminalSessionState(sessionStateRef.current)
        ) {
          return;
        }

        controller.abort();
        clearPrivateDashboard("expiry");
      }, SESSION_CONFIRMATION_TIMEOUT_MS);

      try {
        const response = await fetch(endpoint, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (
          requestId !== confirmationRequestRef.current ||
          isTerminalSessionState(sessionStateRef.current)
        ) {
          return;
        }

        if (!response.ok) {
          clearPrivateDashboard("expiry");
          return;
        }

        const confirmation = confirmedSession(
          await response.json(),
          requiresDashboard,
        );
        const currentPerformanceTime = performance.now();
        const elapsedMs = Math.max(
          0,
          currentPerformanceTime - requestStartedAt,
          Date.now() - requestStartedWallTime,
        );
        const remainingAfterDelivery =
          confirmation === null ? 0 : confirmation.remainingMs - elapsedMs;
        const deadline = currentPerformanceTime + remainingAfterDelivery;

        if (
          requestId !== confirmationRequestRef.current ||
          confirmation === null ||
          remainingAfterDelivery <= 0 ||
          !Number.isFinite(deadline)
        ) {
          clearPrivateDashboard("expiry");
          return;
        }

        clearConfirmationTimer();
        confirmationAbortRef.current = null;
        monotonicDeadlineRef.current = deadline;
        wallDeadlineRef.current = Date.now() + remainingAfterDelivery;
        if (confirmation.dashboard) {
          dashboardRef.current = confirmation.dashboard;
          setDashboard(confirmation.dashboard);
          scheduleDrawStateLoad();
        }
        sessionStateRef.current = "active";
        setSessionState("active");
      } catch {
        if (
          requestId === confirmationRequestRef.current &&
          !isTerminalSessionState(sessionStateRef.current)
        ) {
          clearPrivateDashboard("expiry");
        }
      } finally {
        if (requestId === confirmationRequestRef.current) {
          clearConfirmationTimer();
          confirmationAbortRef.current = null;
          confirmationInFlightRef.current = false;
        }
      }
    },
    [
      clearConfirmationTimer,
      clearPrivateDashboard,
      scheduleDrawStateLoad,
    ],
  );

  const confirmSessionAfterResume = useCallback(() => {
    if (
      confirmationInFlightRef.current ||
      isTerminalSessionState(sessionStateRef.current)
    ) {
      return;
    }

    hideAndInvalidateConfirmation();
    void requestSessionConfirmation();
  }, [hideAndInvalidateConfirmation, requestSessionConfirmation]);

  useEffect(() => {
    const effectRequestId = confirmationRequestRef.current;

    queueMicrotask(() => {
      if (effectRequestId === confirmationRequestRef.current) {
        void requestSessionConfirmation();
      }
    });

    function confirmAfterFocus() {
      confirmSessionAfterResume();
    }

    function hideAfterBlur() {
      hideAndInvalidateConfirmation();
    }

    function confirmAfterVisibilityChange() {
      if (document.visibilityState === "visible") {
        confirmSessionAfterResume();
      } else {
        hideAndInvalidateConfirmation();
      }
    }

    function hideAfterPageHide() {
      hideAndInvalidateConfirmation();
    }

    function confirmAfterPageShow() {
      confirmSessionAfterResume();
    }

    window.addEventListener("focus", confirmAfterFocus);
    window.addEventListener("blur", hideAfterBlur);
    window.addEventListener("pagehide", hideAfterPageHide);
    window.addEventListener("pageshow", confirmAfterPageShow);
    document.addEventListener(
      "visibilitychange",
      confirmAfterVisibilityChange,
    );

    return () => {
      confirmationRequestRef.current += 1;
      confirmationInFlightRef.current = false;
      confirmationAbortRef.current?.abort();
      confirmationAbortRef.current = null;
      if (drawLoadTimerRef.current !== undefined) {
        window.clearTimeout(drawLoadTimerRef.current);
        drawLoadTimerRef.current = undefined;
      }
      clearConfirmationTimer();
      clearExpiryTimer();
      window.removeEventListener("focus", confirmAfterFocus);
      window.removeEventListener("blur", hideAfterBlur);
      window.removeEventListener("pagehide", hideAfterPageHide);
      window.removeEventListener("pageshow", confirmAfterPageShow);
      document.removeEventListener(
        "visibilitychange",
        confirmAfterVisibilityChange,
      );
    };
  }, [
    clearConfirmationTimer,
    clearExpiryTimer,
    confirmSessionAfterResume,
    hideAndInvalidateConfirmation,
    requestSessionConfirmation,
  ]);

  useEffect(() => {
    if (sessionState !== "active") {
      return;
    }

    function expireIfNeeded() {
      const monotonicDeadline = monotonicDeadlineRef.current;
      const wallDeadline = wallDeadlineRef.current;

      if (
        (monotonicDeadline !== null &&
          performance.now() >= monotonicDeadline) ||
        (wallDeadline !== null && Date.now() >= wallDeadline)
      ) {
        clearPrivateDashboard("expiry");
        return true;
      }

      return false;
    }

    function scheduleExpiryCheck() {
      const monotonicDeadline = monotonicDeadlineRef.current;
      const wallDeadline = wallDeadlineRef.current;
      const monotonicRemaining =
        monotonicDeadline === null
          ? 0
          : Math.max(0, monotonicDeadline - performance.now());
      const wallRemaining =
        wallDeadline === null ? 0 : Math.max(0, wallDeadline - Date.now());
      const remaining = Math.min(monotonicRemaining, wallRemaining);
      expiryTimerRef.current = window.setTimeout(
        () => {
          if (!expireIfNeeded()) {
            scheduleExpiryCheck();
          }
        },
        Math.min(Math.max(remaining, 0), MAX_TIMER_DELAY_MS),
      );
    }

    if (!expireIfNeeded()) {
      scheduleExpiryCheck();
    }

    return () => {
      clearExpiryTimer();
    };
  }, [clearExpiryTimer, clearPrivateDashboard, sessionState]);

  useEffect(() => {
    if (sessionState !== "expiry" && sessionState !== "logout") {
      return;
    }

    if (sessionState === "expiry") {
      router.replace("/admin");
    }
    router.refresh();
  }, [router, sessionState]);

  function toggleHistory(guestId: string) {
    setExpandedGuestIds((current) => {
      const next = new Set(current);

      if (next.has(guestId)) {
        next.delete(guestId);
      } else {
        next.add(guestId);
      }

      return next;
    });
  }

  async function logout() {
    setLogoutError("");
    setIsLoggingOut(true);

    try {
      const response = await fetch("/api/admin/logout", { method: "POST" });

      if (!response.ok) {
        throw new Error("Logout failed");
      }

      clearPrivateDashboard("logout");
    } catch {
      setLogoutError("Không thể đăng xuất. Vui lòng thử lại.");
    } finally {
      setIsLoggingOut(false);
    }
  }

  async function drawNextPrize() {
    if (isDrawing) {
      return;
    }

    setIsDrawing(true);
    setDrawError("");

    try {
      const response = await fetch("/api/admin/draws/next", {
        method: "POST",
        headers: { "content-type": "application/json" },
      });

      if (response.status === 401) {
        clearPrivateDashboard("expiry");
        return;
      }

      if (response.status === 409) {
        const body = (await response.json()) as {
          error?: { message?: string };
        };
        setDrawError(
          body.error?.message ?? "Chưa có số phù hợp để quay giải tiếp theo.",
        );
        return;
      }

      if (!response.ok) {
        throw new Error("Unable to draw next prize.");
      }

      await refreshDashboardAndDraws();
    } catch {
      setDrawError("Không thể cập nhật kết quả quay. Vui lòng thử lại.");
    } finally {
      setIsDrawing(false);
    }
  }

  if (sessionState === "checking") {
    return <AdminSessionChecking />;
  }

  if (sessionState !== "active" || !dashboard) {
    return null;
  }

  const { summary, guests } = dashboard;
  const normalizedSearch = normalizeSearch(search);
  const filteredGuests = guests.filter((guest) => {
    const numberText =
      guest.luckyNumbers?.map((number) => formatLuckyNumber(number)).join(" ") ??
      "";
    const matchesSearch =
      normalizedSearch.length === 0 ||
      normalizeSearch(guest.fullName).includes(normalizedSearch) ||
      normalizeSearch(numberText).includes(normalizedSearch);
    const matchesResponse =
      responseFilter === "all" ||
      (responseFilter === "attending" && guest.currentSubmission?.attending) ||
      (responseFilter === "declined" && guest.currentSubmission?.attending === false) ||
      (responseFilter === "pending" && guest.currentSubmission === null);
    const matchesWinner =
      winnerFilter === "all" ||
      (winnerFilter === "winner" && guest.wonPrizes.length > 0) ||
      (winnerFilter === "not-winner" && guest.wonPrizes.length === 0);

    return matchesSearch && matchesResponse && matchesWinner;
  });
  const pendingDrawCount =
    drawState?.draws.filter((draw) => draw.result === null).length ?? 0;
  const metrics = [
    { label: "Tổng khách", value: summary.total, tone: "total" },
    { label: "Tham dự", value: summary.attending, tone: "attending" },
    { label: "Không tham dự", value: summary.declined, tone: "declined" },
    { label: "Chưa phản hồi", value: summary.pending, tone: "pending" },
  ];

  return (
    <main className="admin-page admin-dashboard-page">
      <header className="admin-header">
        <div className="admin-header-inner">
          <div>
            <div className="brand-mark admin-brand admin-brand-light">
              <span>Eco</span>
              <strong>Badminton</strong>
            </div>
            <span className="admin-header-label">RSVP · Admin</span>
          </div>
          <div className="admin-logout-area">
            {logoutError ? <p role="alert">{logoutError}</p> : null}
            <button
              className="admin-logout-button"
              disabled={isLoggingOut}
              onClick={() => void logout()}
              type="button"
            >
              {isLoggingOut ? "Đang đăng xuất…" : "Đăng xuất"}
              <span aria-hidden="true">↗</span>
            </button>
          </div>
        </div>
      </header>

      <div className="admin-dashboard-shell">
        <section
          className="admin-dashboard-heading"
          aria-labelledby="admin-title"
        >
          <div>
            <span className="eyebrow">Kỷ niệm một năm</span>
            <h1 className="font-display" id="admin-title">
              Bức tranh khách mời, cập nhật theo từng phản hồi.
            </h1>
          </div>
          <p>
            Trạng thái hiện tại lấy từ lần gửi mới nhất. Mở từng khách mời để
            xem lại toàn bộ lịch sử.
          </p>
        </section>

        <dl className="admin-summary" aria-label="Tổng quan phản hồi">
          {metrics.map((metric, index) => (
            <div
              className={`admin-summary-card is-${metric.tone}`}
              key={metric.label}
            >
              <span aria-hidden="true">0{index + 1}</span>
              <dt>{metric.label}</dt>
              <dd>
                <strong>{metric.value}</strong>
              </dd>
            </div>
          ))}
        </dl>

        <section
          className="admin-guest-section"
          aria-labelledby="guest-list-title"
        >
          <div className="admin-list-heading">
            <div>
              <span className="eyebrow">Danh sách đầy đủ</span>
              <h2 className="font-display" id="guest-list-title">
                Phản hồi của khách mời
              </h2>
            </div>
            <p>{summary.total} khách mời</p>
          </div>

          <div className="admin-filters" aria-label="Bộ lọc khách mời">
            <label>
              Tìm theo tên hoặc số
              <input
                aria-label="Tìm theo tên hoặc số"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Ví dụ: 01 hoặc Nguyễn An"
                type="text"
                value={search}
              />
            </label>
            <label>
              Lọc trạng thái phản hồi
              <select
                aria-label="Lọc trạng thái phản hồi"
                onChange={(event) =>
                  setResponseFilter(event.target.value as ResponseFilter)
                }
                value={responseFilter}
              >
                <option value="all">Tất cả</option>
                <option value="attending">Tham dự</option>
                <option value="declined">Không tham dự</option>
                <option value="pending">Chưa phản hồi</option>
              </select>
            </label>
            <label>
              Lọc người trúng giải
              <select
                aria-label="Lọc người trúng giải"
                onChange={(event) =>
                  setWinnerFilter(event.target.value as WinnerFilter)
                }
                value={winnerFilter}
              >
                <option value="all">Tất cả</option>
                <option value="winner">Đã trúng giải</option>
                <option value="not-winner">Chưa trúng giải</option>
              </select>
            </label>
          </div>

          <section className="admin-draw-panel" aria-labelledby="admin-draw-title">
            <div>
              <span className="eyebrow">Điều khiển quay thưởng</span>
              <h3 className="font-display" id="admin-draw-title">
                {pendingDrawCount > 0
                  ? `Còn ${pendingDrawCount} giải chờ quay`
                  : "Đã hoàn tất năm lượt quay"}
              </h3>
              <p>
                {pendingDrawCount > 0
                  ? "Mỗi lần bấm, hệ thống sẽ ngẫu nhiên chọn một hạng giải chưa mở và một số hợp lệ."
                  : "Tất cả kết quả đã được mở cho khách mời theo dõi."}
              </p>
            </div>
            <button
              className="button-primary"
              disabled={pendingDrawCount === 0 || isDrawing}
              onClick={() => void drawNextPrize()}
              type="button"
            >
              {isDrawing
                ? "Đang quay…"
                : pendingDrawCount > 0
                  ? "Quay giải ngẫu nhiên"
                  : "Đã hoàn tất"}
            </button>
            {drawError ? <p className="admin-draw-error" role="alert">{drawError}</p> : null}
            {drawState?.draws.some((draw) => draw.result) ? (
              <div className="admin-draw-results">
                {drawState.draws.map((draw) =>
                  draw.result ? (
                    <div className="admin-draw-result" key={draw.prizeKey}>
                      <span>{draw.label}</span>
                      <strong className="admin-draw-number">
                        {formatLuckyNumber(draw.result.winningNumber)}
                      </strong>
                      <small>{draw.result.winners.join(" · ") || "Chưa có người trúng"}</small>
                    </div>
                  ) : null,
                )}
              </div>
            ) : null}
          </section>

          <table
            className="admin-table"
            aria-label="Danh sách phản hồi khách mời"
          >
            <thead>
              <tr>
                <th scope="col">Khách mời</th>
                <th scope="col">Trạng thái mới nhất</th>
                <th scope="col">Cập nhật gần nhất</th>
                <th scope="col">Lịch sử</th>
              </tr>
            </thead>
            {filteredGuests.map((guest, index) => {
              const expanded = expandedGuestIds.has(guest.id);
              const historyId = `admin-history-${guest.id}`;
              const history = guest.history;

              return (
                <Fragment key={guest.id}>
                  <tbody className="admin-guest-group">
                    <tr className="admin-guest-row">
                      <td data-label="Khách mời">
                        <span className="admin-guest-index">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <strong>{guest.fullName}</strong>
                        {guest.luckyNumbers ? (
                          <span className="admin-lucky-numbers">
                            {guest.luckyNumbers.map((number) => (
                              <span key={number}>{formatLuckyNumber(number)}</span>
                            ))}
                          </span>
                        ) : null}
                        {guest.wonPrizes.length ? (
                          <span className="admin-won-prizes">
                            {guest.wonPrizes.join(" · ")}
                          </span>
                        ) : null}
                      </td>
                      <td data-label="Trạng thái">
                        <span
                          className={`admin-status ${responseClass(guest.currentSubmission)}`}
                        >
                          {responseLabel(guest.currentSubmission)}
                        </span>
                      </td>
                      <td data-label="Cập nhật">
                        {guest.currentSubmission ? (
                          <time dateTime={guest.currentSubmission.createdAt}>
                            {formatTimestamp(guest.currentSubmission.createdAt)}
                          </time>
                        ) : (
                          <span className="admin-empty">—</span>
                        )}
                      </td>
                      <td data-label="Lịch sử">
                        {history.length ? (
                          <button
                            aria-controls={historyId}
                            aria-expanded={expanded}
                            className="admin-disclosure"
                            onClick={() => toggleHistory(guest.id)}
                            type="button"
                          >
                            {expanded ? "Thu gọn" : "Xem lịch sử"}{" "}
                            {guest.fullName}
                            <span aria-hidden="true">
                              {expanded ? "−" : "+"}
                            </span>
                          </button>
                        ) : (
                          <span className="admin-empty">Chưa có</span>
                        )}
                      </td>
                    </tr>
                    {expanded ? (
                      <tr className="admin-history-row">
                        <td colSpan={4}>
                          <div
                            aria-label={`Lịch sử phản hồi của ${guest.fullName}`}
                            className="admin-history"
                            id={historyId}
                            role="region"
                          >
                            <div className="admin-history-heading">
                              <span>Lịch sử đầy đủ</span>
                              <strong>{history.length} lần phản hồi</strong>
                            </div>
                            <ol>
                              {history.map((submission) => (
                                <li key={submission.id}>
                                  <div>
                                    <span
                                      className={`admin-status ${responseClass(submission)}`}
                                    >
                                      {responseLabel(submission)}
                                    </span>
                                    <time dateTime={submission.createdAt}>
                                      {formatTimestamp(submission.createdAt)}
                                    </time>
                                  </div>
                                  {submission.message ? (
                                    <p>
                                      <span>Lời nhắn</span>
                                      {submission.message}
                                    </p>
                                  ) : null}
                                </li>
                              ))}
                            </ol>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </Fragment>
              );
            })}
          </table>
          {filteredGuests.length === 0 ? (
            <p className="admin-filter-empty" role="status">
              Không có khách mời phù hợp với bộ lọc hiện tại.
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
