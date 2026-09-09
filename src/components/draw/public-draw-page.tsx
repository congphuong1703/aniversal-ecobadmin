"use client";

import { useEffect, useRef, useState } from "react";

import type {
  LuckyDrawEntry,
  LuckyDrawState,
} from "@/lib/lucky-draw-repository";
import { formatLuckyNumber } from "@/lib/lucky-number-format";

const POLL_INTERVAL_MS = 2_000;

const RULES = [
  "Chỉ khách đã xác nhận tham dự mới được tham gia quay thưởng.",
  "Mỗi khách tham dự nhận 5 số may mắn khác nhau trong khoảng 00–99.",
  "Mỗi lượt, admin sẽ quay ngẫu nhiên một giải chưa được mở.",
  "Mỗi hạng giải chỉ được quay một lần và số trúng không lặp lại.",
  "Tất cả khách sở hữu số trúng sẽ nhận hạng giải tương ứng.",
  "Kết quả đã công bố trên trang này là kết quả chính thức.",
];

async function requestDrawState() {
  const response = await fetch("/api/draws", { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Unable to load draws.");
  }

  return (await response.json()) as LuckyDrawState;
}

function drawProgressLabel(revealedCount: number) {
  if (revealedCount === 0) return "Chưa bắt đầu";
  if (revealedCount === 5) return "Đã hoàn tất";
  return "Đang diễn ra";
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
        <nav aria-label="Điều hướng quay thưởng" className="draw-anchor-nav">
          <a href="#the-le">Thể lệ</a>
          <a href="#giai-thuong">Giải thưởng</a>
          <a href="#cach-kiem-tra">Cách kiểm tra</a>
          <a href="#ket-qua">Kết quả</a>
        </nav>
        <div className="draw-page-intro draw-page-heading">
          <div>
            <span className="eyebrow">Sân khấu may mắn · Admin điều khiển</span>
            <h1 className="font-display" id="draw-page-title">
              Quay trúng thưởng
            </h1>
          </div>
          <p>
            Cùng theo dõi năm lượt quay và tìm con số may mắn của mình.
          </p>
        </div>
        <div
          className="draw-progress"
          role="status"
          aria-live="polite"
          aria-label={`Tiến trình quay: ${revealedCount} trên 5 giải`}
        >
          <strong>Đã mở {revealedCount}/5 giải</strong>
          <span>{drawProgressLabel(revealedCount)}</span>
        </div>
        <section id="the-le" className="draw-info-block" aria-labelledby="draw-rules-title">
          <span className="eyebrow">Minh bạch từ lượt đầu tiên</span>
          <h2 className="font-display" id="draw-rules-title">
            Thể lệ tham gia
          </h2>
          <ol>
            {RULES.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ol>
          <p className="draw-info-note">
            Admin là người duy nhất được quay thưởng; tất cả khách có cùng số trúng sẽ nhận
            hạng giải tương ứng.
          </p>
          <p className="draw-info-note">
            Giải thưởng hiện đang là nội dung demo và sẽ được ban tổ chức cập nhật.
          </p>
        </section>
        <section id="giai-thuong" className="draw-info-block" aria-labelledby="draw-prizes-title">
          <span className="eyebrow">Năm cơ hội</span>
          <h2 className="font-display" id="draw-prizes-title">
            Giải thưởng
          </h2>
          <p>Hạng giải sẽ được hệ thống chọn ngẫu nhiên ở mỗi lượt quay.</p>
        </section>
        <section
          id="cach-kiem-tra"
          className="draw-info-block"
          aria-labelledby="draw-check-title"
        >
          <span className="eyebrow">Đối chiếu thật dễ</span>
          <h2 className="font-display" id="draw-check-title">
            Cách kiểm tra
          </h2>
          <p>
            Trong thẻ xác nhận RSVP thành công, hãy xem 5 số may mắn của bạn; sau đó so sánh
            từng số với các kết quả đã công bố bên dưới.
          </p>
        </section>
        <div id="ket-qua" className="draw-results-heading">
          <span className="eyebrow">Cập nhật trực tiếp</span>
          <h2 className="font-display">Kết quả quay</h2>
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
