import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  StoryGallery,
  type StoryGalleryImage,
} from "./story-gallery";

const THREE_IMAGES: readonly StoryGalleryImage[] = [
  {
    src: "/story/one.jpg",
    alt: "Ảnh một",
    width: 1200,
    height: 900,
  },
  {
    src: "/story/two.jpg",
    alt: "Ảnh hai",
    width: 1200,
    height: 900,
  },
  {
    src: "/story/three.jpg",
    alt: "Ảnh ba",
    width: 1200,
    height: 900,
  },
];

const NINE_IMAGES: readonly StoryGalleryImage[] = Array.from(
  { length: 9 },
  (_, index) => ({
    src: `/story/mosaic-${index + 1}.jpg`,
    alt: `Ảnh mosaic ${index + 1}`,
    width: 1200,
    height: 900,
  }),
);

function getControls() {
  return document.querySelectorAll(".story-gallery-controls button");
}

describe("StoryGallery", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("rotates only after three seconds", () => {
    render(<StoryGallery images={THREE_IMAGES} label="Ảnh" layout="feature" />);

    expect(getControls()[0]).toHaveClass("is-active");
    act(() => vi.advanceTimersByTime(2999));
    expect(getControls()[0]).toHaveClass("is-active");
    act(() => vi.advanceTimersByTime(1));
    expect(getControls()[1]).toHaveClass("is-active");
  });

  it("renders one indicator per navigable mosaic group", () => {
    render(<StoryGallery images={NINE_IMAGES} label="Gắn kết" layout="mosaic" />);

    expect(getControls()).toHaveLength(2);
  });

  it("opens the clicked visible image in a modal and closes it", () => {
    render(<StoryGallery images={THREE_IMAGES} label="Ảnh" layout="feature" />);

    fireEvent.click(screen.getByRole("button", { name: "Mở ảnh: Ảnh một" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByRole("dialog").querySelector(".story-gallery-modal-image"),
    ).toHaveAttribute("alt", "Ảnh một");

    fireEvent.click(screen.getByRole("button", { name: "Đóng" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("pauses rotation while the image modal is open", () => {
    render(<StoryGallery images={THREE_IMAGES} label="Ảnh" layout="feature" />);

    fireEvent.click(screen.getByRole("button", { name: "Mở ảnh: Ảnh một" }));
    act(() => vi.advanceTimersByTime(6000));

    expect(getControls()[0]).toHaveClass("is-active");
  });
});
