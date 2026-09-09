import Image from "next/image";
import Link from "next/link";

import {
  StoryGallery,
  type StoryGalleryImage,
} from "@/components/landing/story-gallery";

type TimelineEntry = {
  date: string;
  summary: string;
  count: number;
  displayCount: string;
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
    summary: "EcoBadminton đã thêm 6 thành viên mới:",
    count: 7,
    displayCount: "7",
    x: 8,
    y: 74,
    names: FOUNDING_MEMBERS,
  },
  {
    date: "17/09/2025",
    summary: "EcoBadminton đã thêm 1 thành viên mới: Đinh Dương Sơn",
    count: 8,
    displayCount: "8",
    x: 22,
    y: 64,
    names: ["Đinh Dương Sơn"],
  },
  {
    date: "21/07/2026",
    summary: "EcoBadminton đã thêm 1 thành viên mới: Ngô Thục An",
    count: 9,
    displayCount: "9",
    x: 36,
    y: 54,
    names: ["Ngô Thục An"],
  },
  {
    date: "22/07/2026",
    summary: "EcoBadminton đã thêm 1 thành viên mới: Nguyễn Thùy Linh",
    count: 10,
    displayCount: "10",
    x: 50,
    y: 46,
    names: ["Nguyễn Thùy Linh"],
  },
  {
    date: "13/08/2026",
    summary: "EcoBadminton đã thêm 2 thành viên mới: Kim Ngân, Đoàn Thị Chi",
    count: 12,
    displayCount: "12",
    x: 64,
    y: 35,
    names: ["Kim Ngân", "Đoàn Thị Chi"],
  },
  {
    date: "19/08/2026",
    summary: "EcoBadminton đã thêm 1 thành viên mới: Lê Nhật Dương",
    count: 13,
    displayCount: "13",
    x: 77,
    y: 27,
    names: ["Lê Nhật Dương"],
  },
  {
    date: "Tương lai",
    summary: "EcoBadminton đang tiếp tục mở rộng",
    count: 13,
    displayCount: "13+",
    x: 92,
    y: 27,
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
  label: string;
  description: string;
  context?: string;
  pretitle?: string;
  showTag?: boolean;
  images: readonly StoryGalleryImage[];
  variant?: "portrait" | "landscape" | "square";
  layout?: "feature" | "duo" | "collage" | "strip" | "mosaic";
  tone?: "ivory" | "navy";
  arrangement?: "split" | "reverse" | "stacked";
};

function StoryChapter({
  label,
  description,
  context,
  pretitle,
  showTag = true,
  images,
  variant = "landscape",
  layout = "feature",
  tone = "ivory",
  arrangement = "split",
}: StoryChapterProps) {
  return (
    <section
      className={`story-chapter story-chapter-${tone} story-chapter-${arrangement} story-chapter-layout-${layout}`}
      aria-label={description}
    >
      <div className="section-shell story-chapter-inner">
        <div className="story-chapter-heading reveal">
          {showTag ? (
            <div className="story-chapter-tag">
              <span>{label}</span>
              <i aria-hidden="true" />
            </div>
          ) : null}
          {pretitle ? (
            <p className="story-chapter-pretitle">{pretitle}</p>
          ) : null}
          <h2 className="story-chapter-description">{description}</h2>
          {context ? <p className="story-chapter-context">{context}</p> : null}
        </div>
        <div className="story-chapter-media reveal reveal-delay">
          <StoryGallery
            images={images}
            label={label}
            layout={layout}
            variant={variant}
          />
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
        <div className="story-timeline-intro-wrap reveal">
          <p className="story-timeline-intro" id="story-timeline-title">
            Khởi đầu với số lượng khiêm tốn, EcoBadminton đã không ngừng lớn
            lên.
          </p>
          <p className="story-timeline-intro-copy">
            Ngày đầu tiên, 7 thành viên cùng đứng trên một sân cầu. Từ mỗi lần
            rủ thêm một người bạn, đường line này dần thành hình — và câu chuyện
            vẫn còn chỗ cho những người tiếp theo.
          </p>
        </div>

        <div className="story-timeline-facts reveal reveal-delay">
          <div>
            <strong>12/09/2025</strong>
            <span>Ngày thành lập</span>
          </div>
          <div>
            <strong>7</strong>
            <span>Thành viên đầu tiên</span>
          </div>
          <div>
            <strong>13+</strong>
            <span>Đích đến tiếp theo</span>
          </div>
        </div>

        <div className="story-timeline-card reveal">
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
                d="M 80 311 C 144 293 167 282 220 269 S 302 239 360 227 S 433 203 500 193 S 572 166 640 147 S 711 130 770 122 S 840 112 920 112"
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
                  aria-label={`${entry.date}: ${entry.displayCount}${entry.displayCount === "13+" ? "" : " thành viên"} — ${entry.summary}`}
                  type="button"
                >
                  <span aria-hidden="true" />
                </button>
                <span className="story-timeline-point-count">
                  {entry.displayCount}
                </span>
                <span
                  className="story-timeline-point-rail"
                  aria-hidden="true"
                />
                <div className="story-timeline-point-info">
                  <strong>{entry.date}</strong>
                  <span>{entry.names?.join(" · ") ?? "Đang mở rộng"}</span>
                </div>
                <div className="story-timeline-tooltip">
                  <strong>{entry.date}</strong>
                  <span className="story-timeline-tooltip-count">
                    {entry.displayCount === "13+"
                      ? entry.displayCount
                      : `${entry.displayCount} thành viên`}
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
          </div>
        </div>
      </div>
    </section>
  );
}

function StoryInvite() {
  return (
    <section
      className="story-invite-section"
      aria-labelledby="story-invite-title"
    >
      <div className="section-shell story-invite-inner">
        <div className="story-invite-art reveal reveal-delay">
          <div className="story-invite-art-frame">
            <Image
              alt="Minh hoạ EcoTek và quả cầu lông cùng mời bạn tham gia"
              fill
              priority
              sizes="(min-width: 1050px) 30vw, (min-width: 760px) 55vw, calc(100vw - 40px)"
              src="/story/invite-ecotek.jpg"
              style={{ objectFit: "cover" }}
            />
          </div>
          <span>Thêm một người bạn, thêm một trận cầu.</span>
        </div>
        <div className="story-invite-content reveal reveal-delay">
          <h2 className="font-display" id="story-invite-title">
            Thêm một người bạn, thêm một trận cầu
          </h2>
          <p className="story-invite-promise">
            Ở EcoBadminton, chúng mình luôn chào đón các thành viên mới.
          </p>
          <p className="story-invite-promise">
            <strong>Đặc biệt:</strong> Với thành viên từ EcoRun, chúng mình tặng bạn gói dùng
            thử đến hết 30/9 này. Hãy nhanh tay nhấn <Link href="/#rsvp">vào đây</Link> để
            trải nghiệm ngay thôi!
          </p>
        </div>
      </div>
    </section>
  );
}

export function Story() {
  return (
    <div className="story-journey">
      <StoryTimeline />

      <StoryChapter
        images={STORY_IMAGES.page2}
        label="Lên đường"
        description="Đã tìm thấy bí kíp thất truyền từ thời thượng cổ."
        pretitle="Bạn thấy cuộc sống này quá áp lực? Đâu mới là nơi bạn thuộc về?"
        showTag={false}
        layout="feature"
        tone="ivory"
        variant="portrait"
      />
      <StoryChapter
        images={STORY_IMAGES.page3}
        label="Sẵn sàng"
        description="Luôn trong tâm thế sẵn sàng ra sân."
        showTag={false}
        arrangement="reverse"
        layout="duo"
        tone="navy"
        variant="portrait"
      />
      <StoryChapter
        images={STORY_IMAGES.page4}
        label="Cùng tiến bộ"
        description="Ở EcoBadminton, các newbie không cần lo làm sao trở nên pro vì đã có pro lo."
        context="Từ những cú phát cầu còn vụng về đến những pha phối hợp ăn ý, mỗi người đều có một người bạn bên cạnh để chỉ dẫn, tiếp thêm tự tin và cùng nhau tiến bộ."
        arrangement="stacked"
        layout="collage"
        tone="ivory"
        variant="landscape"
      />
      <StoryChapter
        images={STORY_IMAGES.page5}
        label="Cách chúng mình hoạt động"
        description="Thật sự thì 2 buổi/tuần vẫn chưa thấm vào đâu so với tinh thần ở EcoBadminton, bạn nghĩ sao nếu chúng mình tăng lên 5 buổi/tuần?"
        showTag={true}
        arrangement="stacked"
        layout="strip"
        tone="navy"
        variant="landscape"
      />
      <StoryChapter
        images={STORY_IMAGES.page6}
        label="Cách chúng mình gắn kết"
        description="Ngoài chăm lo đời sống thể thao, chúng mình còn rất chú trọng đến đời sống tinh thần của các thành viên nữa."
        context="Những bữa tiệc nhỏ, lời chúc bất ngờ và những lần ngồi lại sau trận đấu khiến EcoBadminton trở thành một nhóm người thật sự thuộc về nhau."
        arrangement="reverse"
        layout="mosaic"
        tone="ivory"
        variant="square"
      />

      <StoryInvite />
    </div>
  );
}
