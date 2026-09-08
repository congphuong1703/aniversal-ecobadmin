export function AchievementSlide() {
  return (
    <section
      className="achievement-slide-section"
      aria-labelledby="achievement-slide-title"
    >
      <div className="section-shell achievement-slide-layout">
        <div className="achievement-slide-mark reveal" aria-hidden="true">
          <strong>1</strong>
        </div>
        <div className="achievement-slide-copy reveal reveal-delay">
          <span className="eyebrow">2025 - 2026</span>
          <h2 className="font-display" id="achievement-slide-title">
            Chúng mình đã tạo nên nhiều hơn những trận cầu.
          </h2>
          <div className="achievement-slide-groups">
            <div className="achievement-slide-group">
              <h3>EcoBadminton</h3>
              <ul>
                <li>1 năm cùng nhau ra sân.</li>
                <li>1 hành trình cùng nhau tiến bộ.</li>
                <li>1 tập thể cùng nhau gắn kết.</li>
              </ul>
            </div>
            <div className="achievement-slide-group achievement-slide-group-sponsor">
              <h3>EcoRun</h3>
              <ul>
                <li>1 người bạn đồng hành.</li>
                <li>1 đối thủ trên sân.</li>
                <li>1 Nhà tài trợ Kim cương trong dịp kỷ niệm đặc biệt này.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
