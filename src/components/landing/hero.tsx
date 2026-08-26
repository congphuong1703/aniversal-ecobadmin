import { EVENT } from "@/data/event";

export function Hero() {
  return (
    <header className="hero">
      <nav className="hero-nav" aria-label="Điều hướng chính">
        <a className="brand-mark" href="#top" aria-label="EcoBadminton - đầu trang">
          <span>Eco</span>
          <strong>Badminton</strong>
        </a>
        <div className="hero-nav-links">
          <a className="nav-story" href="/story">Câu chuyện</a>
          <a className="nav-rsvp" href="#rsvp">Tham dự <span aria-hidden="true">↘</span></a>
        </div>
      </nav>
      <div className="hero-orbit hero-orbit-one" aria-hidden="true" />
      <div className="hero-orbit hero-orbit-two" aria-hidden="true" />
      <div className="hero-content" id="top">
        <div className="hero-copy">
          <p className="hero-kicker">Lời mời kỷ niệm · Năm thứ nhất</p>
          <h1 className="font-display">
            Một năm.
            <span>Chung một nhịp.</span>
          </h1>
          <p className="hero-intro">
            Từ những đường cầu sau giờ làm đến một tập thể cùng tiến lên — mời bạn đến nâng ly cho cột mốc đầu tiên của EcoBadminton.
          </p>
          <a className="hero-button" href="#rsvp">
            Xác nhận tham dự <span aria-hidden="true">↓</span>
          </a>
        </div>
        <div className="hero-date" aria-label={`${EVENT.time}, ngày ${EVENT.date}`}>
          <span>{EVENT.time}</span>
          <strong>17</strong>
          <div>
            <span>Tháng 09</span>
            <span>2026</span>
          </div>
        </div>
      </div>
      <div className="hero-footer">
        <span>Thứ Năm · {EVENT.venue}</span>
        <span>Hưng Yên, Việt Nam</span>
      </div>
    </header>
  );
}
