import type { Metadata } from "next";
import Link from "next/link";

import { PublicDrawPage } from "@/components/draw/public-draw-page";

export const metadata: Metadata = {
  title: "Quay trúng thưởng | EcoBadminton",
  description: "Theo dõi các lượt quay trúng thưởng của EcoBadminton.",
};

export default function PublicDrawRoute() {
  return (
    <main className="draw-page">
      <header className="story-page-header">
        <div className="story-page-header-inner">
          <Link className="brand-mark" href="/" aria-label="EcoBadminton - trang chủ">
            <span>Eco</span>
            <strong>Badminton</strong>
          </Link>
          <Link className="story-page-back" href="/#top">
            <span aria-hidden="true">←</span> Về trang chính
          </Link>
        </div>
      </header>
      <PublicDrawPage />
    </main>
  );
}
