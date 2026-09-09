import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Story } from "./story";

describe("Story", () => {
  it("renders the updated invitation copy while keeping its image", () => {
    render(<Story />);

    expect(
      screen.getByRole("heading", {
        name: "Thêm một người bạn, thêm một trận cầu",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Ở EcoBadminton, chúng mình luôn chào đón các thành viên mới.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Đặc biệt:")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "vào đây" }).closest("p"),
    ).toHaveTextContent(
      "Với thành viên từ EcoRun, chúng mình tặng bạn gói dùng thử đến hết 30/9 này. Hãy nhanh tay nhấn vào đây để trải nghiệm ngay thôi!",
    );
    expect(screen.getByRole("link", { name: "vào đây" })).toHaveAttribute(
      "href",
      "/#rsvp",
    );
    expect(
      screen.getByAltText("Minh hoạ EcoTek và quả cầu lông cùng mời bạn tham gia"),
    ).toHaveAttribute("src", expect.stringContaining("invite-ecotek.jpg"));

    expect(screen.queryByText("Phí tham gia nhóm")).not.toBeInTheDocument();
    expect(screen.queryByText("Phí phạt")).not.toBeInTheDocument();
    expect(screen.queryByText("Phí rời nhóm")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Giờ đây, bạn có thể yên tâm THAM GIA/i),
    ).not.toBeInTheDocument();
  });
});
