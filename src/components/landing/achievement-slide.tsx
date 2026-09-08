export function AchievementSlide() {
  return (
    <section
      className="achievement-slide-section"
      aria-labelledby="achievement-slide-title"
    >
      <div className="section-shell achievement-slide-layout">
        <div className="achievement-slide-mark reveal" aria-hidden="true">
          <strong>1</strong>
          <span>năm cùng nhau</span>
        </div>
        <div className="achievement-slide-copy reveal reveal-delay">
          <span className="eyebrow">2025 - 2026</span>
          <h2 className="font-display" id="achievement-slide-title">
            Chúng mình đã tạo nên nhiều hơn những trận cầu.
          </h2>
          <p>
            Sau một năm, điều đọng lại ở mỗi thành viên không chỉ là kỹ thuật
            tiến bộ hơn, mà là những khoảng khắc chúng mình đã cùng nhau tạo ra.
          </p>
          <p className="achievement-slide-bridge">
            Vì thế, buổi tiệc kỷ niệm này là dịp để chúng mình cùng nhìn lại
            hành trình đã đi qua, nâng ly cho những điều đã tạo nên EcoBadminton
            hôm nay.
          </p>
        </div>
      </div>
    </section>
  );
}
