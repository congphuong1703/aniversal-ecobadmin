import { EVENT } from "@/data/event";

const DETAILS = [
  { label: "Thời gian", value: `${EVENT.time} · ${EVENT.date}` },
  { label: "Địa điểm", value: EVENT.venue },
  { label: "Di chuyển", value: EVENT.transportation },
  { label: "Dress code", value: EVENT.dressCode },
] as const;

export function EventDetails() {
  return (
    <section className="event-section" id="details" aria-labelledby="event-title">
      <div className="section-shell event-layout">
        <div className="event-title reveal">
          <span className="eyebrow">Cuộc hẹn</span>
          <h2 className="font-display" id="event-title">Đến vì đội. Ở lại vì chuyện vui.</h2>
          <p>
            Một buổi tối không CẦU kỳ, không CHẠY deadline — chỉ cần đúng người, đúng bàn và đúng thời điểm.
          </p>
        </div>
        <div className="event-card reveal reveal-delay">
          <div className="event-card-top">
            <span>01 / Anniversary</span>
            <span>Invitation only</span>
          </div>
          <dl>
            {DETAILS.map((detail) => (
              <div key={detail.label}>
                <dt>{detail.label}</dt>
                <dd>{detail.value}</dd>
              </div>
            ))}
          </dl>
          <a href={EVENT.mapUrl} rel="noreferrer" target="_blank">
            Mở trên Google Maps <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </section>
  );
}
