import Link from "next/link";

export function StoryTeaser() {
  return (
    <section className="story-teaser-section" aria-labelledby="story-teaser-title">
      <div className="section-shell story-layout">
        <div className="story-stamp reveal" aria-hidden="true">
          <span>Est.</span>
          <strong>2025</strong>
        </div>
        <div className="story-copy reveal reveal-delay">
          <h2 className="font-display" id="story-teaser-title">
            Khởi đầu từ một chiếc vợt. Lớn lên bằng tinh thần đồng đội.
          </h2>
          <p>
            EcoBadminton là khoảng sân - nơi chúng mình nạp lại năng lượng sau giờ
            làm và kết nối với nhau qua những trận cầu đầy kịch tính.
          </p>
          <Link className="button-primary" href="/story">
            Xem câu chuyện <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
