import { Anniversary } from "@/components/landing/anniversary";
import { EventDetails } from "@/components/landing/event-details";
import { Hero } from "@/components/landing/hero";
import { RsvpExperience } from "@/components/landing/rsvp-experience";
import { Story } from "@/components/landing/story";
import { EVENT } from "@/data/event";

export default function Home() {
  return (
    <main>
      <Hero />
      <Story />
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
