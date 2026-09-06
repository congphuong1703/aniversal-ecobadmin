"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export type StoryGalleryImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

type StoryGalleryProps = {
  images: readonly StoryGalleryImage[];
  label: string;
  variant?: "portrait" | "landscape" | "square";
  layout?: "feature" | "duo" | "collage" | "strip" | "mosaic";
};

const ROTATION_MS = 2000;

function getVisibleSlotCount(
  layout: StoryGalleryProps["layout"],
  imageCount: number,
  activeIndex: number,
) {
  const requestedCount =
    layout === "feature"
      ? 1
      : layout === "duo"
        ? 2
        : layout === "collage"
          ? 5
          : layout === "mosaic"
            ? activeIndex % 2 === 0
              ? 5
              : 4
            : 8;

  return Math.min(requestedCount, imageCount);
}

export function StoryGallery({
  images,
  label,
  variant = "landscape",
  layout = "feature",
}: StoryGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (images.length < 2 || isPaused) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((index) =>
        layout === "mosaic" && images.length > 5
          ? (index + 1) % 2
          : (index + 1) % images.length,
      );
    }, ROTATION_MS);

    return () => window.clearInterval(timer);
  }, [images.length, isPaused, layout]);

  if (images.length === 0) {
    return null;
  }

  const visibleSlotCount = getVisibleSlotCount(layout, images.length, activeIndex);
  const mosaicPhase = layout === "mosaic" && images.length > 5 ? activeIndex : 0;
  const mosaicStart = mosaicPhase === 0 ? 0 : 5;
  const visibleImages = Array.from({ length: visibleSlotCount }, (_, slot) => {
    const index =
      layout === "mosaic" && images.length > 5
        ? (mosaicStart + slot) % images.length
        : (activeIndex + slot) % images.length;
    return { image: images[index], index, slot };
  });

  return (
    <div
      className={`story-gallery story-gallery-${variant} story-gallery-layout-${layout}`}
      onFocus={() => setIsPaused(true)}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="story-gallery-frame">
        <div className="story-gallery-stage">
          {visibleImages.map(({ image, index, slot }) => (
            <figure
              className={`story-gallery-slide story-gallery-slot-${slot}${slot === 0 ? " is-active" : ""}`}
              key={`${image.src}-${slot}`}
            >
              <Image
                alt={image.alt}
                fill
                priority={index === 0}
                sizes="(min-width: 1100px) 680px, (min-width: 760px) 55vw, calc(100vw - 40px)"
                src={image.src}
                style={{ objectFit: "cover" }}
              />
            </figure>
          ))}
        </div>
        <div className="story-gallery-frame-line" aria-hidden="true" />
      </div>

      {images.length > 1 ? (
        <div className="story-gallery-controls" role="tablist" aria-label={`Chuyển ảnh: ${label}`}>
          {images.map((image, index) => (
            <button
              aria-label={`Xem ảnh ${index + 1} trong ${label}`}
              aria-selected={
                index ===
                (layout === "mosaic" && images.length > 5
                  ? activeIndex === 0
                    ? 0
                    : 5
                  : activeIndex)
              }
              className={
                index ===
                (layout === "mosaic" && images.length > 5
                  ? activeIndex === 0
                    ? 0
                    : 5
                  : activeIndex)
                  ? "is-active"
                  : ""
              }
              key={image.src}
              role="tab"
              type="button"
              onClick={() =>
                setActiveIndex(
                  layout === "mosaic" && images.length > 5
                    ? index < 5
                      ? 0
                      : 1
                    : index,
                )
              }
            >
              <span aria-hidden="true" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
