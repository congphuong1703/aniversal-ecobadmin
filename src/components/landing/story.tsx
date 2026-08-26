import Image from "next/image";

type StoryImage = {
  src: string;
  alt: string;
};

type StoryGroup = {
  slug: string;
  label: string;
  title: string;
  paragraph: string;
  draftNote: string;
  images: StoryImage[];
};

const GROUPS: StoryGroup[] = [
  {
    slug: "len-duong",
    label: "Lên đường",
    title: "Cả hội lên đường",
    paragraph:
      "6 giờ chiều, sân đã sáng đèn. Từng nhóm túm năm tụm ba, vợt đeo sau lưng, ai nấy cười tít mắt vì cuối cùng ngày kỷ niệm 1 năm EcoBadminton cũng đến.",
    draftNote: "Thay bằng cảm xúc thật lúc cả nhóm tập trung.",
    images: [{ src: "/images/happy_go_to_badminton.png", alt: "Cả nhóm vui vẻ lên đường đi đánh cầu lông" }],
  },
  {
    slug: "chuan-bi",
    label: "Chuẩn bị",
    title: "Chuẩn bị sân bãi",
    paragraph:
      "Trước giờ G, đội hậu cần tất bật căng lưới, kê ghế, dán banner. Vài bạn tranh thủ khởi động, vài bạn tranh thủ... chụp ảnh sống ảo.",
    draftNote: "Bổ sung ai phụ trách khâu nào.",
    images: [
      { src: "/images/chuan_bi.png", alt: "Chuẩn bị sân bãi trước giờ thi đấu" },
      { src: "/images/chuan_bi_2.png", alt: "Chuẩn bị dụng cụ, banner sự kiện" },
    ],
  },
  {
    slug: "huong-dan",
    label: "Hướng dẫn",
    title: "Hướng dẫn tân binh",
    paragraph:
      'Với các thành viên mới toanh, các "tiền bối" của EcoBadminton nhiệt tình cầm tay chỉ việc, từ cách cầm vợt đến luật tính điểm. Đúng chất một CLB "cây nhà lá vườn".',
    draftNote: "Kể tên ai hướng dẫn, tình huống vui nào xảy ra.",
    images: [
      { src: "/images/huong_dan_1.png", alt: "Hướng dẫn thành viên mới cầm vợt" },
      { src: "/images/huong_dan_2.png", alt: "Hướng dẫn luật chơi cho tân binh" },
    ],
  },
  {
    slug: "doi-hinh",
    label: "Đội hình",
    title: "Đội hình ra sân",
    paragraph:
      'Danh sách đội hình được xướng tên, từng cặp bước ra sân trong tiếng vỗ tay. Ai cũng háo hức xem mình bốc thăm trúng "đối thủ" nào.',
    draftNote: "Điền đội hình thật, ai đấu với ai.",
    images: [{ src: "/images/doi_hinh.png", alt: "Đội hình các thành viên ra sân thi đấu" }],
  },
  {
    slug: "siu",
    label: "Siu",
    title: "Siu — khoảnh khắc để đời",
    paragraph:
      "Đây là những pha bóng khiến cả sân trầm trồ — một cú đập cầu tốc độ khiến đối thủ trở tay không kịp.",
    draftNote: 'Chưa rõ "siu" là biệt danh ai hay ý gì — bổ sung giúp mình.',
    images: [
      { src: "/images/siu_1.png", alt: "Khoảnh khắc siu trên sân" },
      { src: "/images/siu_2.png", alt: "Khoảnh khắc siu tiếp theo" },
    ],
  },
  {
    slug: "an-uong",
    label: "Ăn uống",
    title: "Tiệc mừng tại Nhậu Tự Do",
    paragraph:
      "Rời sân, cả nhà kéo nhau về Nhậu Tự Do Mega Grand World, nâng ly chúc mừng sinh nhật 1 tuổi của CLB. Tiếng cười, tiếng cụng ly rôm rả suốt buổi tối.",
    draftNote: "Thêm món ăn hoặc khoảnh khắc đáng nhớ.",
    images: [
      { src: "/images/an_uong_1.png", alt: "Cả nhóm ăn uống mừng sinh nhật CLB" },
      { src: "/images/an_uong_2.png", alt: "Nâng ly chúc mừng" },
      { src: "/images/an_uong_3.png", alt: "Bàn tiệc rôm rả" },
    ],
  },
  {
    slug: "hoa-don",
    label: "Hoá đơn",
    title: "Hoá đơn minh bạch",
    paragraph:
      "Để cả nhà yên tâm, đây là toàn bộ hoá đơn chi tiêu cho buổi tiệc — từ đặt sân đến ăn uống, không giấu diếm đồng nào.",
    draftNote: "Đối chiếu số liệu thật, tổng thu/chi quỹ.",
    images: [
      { src: "/images/hoa_don_1.png", alt: "Hoá đơn chi tiêu 1" },
      { src: "/images/hoa_don_2.png", alt: "Hoá đơn chi tiêu 2" },
      { src: "/images/hoa_don_3.png", alt: "Hoá đơn chi tiêu 3" },
      { src: "/images/hoa_don_4.png", alt: "Hoá đơn chi tiêu 4" },
      { src: "/images/hoa_don_5.png", alt: "Hoá đơn chi tiêu 5" },
    ],
  },
  {
    slug: "sinh-nhat",
    label: "Sinh nhật",
    title: "Sinh nhật 1 tuổi EcoBadminton",
    paragraph:
      "Bánh kem được mang ra, cả đội đồng thanh hát chúc mừng sinh nhật. Một năm đầu tiên khép lại — hẹn gặp lại ở những mùa giải tiếp theo!",
    draftNote: "Lời chúc / thông điệp muốn gửi gắm.",
    images: [{ src: "/images/sinh_nhat.png", alt: "Bánh sinh nhật mừng 1 năm CLB" }],
  },
];

export function Story() {
  return (
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
            EcoBadminton là khoảng sân để đồng nghiệp rời màn hình, tìm lại năng lượng và kết
            nối bằng những trận cầu tử tế. Sau một năm, điều đáng nhớ nhất không chỉ là kỹ
            thuật tốt hơn — mà là một đội ngũ gần nhau hơn.
          </p>
        </div>
      </div>

      <div className="section-shell story-groups">
        {GROUPS.map((group, index) => (
          <article className="story-group reveal" key={group.slug} id={group.slug}>
            <div className="story-group-top">
              <span>{String(index + 1).padStart(2, "0")} / {group.label}</span>
              <span>{group.images.length} ảnh</span>
            </div>
            <div className={`photo-grid photo-grid-${Math.min(group.images.length, 5)}`}>
              {group.images.map((image) => (
                <div className="photo-grid-item" key={image.src}>
                  <Image src={image.src} alt={image.alt} fill sizes="(min-width: 760px) 50vw, 100vw" />
                </div>
              ))}
            </div>
            <div className="story-group-copy">
              <h3 className="font-display">{group.title}</h3>
              <p>{group.paragraph}</p>
              <span className="story-draft-tag">Nháp — {group.draftNote}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
