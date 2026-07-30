"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type {
  AdminGuestRow,
  DashboardSummary,
  RsvpSubmission,
} from "@/lib/rsvp-repository";

type AdminDashboardProps = {
  summary: DashboardSummary;
  guests: AdminGuestRow[];
  sessionExpiresAt: number;
  sessionServerTime: number;
};

const MAX_TIMER_DELAY_MS = 2_147_483_647;
type ClearReason = "expiry" | "logout";

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

export function AdminDashboard({
  summary,
  guests,
  sessionExpiresAt,
  sessionServerTime,
}: AdminDashboardProps) {
  const router = useRouter();
  const initialRemainingMs = Math.max(
    0,
    sessionExpiresAt * 1000 - sessionServerTime,
  );
  const [clearReason, setClearReason] = useState<ClearReason | null>(() =>
    initialRemainingMs === 0 ? "expiry" : null,
  );
  const clearReasonRef = useRef(clearReason);
  const expiryTimerRef = useRef<number | undefined>(undefined);
  const monotonicDeadlineRef = useRef<number | null>(null);
  const revalidationRequestRef = useRef(0);
  const revalidationInFlightRef = useRef(false);
  const [expandedGuestIds, setExpandedGuestIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const clearPrivateDashboard = useCallback((reason: ClearReason) => {
    if (clearReasonRef.current) {
      return;
    }

    clearReasonRef.current = reason;
    revalidationRequestRef.current += 1;
    revalidationInFlightRef.current = false;

    if (expiryTimerRef.current !== undefined) {
      window.clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = undefined;
    }

    setClearReason(reason);
  }, []);

  useEffect(() => {
    if (clearReason) {
      return;
    }

    monotonicDeadlineRef.current = performance.now() + initialRemainingMs;

    function expireIfNeeded() {
      const deadline = monotonicDeadlineRef.current;

      if (deadline !== null && performance.now() >= deadline) {
        clearPrivateDashboard("expiry");
        return true;
      }

      return false;
    }

    function scheduleExpiryCheck() {
      const deadline = monotonicDeadlineRef.current;
      const remaining =
        deadline === null ? 0 : Math.max(0, deadline - performance.now());
      expiryTimerRef.current = window.setTimeout(
        () => {
          if (!expireIfNeeded()) {
            scheduleExpiryCheck();
          }
        },
        Math.min(Math.max(remaining, 0), MAX_TIMER_DELAY_MS),
      );
    }

    async function revalidateAfterTabResume() {
      if (
        clearReasonRef.current ||
        revalidationInFlightRef.current ||
        expireIfNeeded()
      ) {
        return;
      }

      revalidationInFlightRef.current = true;
      const requestId = revalidationRequestRef.current + 1;
      revalidationRequestRef.current = requestId;

      try {
        const response = await fetch("/api/admin/dashboard", {
          cache: "no-store",
        });

        if (
          requestId !== revalidationRequestRef.current ||
          clearReasonRef.current
        ) {
          return;
        }

        if (!response.ok || expireIfNeeded()) {
          clearPrivateDashboard("expiry");
        }
      } catch {
        if (
          requestId === revalidationRequestRef.current &&
          !clearReasonRef.current
        ) {
          clearPrivateDashboard("expiry");
        }
      } finally {
        if (requestId === revalidationRequestRef.current) {
          revalidationInFlightRef.current = false;
        }
      }
    }

    function checkAfterFocus() {
      void revalidateAfterTabResume();
    }

    function checkAfterVisibilityChange() {
      if (document.visibilityState === "visible") {
        void revalidateAfterTabResume();
      }
    }

    if (!expireIfNeeded()) {
      scheduleExpiryCheck();
    }
    window.addEventListener("focus", checkAfterFocus);
    document.addEventListener("visibilitychange", checkAfterVisibilityChange);

    return () => {
      revalidationRequestRef.current += 1;
      revalidationInFlightRef.current = false;

      if (expiryTimerRef.current !== undefined) {
        window.clearTimeout(expiryTimerRef.current);
        expiryTimerRef.current = undefined;
      }
      window.removeEventListener("focus", checkAfterFocus);
      document.removeEventListener(
        "visibilitychange",
        checkAfterVisibilityChange,
      );
    };
  }, [clearPrivateDashboard, clearReason, initialRemainingMs]);

  useEffect(() => {
    if (!clearReason) {
      return;
    }

    if (clearReason === "expiry") {
      router.replace("/admin");
    }
    router.refresh();
  }, [clearReason, router]);

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

  const metrics = [
    { label: "Tổng khách", value: summary.total, tone: "total" },
    { label: "Tham dự", value: summary.attending, tone: "attending" },
    { label: "Không tham dự", value: summary.declined, tone: "declined" },
    { label: "Chưa phản hồi", value: summary.pending, tone: "pending" },
  ];

  if (clearReason) {
    return null;
  }

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
