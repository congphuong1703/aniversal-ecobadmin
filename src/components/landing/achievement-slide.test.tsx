import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AchievementSlide } from "./achievement-slide";

describe("AchievementSlide", () => {
  it("shows only the number one and the approved EcoRun acknowledgement", () => {
    render(<AchievementSlide />);

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.queryByText("năm cùng nhau")).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "EcoRun — một đối thủ, cũng là một người bạn đồng hành và là nhà tài trợ kim cương cho dịp kỷ niệm này.",
      ),
    ).toBeInTheDocument();
  });
});
