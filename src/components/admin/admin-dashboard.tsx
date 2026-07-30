"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";

import { ADMIN_SESSION_MAX_REMAINING_MS } from "@/lib/admin-session-contract";
import type {
  AdminGuestRow,
  DashboardSummary,
  RsvpSubmission,
} from "@/lib/rsvp-repository";

type DashboardData = {
  summary: DashboardSummary;
  guests: AdminGuestRow[];
};

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
    value.history.every(isSubmission)
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
  const expiryTimerRef = useRef<number | undefined>(undefined);
  const confirmationTimerRef = useRef<number | undefined>(undefined);
  const confirmationAbortRef = useRef<AbortController | null>(null);
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
      monotonicDeadlineRef.current = null;
      wallDeadlineRef.current = null;
      dashboardRef.current = null;
      clearConfirmationTimer();
      clearExpiryTimer();
      setDashboard(null);
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
    monotonicDeadlineRef.current = null;
    wallDeadlineRef.current = null;
    clearConfirmationTimer();
    clearExpiryTimer();
    flushSync(() => setSessionState("checking"));
  }, [clearConfirmationTimer, clearExpiryTimer]);

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
    [clearConfirmationTimer, clearPrivateDashboard],
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

  if (sessionState === "checking") {
    return <AdminSessionChecking />;
  }

  if (sessionState !== "active" || !dashboard) {
    return null;
  }

  const { summary, guests } = dashboard;
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
            {guests.map((guest, index) => {
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
        </section>
      </div>
    </main>
  );
}
