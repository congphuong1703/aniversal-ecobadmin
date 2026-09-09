import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PublicDrawPage } from "./public-draw-page";

const PENDING_DRAWS = {
  draws: [
    {
      prizeRank: 1,
      prizeKey: "special",
      label: "Giải đặc biệt",
      reward: "Công bố sau",
      result: null,
    },
    {
      prizeRank: 2,
      prizeKey: "second",
      label: "Giải nhì",
      reward: "Công bố sau",
      result: null,
    },
    {
      prizeRank: 3,
      prizeKey: "third",
      label: "Giải ba",
      reward: "Công bố sau",
      result: null,
    },
    {
      prizeRank: 4,
      prizeKey: "fourth",
      label: "Giải tư",
      reward: "Công bố sau",
      result: null,
    },
    {
      prizeRank: 5,
      prizeKey: "fifth",
      label: "Giải năm",
      reward: "Công bố sau",
      result: null,
    },
  ],
};

const REVEALED_DRAWS = {
  draws: PENDING_DRAWS.draws.map((draw) =>
    draw.prizeRank === 1
      ? {
          ...draw,
          result: {
            prizeRank: 1,
            prizeKey: "special",
            label: "Giải đặc biệt",
            winningNumber: 1,
            winners: ["Nguyễn Văn An", "Trần Minh Châu"],
            createdAt: "2026-09-17T13:00:00.000Z",
          },
        }
      : draw,
  ),
};

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(body: unknown, init?: ResponseInit) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
      ...init,
    }),
  );
}

async function flushRequests() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("PublicDrawPage", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("resets explicitly placed information children on mobile", () => {
    const styles = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

    expect(styles).toMatch(
      /\.draw-info-block > \.eyebrow,[\s\S]*?\.draw-info-block > h2,[\s\S]*?\.draw-info-block > ol,[\s\S]*?\.draw-info-block > p:not\(\.draw-info-note\),[\s\S]*?\.draw-info-block > \.draw-info-note\s*\{\s*grid-column: auto;\s*grid-row: auto;/,
    );
    expect(styles).toMatch(
      /\.draw-info-block h2,\s*\.draw-results-heading h2\s*\{[^}]*white-space:\s*nowrap;/,
    );
    expect(styles).toMatch(/\.draw-anchor-nav a:hover\s*\{[\s\S]*?color:/);
  });

  it("renders information sections, pending prizes, and reward details", async () => {
    fetchMock.mockImplementationOnce(() => jsonResponse(PENDING_DRAWS));

    render(<PublicDrawPage />);

    expect(await screen.findByRole("heading", { name: "Quay trúng thưởng" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Điều hướng quay thưởng" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Thể lệ" })).toHaveAttribute("href", "#the-le");
    expect(screen.getByRole("link", { name: "Giải thưởng" })).toHaveAttribute("href", "#giai-thuong");
    expect(screen.getByRole("link", { name: "Cách kiểm tra" })).toHaveAttribute(
      "href",
      "#cach-kiem-tra",
    );
    expect(screen.getByRole("link", { name: "Kết quả" })).toHaveAttribute("href", "#ket-qua");
    expect(screen.getByRole("heading", { name: "Thể lệ tham gia" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Giải thưởng" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Cách kiểm tra" }).closest("section"),
    ).toHaveAttribute("id", "cach-kiem-tra");
    expect(
      screen.getByText("Sân khấu may mắn · Ban tổ chức điều khiển"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Mỗi lượt, ban tổ chức sẽ quay ngẫu nhiên một giải chưa được mở."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/admin/i)).not.toBeInTheDocument();
    expect(
      screen.getByText(/trong thẻ xác nhận thành công.*5 số may mắn/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/thẻ xác nhận RSVP thành công/i)).not.toBeInTheDocument();
    expect(screen.getByText(/so sánh.*kết quả.*công bố/i)).toBeInTheDocument();
    expect(screen.getByText("Đã mở 0/5 giải")).toBeInTheDocument();
    expect(screen.getByRole("status", { name: /tiến trình quay/i })).toHaveAttribute(
      "aria-live",
      "polite",
    );
    expect(screen.getByText(/ban tổ chức là người duy nhất được quay/i)).toBeInTheDocument();
    expect(screen.queryByText(/admin là người duy nhất được quay/i)).not.toBeInTheDocument();
    expect(screen.getByText(/tất cả khách có cùng số trúng/i)).toBeInTheDocument();
    expect(screen.queryByText(/Cùng theo dõi năm lượt quay/i)).not.toBeInTheDocument();
    expect(screen.getAllByText("Chờ quay")).toHaveLength(5);
    expect(screen.getAllByText("Công bố sau")).toHaveLength(5);
    expect(screen.queryByText(/· Demo|nội dung sẽ cập nhật/i)).not.toBeInTheDocument();
    expect(screen.getByText(/chưa có giải nào được mở/i)).toBeInTheDocument();
    expect(screen.queryByText(/nội bộ|pháp lý/i)).not.toBeInTheDocument();
  });

  it("renders the two-digit winning number and every winner name", async () => {
    fetchMock.mockImplementationOnce(() => jsonResponse(REVEALED_DRAWS));

    render(<PublicDrawPage />);

    expect(
      await screen.findByText("01", { selector: ".draw-winning-number" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Nguyễn Văn An")).toBeInTheDocument();
    expect(screen.getByText("Trần Minh Châu")).toBeInTheDocument();
    expect(screen.getAllByText("Chờ quay")).toHaveLength(4);
  });

  it("explains an initial load failure while retrying", async () => {
    fetchMock.mockImplementationOnce(() => Promise.reject(new Error("offline")));

    render(<PublicDrawPage />);

    expect(
      await screen.findByText("Chưa thể tải kết quả, đang thử lại…"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Chưa tải được bảng kết quả. Hệ thống sẽ tự thử lại."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Đang tải bảng kết quả…")).not.toBeInTheDocument();
  });

  it("polls every two seconds, keeps the last good state after failure, and refreshes later", async () => {
    vi.useFakeTimers();
    fetchMock
      .mockImplementationOnce(() => jsonResponse(PENDING_DRAWS))
      .mockImplementationOnce(() =>
        jsonResponse(
          { error: { code: "INTERNAL_ERROR", message: "Unable to load draws." } },
          { status: 500 },
        ),
      )
      .mockImplementationOnce(() => jsonResponse(REVEALED_DRAWS));

    render(<PublicDrawPage />);
    await flushRequests();
    expect(screen.getAllByText("Chờ quay")).toHaveLength(5);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getAllByText("Chờ quay")).toHaveLength(5);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(
      screen.getByText("01", { selector: ".draw-winning-number" }),
    ).toBeInTheDocument();
  });

  it("pauses polling while hidden and clears polling on unmount", async () => {
    vi.useFakeTimers();
    let visibilityState: DocumentVisibilityState = "visible";
    vi.spyOn(document, "visibilityState", "get").mockImplementation(
      () => visibilityState,
    );
    fetchMock.mockImplementation(() => jsonResponse(PENDING_DRAWS));

    const { unmount } = render(<PublicDrawPage />);
    await flushRequests();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    visibilityState = "hidden";
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    visibilityState = "visible";
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_000);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
