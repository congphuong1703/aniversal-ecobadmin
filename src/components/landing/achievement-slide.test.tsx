import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AchievementSlide } from "./achievement-slide";

describe("AchievementSlide", () => {
  it("presents the EcoBadminton journey and EcoRun's three roles", () => {
    render(<AchievementSlide />);

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("1 Năm cùng nhau ra sân.")).toBeInTheDocument();
    expect(
      screen.getByText("1 Hành trình cùng nhau tiến bộ."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("1 Tập thể cùng nhau gắn kết."),
    ).toBeInTheDocument();
    expect(screen.getByText("1 Người bạn đồng hành.")).toBeInTheDocument();
    expect(
      screen.getByText("1 Đối thủ cùng nhau thử thách."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "1 Nhà tài trợ Kim cương trong dịp kỷ niệm đặc biệt này.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("EcoRun")).toBeInTheDocument();
  });
});
