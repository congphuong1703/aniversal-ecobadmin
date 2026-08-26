import type { Metadata } from "next";
import Link from "next/link";

import { Story } from "@/components/landing/story";

export const metadata: Metadata = {
  title: "Câu chuyện | EcoBadminton",
  description: "Những khoảnh khắc trên sân của EcoBadminton trong một năm qua.",
};

export default function StoryPage() {
  return (
    <main>
      <header className="story-page-header">
        <div className="story-page-header-inner">
          <Link className="brand-mark" href="/" aria-label="EcoBadminton - trang chủ">
            <span>Eco</span>
            <strong>Badminton</strong>
          </Link>
          <Link className="story-page-back" href="/">
            <span aria-hidden="true">←</span> Về trang chủ
          </Link>
        </div>
      </header>
      <Story />
    </main>
  );
}
