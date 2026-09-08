"use client";

import { useEffect, useRef, useState } from "react";

import type {
  LuckyDrawEntry,
  LuckyDrawState,
} from "@/lib/lucky-draw-repository";
import { formatLuckyNumber } from "@/lib/lucky-number-format";

const POLL_INTERVAL_MS = 2_000;

async function requestDrawState() {
  const response = await fetch("/api/draws", { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Unable to load draws.");
  }

  return (await response.json()) as LuckyDrawState;
}

function DrawCard({ draw }: { draw: LuckyDrawEntry }) {
  const result = draw.result;

  return (
    <article className={`draw-card ${result ? "is-revealed" : "is-pending"}`}>
      <div className="draw-card-heading">
        <span className="draw-card-rank">0{draw.prizeRank}</span>
        <div>
          <h2 className="font-display">{draw.label}</h2>
          {draw.reward ? <p className="draw-card-reward">{draw.reward}</p> : null}
        </div>
        <span className="draw-card-status">
          {result ? "Đã mở" : "Chờ quay"}
        </span>
      </div>
      {result ? (
        <div className="draw-result">
          <span className="draw-result-label">Con số chiến thắng</span>
          <strong className="draw-winning-number">
            {formatLuckyNumber(result.winningNumber)}
          </strong>
          <div className="draw-winners">
            <span className="draw-result-label">Người trúng giải</span>
            {result.winners.length > 0 ? (
              <ul aria-label={`Người trúng ${draw.label}`}>
                {result.winners.map((winner) => (
                  <li key={winner}>{winner}</li>
                ))}
              </ul>
            ) : (
              <p>Chưa có người trúng giải.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="draw-pending" aria-label={`${draw.label} đang chờ quay`}>
          <span className="draw-pending-number">••</span>
          <p>Giải thưởng sẽ được mở trong buổi tiệc.</p>
        </div>
      )}
    </article>
  );
}

export function PublicDrawPage() {
  const [drawState, setDrawState] = useState<LuckyDrawState | null>(null);
  const [status, setStatus] = useState("Đang tải kết quả quay…");
  const [hasInitialLoadFailure, setHasInitialLoadFailure] = useState(false);
  const requestInFlight = useRef(false);
  const hasGoodState = useRef(false);

  useEffect(() => {
    let active = true;

    async function refresh() {
      if (!active || requestInFlight.current) {
        return;
      }

      requestInFlight.current = true;

      try {
        const nextState = await requestDrawState();
        if (!active) {
          return;
        }

        setDrawState(nextState);
        hasGoodState.current = true;
        setHasInitialLoadFailure(false);
        setStatus("Đang cập nhật kết quả…");
      } catch {
        if (!active) {
          return;
        }

        if (hasGoodState.current) {
          setStatus("Chưa thể cập nhật, đang giữ kết quả gần nhất.");
        } else {
          setHasInitialLoadFailure(true);
          setStatus("Chưa thể tải kết quả, đang thử lại…");
        }
      } finally {
        requestInFlight.current = false;
      }
    }

    void refresh();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    }, POLL_INTERVAL_MS);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const revealedCount = drawState?.draws.filter((draw) => draw.result).length ?? 0;

  return (
    <section className="draw-public-section" aria-labelledby="draw-page-title">
      <div className="section-shell">
        <div className="draw-page-heading">
          <div>
            <span className="eyebrow">Khoảnh khắc hồi hộp nhất</span>
            <h1 className="font-display" id="draw-page-title">
              Quay trúng thưởng
            </h1>
          </div>
          <p>
            Cùng theo dõi năm lượt quay và tìm con số may mắn của mình.
          </p>
        </div>
        <p aria-live="polite" className="draw-polling-status">
          {status}
        </p>
        {!drawState ? (
          <div className="draw-empty-state" role="status">
            {hasInitialLoadFailure
              ? "Chưa tải được bảng kết quả. Hệ thống sẽ tự thử lại."
              : "Đang tải bảng kết quả…"}
          </div>
        ) : (
          <>
            {revealedCount === 0 ? (
              <p className="draw-empty-state">Chưa có giải nào được mở.</p>
            ) : null}
            <div className="draw-card-grid">
              {drawState.draws.map((draw) => (
                <DrawCard key={draw.prizeKey} draw={draw} />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
