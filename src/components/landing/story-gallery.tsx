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
      setActiveIndex((index) => (index + 1) % images.length);
    }, ROTATION_MS);

    return () => window.clearInterval(timer);
  }, [images.length, isPaused]);

  if (images.length === 0) {
    return null;
  }

  return (
    <div
      className={`story-gallery story-gallery-${variant} story-gallery-layout-${layout}`}
      onFocus={() => setIsPaused(true)}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="story-gallery-frame">
        <div className="story-gallery-stage">
          {images.map((image, index) => (
            <figure
              className={`story-gallery-slide${index === activeIndex ? " is-active" : ""}`}
              key={image.src}
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
              aria-selected={index === activeIndex}
              className={index === activeIndex ? "is-active" : ""}
              key={image.src}
              role="tab"
              type="button"
              onClick={() => setActiveIndex(index)}
            >
              <span aria-hidden="true" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
