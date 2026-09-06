import Link from "next/link";

import {
  StoryGallery,
  type StoryGalleryImage,
} from "@/components/landing/story-gallery";

type TimelineEntry = {
  date: string;
  summary: string;
  count: number;
  x: number;
  y: number;
  names?: readonly string[];
};

const FOUNDING_MEMBERS = [
  "Trần Thành Quang",
  "Vũ Minh Đức",
  "Đặng Ngọc Duy",
  "Nguyễn Công Phương",
  "Trần Thị Hồng Hà",
  "Đỗ Thị Nga",
  "Vũ Thị Lan Anh",
] as const;

const TIMELINE: readonly TimelineEntry[] = [
  {
    date: "12/09/2025",
    summary: "EcoBadminton đã thêm 6 thành viên mới",
    count: 7,
    x: 8,
    y: 74,
    names: FOUNDING_MEMBERS,
  },
  {
    date: "17/09/2025",
    summary: "EcoBadminton đã thêm 1 thành viên mới: Đinh Dương Sơn",
    count: 8,
    x: 22,
    y: 64,
  },
  {
    date: "21/07/2026",
    summary: "EcoBadminton đã thêm 1 thành viên mới: Ngô Thục An",
    count: 9,
    x: 36,
    y: 54,
  },
  {
    date: "22/07/2026",
    summary: "EcoBadminton đã thêm 1 thành viên mới: Nguyễn Thùy Linh",
    count: 10,
    x: 50,
    y: 46,
  },
  {
    date: "13/08/2026",
    summary: "EcoBadminton đã thêm 2 thành viên mới: Kim Ngân, Đoàn Thị Chi",
    count: 12,
    x: 64,
    y: 35,
  },
  {
    date: "19/08/2026",
    summary: "EcoBadminton đã thêm 1 thành viên mới: Lê Nhật Dương",
    count: 13,
    x: 77,
    y: 27,
  },
  {
    date: "Hiện nay",
    summary: "13 thành viên + 1 Mads Werner",
    count: 14,
    x: 92,
    y: 12,
  },
] as const;

const STORY_IMAGES: Record<string, readonly StoryGalleryImage[]> = {
  page2: [
    {
      src: "/images/happy_go_to_badminton.png",
      alt: "Cả nhóm vui vẻ lên đường đi đánh cầu lông",
      width: 1024,
      height: 1536,
    },
  ],
  page3: [
    {
      src: "/story/page-3-1.jpg",
      alt: "Thành viên EcoBadminton chuẩn bị ra sân",
      width: 1920,
      height: 2560,
    },
    {
      src: "/story/page-3-2.jpg",
      alt: "Khoảnh khắc sẵn sàng cho trận cầu",
      width: 1920,
      height: 2560,
    },
  ],
  page4: [
    {
      src: "/story/page-4-1.jpg",
      alt: "Các thành viên luyện tập trên sân",
      width: 5712,
      height: 4284,
    },
    {
      src: "/story/page-4-2.jpg",
      alt: "Một buổi hướng dẫn kỹ thuật cầu lông",
      width: 3024,
      height: 4032,
    },
    {
      src: "/story/page-4-3.jpg",
      alt: "Thành viên mới học cách di chuyển trên sân",
      width: 4284,
      height: 5712,
    },
    {
      src: "/story/page-4-4.jpg",
      alt: "Đồng đội cùng nhau luyện tập",
      width: 5712,
      height: 4284,
    },
    {
      src: "/story/page-4-5.jpg",
      alt: "Nụ cười sau một pha cầu",
      width: 4032,
      height: 3024,
    },
  ],
  page5: [
    {
      src: "/story/page-5-1.jpg",
      alt: "Sân cầu lông trong một buổi sinh hoạt của câu lạc bộ",
      width: 5120,
      height: 2880,
    },
    {
      src: "/story/page-5-2.jpg",
      alt: "Các thành viên cùng thi đấu",
      width: 5712,
      height: 4284,
    },
    {
      src: "/story/page-5-3.jpg",
      alt: "Trận cầu sôi nổi trong nhà thi đấu",
      width: 4032,
      height: 3024,
    },
    {
      src: "/story/page-5-4.jpg",
      alt: "Đồng đội trên sân cầu",
      width: 4032,
      height: 3024,
    },
    {
      src: "/story/page-5-5.jpg",
      alt: "Một khoảnh khắc thi đấu đầy năng lượng",
      width: 5712,
      height: 4284,
    },
    {
      src: "/story/page-5-6.jpg",
      alt: "Thành viên EcoBadminton trong trận đấu",
      width: 4284,
      height: 5712,
    },
    {
      src: "/story/page-5-7.jpg",
      alt: "Khoảnh khắc nghỉ giữa các trận cầu",
      width: 4032,
      height: 3024,
    },
    {
      src: "/story/page-5-8.jpg",
      alt: "Cả nhóm cùng tận hưởng buổi chơi cầu",
      width: 4284,
      height: 5712,
    },
  ],
  page6: [
    {
      src: "/story/page-6-1.jpg",
      alt: "Cả nhóm cùng lưu giữ khoảnh khắc bên sân cầu",
      width: 4096,
      height: 2304,
    },
    {
      src: "/story/page-6-2.jpg",
      alt: "Khoảnh khắc thân tình của các thành viên",
      width: 1280,
      height: 960,
    },
    {
      src: "/story/page-6-3.jpg",
      alt: "Niềm vui sau những trận cầu",
      width: 4032,
      height: 2268,
    },
    {
      src: "/story/page-6-4.jpg",
      alt: "Đồng đội cùng nhau chia sẻ niềm vui",
      width: 4032,
      height: 2268,
    },
    {
      src: "/story/page-6-5.jpg",
      alt: "Một khoảnh khắc đáng nhớ của câu lạc bộ",
      width: 1440,
      height: 1440,
    },
    {
      src: "/story/page-6-6.jpg",
      alt: "Thành viên EcoBadminton trong buổi gặp gỡ",
      width: 843,
      height: 1054,
    },
    {
      src: "/story/page-6-7.jpg",
      alt: "Một nụ cười trong buổi sinh hoạt chung",
      width: 1179,
      height: 1474,
    },
    {
      src: "/story/page-6-8.jpg",
      alt: "Cả nhóm cùng tận hưởng thời gian bên nhau",
      width: 1440,
      height: 1440,
    },
    {
      src: "/story/page-6-9.jpg",
      alt: "Khoảnh khắc gắn kết của các thành viên",
      width: 890,
      height: 1113,
    },
  ],
};

type StoryChapterProps = {
  number: string;
  label: string;
  title: string;
  images: readonly StoryGalleryImage[];
  variant?: "portrait" | "landscape" | "square";
  tone?: "ivory" | "navy";
};

function StoryChapter({
  number,
  label,
  title,
  images,
  variant = "landscape",
  tone = "ivory",
}: StoryChapterProps) {
  return (
    <section
      className={`story-chapter story-chapter-${tone}`}
      aria-labelledby={`story-chapter-${number}`}
    >
      <div className="section-shell story-chapter-inner">
        <div className="story-chapter-heading reveal">
          <span className="story-chapter-index">
            {number} / {label}
          </span>
          <h2 className="font-display" id={`story-chapter-${number}`}>
            {title}
          </h2>
        </div>
        <div className="story-chapter-media reveal reveal-delay">
          <StoryGallery images={images} label={label} variant={variant} />
        </div>
      </div>
    </section>
  );
}

function StoryTimeline() {
  return (
    <section
      className="story-timeline-section"
      aria-labelledby="story-timeline-title"
    >
      <div className="section-shell">
        <div className="story-section-lead reveal">
          <span className="story-kicker">01 / Những cột mốc</span>
          <h2 className="font-display" id="story-timeline-title">
            Khởi đầu với số lượng khiêm tốn, EcoBadminton đã không ngừng lớn lên.
          </h2>
          <p>
            Mỗi dấu chấm trên hành trình là một người bạn mới, một buổi ra sân
            mới và một lý do để chúng mình tiếp tục gặp nhau.
          </p>
        </div>

        <div className="story-timeline-card reveal reveal-delay">
          <div className="story-timeline-card-top">
            <span>Thành viên theo thời gian</span>
            <span>12.09.2025 — nay</span>
          </div>
          <div
            className="story-timeline-plot"
            aria-label="Biểu đồ số lượng thành viên EcoBadminton theo thời gian"
          >
            <svg
              aria-hidden="true"
              preserveAspectRatio="none"
              viewBox="0 0 1000 420"
            >
              <defs>
                <linearGradient id="timeline-line" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0" stopColor="#c7f36b" />
                  <stop offset="1" stopColor="#ffffff" />
                </linearGradient>
              </defs>
              <path
                className="story-timeline-gridline"
                d="M 0 84 H 1000 M 0 210 H 1000 M 0 336 H 1000"
              />
              <path
                className="story-timeline-line"
                d="M 80 311 C 144 293 167 282 220 269 S 302 239 360 227 S 433 203 500 193 S 572 166 640 147 S 711 130 770 122 S 848 74 920 50"
                pathLength="1"
              />
            </svg>
            {TIMELINE.map((entry) => (
              <div
                className={`story-timeline-point${entry.x < 15 ? " is-first" : ""}${entry.x > 85 ? " is-last" : ""}`}
                key={entry.date}
                style={{ left: `${entry.x}%`, top: `${entry.y}%` }}
              >
                <button
                  aria-label={`${entry.date}: ${entry.count} thành viên — ${entry.summary}`}
                  type="button"
                >
                  <span aria-hidden="true" />
                </button>
                <div className="story-timeline-tooltip">
                  <strong>{entry.date}</strong>
                  <span className="story-timeline-tooltip-count">
                    {entry.count} thành viên
                  </span>
                  <p>{entry.summary}</p>
                  {entry.names ? (
                    <ul>
                      {entry.names.map((name) => (
                        <li key={name}>{name}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            ))}
            <div className="story-timeline-axis story-timeline-axis-start">7</div>
            <div className="story-timeline-axis story-timeline-axis-end">14</div>
          </div>
          <div className="story-timeline-footer">
            <span>Hover vào từng dấu mốc để xem câu chuyện phía sau.</span>
            <strong>13 thành viên + 1 Mads Werner</strong>
          </div>
        </div>
      </div>
    </section>
  );
}

function StoryInvite() {
  return (
    <section className="story-invite-section" aria-labelledby="story-invite-title">
      <div className="section-shell story-invite-inner">
        <div className="story-invite-heading reveal">
          <span className="story-kicker">07 / Lời mời tham gia nhóm</span>
          <h2 className="font-display" id="story-invite-title">
            Ở EcoBadminton chúng mình luôn chào đón các thành viên mới và chắc chắn rằng:
          </h2>
        </div>
        <div className="story-invite-content reveal reveal-delay">
          <p className="story-invite-label">EcoBadminton - nói KHÔNG với:</p>
          <ul className="story-invite-list">
            <li>Phí tham gia nhóm</li>
            <li>Phí phạt</li>
            <li>Phí rời nhóm</li>
          </ul>
          <p className="story-invite-promise">
            Giờ đây, bạn có thể yên tâm <strong>THAM GIA</strong> cùng chúng mình rồi nè!
          </p>
          <Link className="button-primary story-invite-button" href="/#rsvp">
            Tham gia cùng chúng mình <span aria-hidden="true">→</span>
          </Link>
          <p className="story-invite-signoff">EcoBadminton - Mãi mãi một tình yêu!</p>
        </div>
      </div>
    </section>
  );
}

export function Story() {
  return (
    <div className="story-journey">
      <section className="story-journey-hero" aria-labelledby="story-journey-title">
        <div className="story-hero-orbit story-hero-orbit-one" aria-hidden="true" />
        <div className="story-hero-orbit story-hero-orbit-two" aria-hidden="true" />
        <div className="section-shell story-journey-hero-inner">
          <div className="story-journey-meta">
            <span>Câu chuyện EcoBadminton</span>
            <span>12.09.2025 — nay</span>
          </div>
          <h1 className="font-display" id="story-journey-title">
            Khởi đầu khiêm tốn.
            <em>Lớn lên cùng nhau.</em>
          </h1>
          <div className="story-journey-hero-bottom">
            <p>
              Một hành trình không được đo bằng những trận thắng, mà bằng số lần
              chúng mình chọn quay lại sân — cùng nhau.
            </p>
            <div className="story-journey-stat">
              <strong>14</strong>
              <span>thành viên hiện tại</span>
            </div>
          </div>
        </div>
      </section>

      <StoryTimeline />

      <StoryChapter
        images={STORY_IMAGES.page2}
        label="Lên đường"
        number="02"
        title="Đã tìm thấy bí kíp thất truyền từ thời thượng cổ."
        tone="ivory"
        variant="portrait"
      />
      <StoryChapter
        images={STORY_IMAGES.page3}
        label="Sẵn sàng"
        number="03"
        title="Luôn trong tâm thế sẵn sàng ra sân."
        tone="navy"
        variant="portrait"
      />
      <StoryChapter
        images={STORY_IMAGES.page4}
        label="Cùng tiến bộ"
        number="04"
        title="Ở EcoBadminton, các newbie không cần lo làm sao trở nên pro vì đã có pro lo."
        tone="ivory"
        variant="landscape"
      />
      <StoryChapter
        images={STORY_IMAGES.page5}
        label="Không ngừng ra sân"
        number="05"
        title="Thật sự thì 2 tuần/buổi vẫn chưa thấm vào đâu so với tinh thần ở EcoBadminton, bạn nghĩ sao nếu chúng mình tăng lên 5 buổi/tuần?"
        tone="navy"
        variant="landscape"
      />
      <StoryChapter
        images={STORY_IMAGES.page6}
        label="Đời sống tinh thần"
        number="06"
        title="Ngoài chăm lo đời sống thể thao, chúng mình còn rất chú trọng đến đời sống tinh thần của các thành viên nữa."
        tone="ivory"
        variant="square"
      />

      <StoryInvite />
    </div>
  );
}
