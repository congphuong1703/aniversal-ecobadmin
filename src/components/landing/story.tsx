import Image from "next/image";

type StoryImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

type StoryGroup = {
  slug: string;
  label: string;
  title: string;
  images: StoryImage[];
};

const GROUPS: StoryGroup[] = [
  {
    slug: "len-duong",
    label: "Lên đường",
    title: "Đã tìm thấy bí kíp thất truyền từ thời thượng cổ.",
    images: [
      {
        src: "/images/happy_go_to_badminton.png",
        alt: "Cả nhóm vui vẻ lên đường đi đánh cầu lông",
        width: 1024,
        height: 1536,
      },
    ],
  },
  {
    slug: "chuan-bi",
    label: "Chuẩn bị",
    title: "Luôn trong tư thế sẵn sàng.",
    images: [
      {
        src: "/images/chuan_bi.png",
        alt: "Chuẩn bị sân bãi trước giờ thi đấu",
        width: 1920,
        height: 2560,
      },
      {
        src: "/images/chuan_bi_2.png",
        alt: "Chuẩn bị dụng cụ, banner sự kiện",
        width: 2568,
        height: 1926,
      },
    ],
  },
  {
    slug: "huong-dan",
    label: "Hướng dẫn",
    title: "Các newbie không cần lo làm sao trở nên pro vì đã có pro lo.",
    images: [
      {
        src: "/images/huong_dan_1.png",
        alt: "Hướng dẫn thành viên mới cầm vợt",
        width: 453,
        height: 1166,
      },
      {
        src: "/images/huong_dan_2.png",
        alt: "Hướng dẫn luật chơi cho tân binh",
        width: 1099,
        height: 1334,
      },
    ],
  },
  {
    slug: "doi-hinh",
    label: "Đội hình",
    title:
      "Đội hình dự bị chuẩn bị cho trận thi đấu thế giới tại New York City năm 2027.",
    images: [
      {
        src: "/images/doi_hinh.png",
        alt: "Đội hình các thành viên ra sân thi đấu",
        width: 2560,
        height: 1440,
      },
    ],
  },
  {
    slug: "siu",
    label: "Siu",
    title: "Không biết mô tả làm sao, mời mọi người mô tả.",
    images: [
      {
        src: "/images/siu_1.png",
        alt: "Khoảnh khắc siu trên sân",
        width: 2568,
        height: 1926,
      },
      {
        src: "/images/siu_2.png",
        alt: "Khoảnh khắc siu tiếp theo",
        width: 2568,
        height: 1926,
      },
    ],
  },
  {
    slug: "an-uong",
    label: "Ăn uống",
    title: "Sau cầu lông là đói.",
    images: [
      {
        src: "/images/an_uong_1.png",
        alt: "Cả nhóm ăn uống mừng sinh nhật CLB",
        width: 2568,
        height: 1444,
      },
      {
        src: "/images/an_uong_2.png",
        alt: "Nâng ly chúc mừng",
        width: 2568,
        height: 1444,
      },
      {
        src: "/images/an_uong_3.png",
        alt: "Bàn tiệc rôm rả",
        width: 1280,
        height: 960,
      },
    ],
  },
  {
    slug: "hoa-don",
    label: "Hoá đơn",
    title: "Sau đói là những con số được chia.",
    images: [
      {
        src: "/images/hoa_don_1.png",
        alt: "Hoá đơn chi tiêu 1",
        width: 1290,
        height: 2796,
      },
      {
        src: "/images/hoa_don_2.png",
        alt: "Hoá đơn chi tiêu 2",
        width: 1290,
        height: 2796,
      },
      {
        src: "/images/hoa_don_3.png",
        alt: "Hoá đơn chi tiêu 3",
        width: 1290,
        height: 2796,
      },
      {
        src: "/images/hoa_don_4.png",
        alt: "Hoá đơn chi tiêu 4",
        width: 1290,
        height: 2796,
      },
      {
        src: "/images/hoa_don_5.png",
        alt: "Hoá đơn chi tiêu 5",
        width: 1920,
        height: 2560,
      },
    ],
  },
  {
    slug: "sinh-nhat",
    label: "Sinh nhật",
    title: "Mỗi tháng là 1 dịp đặc biệt. Và tháng 9 này còn đặc biệt hơn nữa.",
    images: [
      {
        src: "/images/sinh_nhat.png",
        alt: "Bánh sinh nhật mừng 1 năm CLB",
        width: 2560,
        height: 1440,
      },
    ],
  },
];

function getImageSizes(imageCount: number) {
  if (imageCount === 1) {
    return "(min-width: 1280px) 1240px, calc(100vw - 40px)";
  }

  return "(min-width: 760px) 50vw, 100vw";
}

export function Story() {
  return (
    <section className="story-section" aria-labelledby="story-title">
      <div className="section-shell story-layout">
        <div className="story-stamp reveal" aria-hidden="true">
          <span>Est.</span>
          <strong>2025</strong>
        </div>
        <div className="story-copy reveal reveal-delay">
          <span className="eyebrow">Câu chuyện cảm động</span>
          <h2 className="font-display" id="story-title">
            Khởi đầu từ một chiếc vợt. Lớn lên bằng tinh thần đồng đội.
          </h2>
          <p>
            EcoBadminton là khoảng sân để đồng nghiệp rời màn hình, tìm lại năng
            lượng và kết nối bằng những trận cầu cùng nhau. Sau một năm, điều
            đáng nhớ nhất không chỉ là kỹ thuật tốt hơn — mà là những khoảnh
            khắc cùng nhau.
          </p>
        </div>
      </div>

      <div className="section-shell story-groups">
        {GROUPS.map((group, index) => (
          <article
            className="story-group reveal"
            key={group.slug}
            id={group.slug}
          >
            <div className="story-group-top">
              <span>
                {String(index + 1).padStart(2, "0")} / {group.label}
              </span>
              <span>{group.images.length} ảnh</span>
            </div>
            <div
              className={`photo-grid photo-grid-${Math.min(group.images.length, 5)}`}
            >
              {group.images.map((image) => (
                <div className="photo-grid-item" key={image.src}>
                  <Image
                    src={image.src}
                    alt={image.alt}
                    className="story-photo"
                    width={image.width}
                    height={image.height}
                    sizes={getImageSizes(group.images.length)}
                  />
                </div>
              ))}
            </div>
            <div className="story-group-copy">
              <h3 className="font-display">{group.title}</h3>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
