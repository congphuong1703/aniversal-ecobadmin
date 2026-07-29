import { Anniversary } from "@/components/landing/anniversary";
import { EventDetails } from "@/components/landing/event-details";
import { Hero } from "@/components/landing/hero";
import { RsvpExperience } from "@/components/landing/rsvp-experience";
import { EVENT } from "@/data/event";

export default function Home() {
  return (
    <main>
      <Hero />
      <section className="story-section" aria-labelledby="story-title">
        <div className="section-shell story-layout">
          <div className="story-stamp reveal" aria-hidden="true">
            <span>Est.</span>
            <strong>2025</strong>
          </div>
          <div className="story-copy reveal reveal-delay">
            <span className="eyebrow">Câu chuyện của chúng mình</span>
            <h2 className="font-display" id="story-title">
              Khởi đầu từ một chiếc vợt. Lớn lên bằng tinh thần đồng đội.
            </h2>
            <p>
              EcoBadminton là khoảng sân để đồng nghiệp rời màn hình, tìm lại năng lượng và kết nối bằng những trận cầu tử tế. Sau một năm, điều đáng nhớ nhất không chỉ là kỹ thuật tốt hơn — mà là một đội ngũ gần nhau hơn.
            </p>
          </div>
        </div>
      </section>
      <EventDetails />
      <Anniversary />
      <RsvpExperience />
      <footer className="site-footer">
        <div className="section-shell">
          <div className="brand-mark brand-mark-footer">
            <span>Eco</span>
            <strong>Badminton</strong>
          </div>
          <p>Kỷ niệm một năm · {EVENT.time} · {EVENT.date}</p>
          <a href="#top">Về đầu trang <span aria-hidden="true">↑</span></a>
        </div>
      </footer>
    </main>
  );
}
