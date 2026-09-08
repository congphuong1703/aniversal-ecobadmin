"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { Modal } from "@/components/ui/modal";

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

const ROTATION_MS = 3000;

function getSlideStateCount(
  layout: StoryGalleryProps["layout"],
  imageCount: number,
) {
  if (imageCount === 0) {
    return 0;
  }

  if (layout === "mosaic" && imageCount > 5) {
    return 2;
  }

  return imageCount;
}

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
  const [selectedImage, setSelectedImage] = useState<StoryGalleryImage | null>(
    null,
  );

  useEffect(() => {
    if (images.length < 2 || isPaused || selectedImage !== null) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex(
        (index) => (index + 1) % getSlideStateCount(layout, images.length),
      );
    }, ROTATION_MS);

    return () => window.clearInterval(timer);
  }, [images.length, isPaused, layout, selectedImage]);

  if (images.length === 0) {
    return null;
  }

  const slideStateCount = getSlideStateCount(layout, images.length);
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
              <button
                aria-label={`Mở ảnh: ${image.alt}`}
                className="story-gallery-image-button"
                type="button"
                onClick={() => setSelectedImage(image)}
              >
                <Image
                  alt={image.alt}
                  fill
                  priority={index === 0}
                  sizes="(min-width: 1100px) 680px, (min-width: 760px) 55vw, calc(100vw - 40px)"
                  src={image.src}
                  style={{ objectFit: "cover" }}
                />
              </button>
            </figure>
          ))}
        </div>
        <div className="story-gallery-frame-line" aria-hidden="true" />
      </div>

      {images.length > 1 ? (
        <div className="story-gallery-controls" role="tablist" aria-label={`Chuyển ảnh: ${label}`}>
          {Array.from({ length: slideStateCount }, (_, index) => (
            <button
              aria-label={`${layout === "mosaic" && images.length > 5 ? "Xem nhóm ảnh" : "Xem ảnh"} ${index + 1} trong ${label}`}
              aria-selected={index === activeIndex}
              className={index === activeIndex ? "is-active" : ""}
              key={`${label}-${index}`}
              role="tab"
              type="button"
              onClick={() => setActiveIndex(index)}
            >
              <span aria-hidden="true" />
            </button>
          ))}
        </div>
      ) : null}

      {selectedImage ? (
        <Modal
          label={`Xem ảnh: ${selectedImage.alt}`}
          onClose={() => setSelectedImage(null)}
        >
          <div className="story-gallery-lightbox">
            <Image
              alt={selectedImage.alt}
              className="story-gallery-modal-image"
              height={selectedImage.height}
              src={selectedImage.src}
              width={selectedImage.width}
            />
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
