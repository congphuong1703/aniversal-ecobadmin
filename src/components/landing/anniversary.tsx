export function Anniversary() {
  return (
    <section className="anniversary-section" aria-labelledby="anniversary-title">
      <div className="anniversary-rings" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="section-shell anniversary-layout">
        <div className="anniversary-number reveal" aria-hidden="true">01</div>
        <div className="anniversary-copy reveal reveal-delay">
          <span className="eyebrow">2025 — 2026</span>
          <h2 className="font-display" id="anniversary-title">Điểm số đầu tiên của một hành trình dài.</h2>
          <p>
            Một năm không được đếm bằng số trận thắng, mà bằng những lần cùng nhau ra sân, cùng cười và cùng trở lại vào tuần sau.
          </p>
          <div className="anniversary-meta">
            <span><strong>1</strong> đồng đội</span>
            <span><strong>1</strong> tinh thần chung</span>
          </div>
        </div>
      </div>
    </section>
  );
}
