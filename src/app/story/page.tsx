import type { Metadata } from "next";
import Link from "next/link";

import { Story } from "@/components/landing/story";

export const metadata: Metadata = {
  title: "Câu chuyện | EcoBadminton",
  description: "Những khoảnh khắc trên sân của EcoBadminton trong một năm qua.",
};

type StoryPageProps = {
  searchParams: Promise<{ from?: string }>;
};

export default async function StoryPage({ searchParams }: StoryPageProps) {
  const { from } = await searchParams;
  const backHref = from === "page2" ? "/#story-teaser-title" : "/#top";

  return (
    <main>
      <header className="story-page-header">
        <div className="story-page-header-inner">
          <Link className="brand-mark" href="/" aria-label="EcoBadminton - trang chủ">
            <span>Eco</span>
            <strong>Badminton</strong>
          </Link>
          <Link className="story-page-back" href={backHref}>
            <span aria-hidden="true">←</span> Quay lại
          </Link>
        </div>
      </header>
      <Story />
    </main>
  );
}
