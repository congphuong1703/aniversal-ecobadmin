import "server-only";

export type GuestRecord = {
  id: string;
  fullName: string;
  imagePath: string;
  imagePosition?: string;
};

// IDs and filenames stay stable; only fullName should change when guests change.
export const GUESTS: readonly GuestRecord[] = [
  {
    id: "guest-01",
    fullName: "Mads Werner",
    imagePath: "/guests/guest-01.svg",
  },
  {
    id: "guest-02",
    fullName: "Đào Mai Hoa",
    imagePath: "/guests/guest-02.svg",
  },
  {
    id: "guest-03",
    fullName: "Nguyễn Xuân Quang",
    imagePath: "/guests/guest-03.svg",
  },
  {
    id: "guest-04",
    fullName: "Vũ Thị Hà",
    imagePath: "/guests/guest-04.svg",
  },
  {
    id: "guest-05",
    fullName: "Nguyễn Duy Kiên",
    imagePath: "/guests/guest-05.svg",
  },
  {
    id: "guest-06",
    fullName: "Nguyễn Thu Hằng",
    imagePath: "/guests/guest-06.svg",
  },
  {
    id: "guest-07",
    fullName: "Trần Quang Thành",
    imagePath: "/guests/guest-07.svg",
  },
  {
    id: "guest-08",
    fullName: "Vũ Minh Đức",
    imagePath: "/guests/guest-08.svg",
  },
  {
    id: "guest-09",
    fullName: "Nguyễn Thị Châm",
    imagePath: "/guests/guest-09.svg",
  },
  {
    id: "guest-10",
    fullName: "Nguyễn Ánh Vân",
    imagePath: "/guests/guest-10.svg",
  },
  {
    id: "guest-11",
    fullName: "Đặng Ngọc Duy",
    imagePath: "/guests/guest-11.svg",
  },
  {
    id: "guest-12",
    fullName: "Đặng Văn Hưng",
    imagePath: "/guests/guest-12.svg",
  },
  {
    id: "guest-13",
    fullName: "Đinh Dương Sơn",
    imagePath: "/guests/guest-13.svg",
  },
  {
    id: "guest-14",
    fullName: "Lê Nhật Dương",
    imagePath: "/guests/guest-14.svg",
  },
  {
    id: "guest-15",
    fullName: "Ngô Minh Đức",
    imagePath: "/guests/guest-15.svg",
  },
  {
    id: "guest-16",
    fullName: "Nguyễn Công Phương",
    imagePath: "/guests/guest-16.svg",
  },
  {
    id: "guest-17",
    fullName: "Trần Thị Hồng Hà",
    imagePath: "/guests/guest-17.svg",
  },
  {
    id: "guest-18",
    fullName: "Nguyễn Thị Lan Hương",
    imagePath: "/guests/guest-18.svg",
  },
  {
    id: "guest-19",
    fullName: "Trần Việt Hoàng",
    imagePath: "/guests/guest-19.svg",
  },
  {
    id: "guest-20",
    fullName: "Vũ Thị Lan Anh",
    imagePath: "/guests/guest-20.svg",
  },
  {
    id: "guest-21",
    fullName: "Ngô Thục An",
    imagePath: "/guests/guest-21.svg",
  },
  {
    id: "guest-22",
    fullName: "Nguyễn Thùy Linh",
    imagePath: "/guests/guest-22.svg",
  },
  {
    id: "guest-23",
    fullName: "Nguyễn Quang Tâm",
    imagePath: "/guests/guest-23.svg",
  },
  {
    id: "guest-24",
    fullName: "Đoàn Thị Chi",
    imagePath: "/guests/guest-24.svg",
  },
  {
    id: "guest-25",
    fullName: "Kim Ngân",
    imagePath: "/guests/guest-25.svg",
  },
];

export function findGuestById(id: string) {
  return GUESTS.find((guest) => guest.id === id);
}
