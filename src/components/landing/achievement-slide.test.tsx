import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AchievementSlide } from "./achievement-slide";

describe("AchievementSlide", () => {
  it("presents the EcoBadminton journey and EcoRun's three roles", () => {
    render(<AchievementSlide />);

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("1 năm cùng nhau ra sân.")).toBeInTheDocument();
    expect(
      screen.getByText("1 hành trình cùng nhau tiến bộ."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("1 tập thể cùng nhau gắn kết."),
    ).toBeInTheDocument();
    expect(screen.getByText("1 người bạn đồng hành.")).toBeInTheDocument();
    expect(screen.getByText("1 đối thủ trên sân.")).toBeInTheDocument();
    expect(
      screen.getByText(
        "1 Nhà tài trợ Kim cương trong dịp kỷ niệm đặc biệt này.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("EcoRun")).toBeInTheDocument();
  });
});
