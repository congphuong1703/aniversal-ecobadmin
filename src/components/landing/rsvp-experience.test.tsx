import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RsvpExperience } from "./rsvp-experience";

const GUESTS = [
  {
    id: "guest-01",
    fullName: "Nguyễn Văn An",
    imagePath: "/guests/guest-01.svg",
  },
  {
    id: "guest-02",
    fullName: "Trần Minh Châu",
    imagePath: "/guests/guest-02.svg",
    imagePosition: "50% 35%",
  },
];

const SUBMISSION = {
  id: "20000000-0000-4000-8000-000000000001",
  guestId: "guest-01",
  attending: true,
  message: null,
  clientSubmissionId: "10000000-0000-4000-8000-000000000001",
  createdAt: "2026-07-29T02:00:00.000Z",
};

const VERIFICATION = {
  verificationToken: "signed-guest-01-token",
  guest: {
    id: "guest-01",
    maskedName: "Nguyễn V*** A*",
    imagePath: "/guests/guest-01.svg",
  },
};

const LUCKY_NUMBERS = [12, 1, 22, 53, 52] as const;

const fetchMock = vi.fn<typeof fetch>();
const randomUuid = vi.fn();

function jsonResponse(body: unknown, init?: ResponseInit) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" },
      ...init,
    }),
  );
}

function mockGuestLoad() {
  fetchMock.mockImplementationOnce(() => jsonResponse({ guests: GUESTS }));
}

async function selectFirstGuest(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    await screen.findByRole("button", { name: /Nguyễn Văn An/i }),
  );
}

describe("RsvpExperience", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    randomUuid.mockReset();
    randomUuid.mockReturnValue("10000000-0000-4000-8000-000000000001");
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("crypto", { randomUUID: randomUuid });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows the requested guest invitation copy and full names", async () => {
    mockGuestLoad();
    const user = userEvent.setup();

    render(<RsvpExperience />);

    expect(
      await screen.findByText("Bữa tiệc sẽ thật trọn vẹn khi có bạn"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Tham gia ngay thôi!" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("Chọn tên của bạn và xem thư mời."),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: /Nguyễn Văn An/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Chỉ tên đã che được hiển thị công khai."),
    ).not.toBeInTheDocument();

    await selectFirstGuest(user);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("opens one confirmation popup without name verification", async () => {
    mockGuestLoad();
    const user = userEvent.setup();

    render(<RsvpExperience />);
    await selectFirstGuest(user);

    expect(
      screen.getByRole("heading", { name: "Đúng người, đúng cuộc hẹn." }),
    ).toBeInTheDocument();
    expect(screen.getByText("Nguyễn Văn An")).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: /Nguyễn Văn An/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Lời nhắn cho EcoBadminton/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText(/Họ và tên đầy đủ/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/Bước 0[12]/i)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Tham gia" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Hẹn dịp khác" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Hẹn dịp khác" }),
    ).toHaveClass("button-primary");
    expect(screen.queryByText("Không bắt buộc")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/sẵn sàng sau .* lần di chuột/i),
    ).not.toBeInTheDocument();
  });

  it("verifies an attending guest and shows five fixed lucky numbers", async () => {
    mockGuestLoad();
    const user = userEvent.setup();
    render(<RsvpExperience />);
    await selectFirstGuest(user);
    await user.type(
      screen.getByLabelText(/Lời nhắn cho EcoBadminton/i),
      "Hẹn gặp cả đội!",
    );
    fetchMock.mockImplementationOnce(() => jsonResponse(VERIFICATION));
    fetchMock.mockImplementationOnce(() =>
      jsonResponse({
        submission: { ...SUBMISSION, message: "Hẹn gặp cả đội!" },
        deduplicated: false,
        luckyNumbers: LUCKY_NUMBERS,
      }),
    );

    await user.click(screen.getByRole("button", { name: "Tham gia" }));

    expect(await screen.findByText(/Hẹn gặp bạn vào/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/Nếu kế hoạch thay đổi/i),
    ).not.toBeInTheDocument();
    const successActions = screen.getByText("Gửi phản hồi mới").parentElement;
    expect(successActions).toHaveClass("rsvp-success-actions");
    expect(successActions?.firstElementChild).toHaveTextContent(
      "Gửi phản hồi mới",
    );
    expect(successActions?.lastElementChild).toHaveTextContent(
      "Mở Google Maps",
    );

    const luckyNumberList = screen.getByRole("list", {
      name: /năm số may mắn cố định/i,
    });
    expect(luckyNumberList).toHaveTextContent("12");
    expect(luckyNumberList).toHaveTextContent("01");
    expect(luckyNumberList).toHaveTextContent("22");
    expect(luckyNumberList).toHaveTextContent("53");
    expect(luckyNumberList).toHaveTextContent("52");
    expect(luckyNumberList.querySelectorAll(".lucky-number-circle")).toHaveLength(
      5,
    );
  });

  it("submits an attending response with a verification token instead of a guest ID", async () => {
    mockGuestLoad();
    const user = userEvent.setup();
    render(<RsvpExperience />);
    await selectFirstGuest(user);
    fetchMock.mockImplementationOnce(() => jsonResponse(VERIFICATION));
    fetchMock.mockImplementationOnce(() =>
      jsonResponse({
        submission: SUBMISSION,
        deduplicated: false,
        luckyNumbers: LUCKY_NUMBERS,
      }),
    );

    await user.click(screen.getByRole("button", { name: "Tham gia" }));
    expect(await screen.findByText(/Hẹn gặp bạn vào/i)).toBeInTheDocument();

    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/rsvp/verify");
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({
      guestId: "guest-01",
      name: "Nguyễn Văn An",
    });
    expect(fetchMock.mock.calls[2]?.[0]).toBe("/api/rsvp");
    const body = JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body)) as {
      verificationToken: string;
      attending: boolean;
      message: null;
      clientSubmissionId: string;
      guestId?: string;
    };
    expect(body).toEqual({
      verificationToken: "signed-guest-01-token",
      attending: true,
      message: null,
      clientSubmissionId: "10000000-0000-4000-8000-000000000001",
    });
    expect(body).not.toHaveProperty("guestId");
  });

  it("reuses the verification token when an attending submission is retried", async () => {
    mockGuestLoad();
    const user = userEvent.setup();
    render(<RsvpExperience />);
    await selectFirstGuest(user);
    fetchMock.mockImplementationOnce(() => jsonResponse(VERIFICATION));
    fetchMock.mockImplementationOnce(() =>
      jsonResponse(
        { error: { code: "INTERNAL_ERROR", message: "Unable to save RSVP." } },
        { status: 500 },
      ),
    );
    fetchMock.mockImplementationOnce(() =>
      jsonResponse({
        submission: SUBMISSION,
        deduplicated: true,
        luckyNumbers: LUCKY_NUMBERS,
      }),
    );

    await user.click(screen.getByRole("button", { name: "Tham gia" }));
    expect(await screen.findByRole("button", { name: "Thử gửi lại" })).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: /năm số may mắn/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Thử gửi lại" }));
    expect(await screen.findByText(/Hẹn gặp bạn vào/i)).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls.filter(([url]) => url === "/api/rsvp/verify")).toHaveLength(1);
    for (const callIndex of [2, 3]) {
      expect(JSON.parse(String(fetchMock.mock.calls[callIndex]?.[1]?.body))).toMatchObject({
        verificationToken: "signed-guest-01-token",
        attending: true,
        clientSubmissionId: "10000000-0000-4000-8000-000000000001",
      });
    }
  });

  it("moves the decline button five times before enabling it", async () => {
    mockGuestLoad();
    const user = userEvent.setup();
    render(<RsvpExperience />);
    await selectFirstGuest(user);

    const declineButton = screen.getByRole("button", {
      name: "Hẹn dịp khác",
    });
    expect(declineButton).toHaveAttribute("aria-disabled", "true");
    expect(declineButton).not.toHaveStyle({
      transform: "translate(-104px, -84px)",
    });
    fireEvent.mouseEnter(declineButton);
    expect(declineButton).toHaveStyle({
      transform: "translate(-104px, -84px)",
    });
    for (let index = 0; index < 3; index += 1) {
      fireEvent.mouseEnter(declineButton);
    }
    expect(declineButton).toHaveAttribute("aria-disabled", "true");
    fireEvent.mouseEnter(declineButton);
    expect(declineButton).toHaveAttribute("aria-disabled", "false");

    fetchMock.mockImplementationOnce(() =>
      jsonResponse({
        submission: { ...SUBMISSION, attending: false },
        deduplicated: false,
      }),
    );
    await user.click(declineButton);

    expect(
      await screen.findByText(
        "Cảm ơn bạn đã cho EcoBadminton biết. Thật tiếc quá, hẹn bạn vào dịp gần nhất nhaaa!",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Nếu kế hoạch thay đổi/i),
    ).not.toBeInTheDocument();
    const body = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body)) as {
      attending: boolean;
      guestId: string;
      verificationToken?: string;
    };
    expect(body.attending).toBe(false);
    expect(body.guestId).toBe("guest-01");
    expect(body).not.toHaveProperty("verificationToken");
    expect(fetchMock.mock.calls[1]?.[0]).toBe("/api/rsvp");
    expect(
      screen.queryByRole("list", { name: /năm số may mắn/i }),
    ).not.toBeInTheDocument();
  });

  it("shows a warm decline message when the guest leaves a note", async () => {
    mockGuestLoad();
    const user = userEvent.setup();
    render(<RsvpExperience />);
    await selectFirstGuest(user);
    await user.type(
      screen.getByLabelText(/Lời nhắn cho EcoBadminton/i),
      "Mình gửi lời chúc đến cả đội!",
    );

    const declineButton = screen.getByRole("button", {
      name: "Hẹn dịp khác",
    });
    for (let index = 0; index < 10; index += 1) {
      fireEvent.mouseEnter(declineButton);
    }

    fetchMock.mockImplementationOnce(() =>
      jsonResponse({
        submission: {
          ...SUBMISSION,
          attending: false,
          message: "Mình gửi lời chúc đến cả đội!",
        },
        deduplicated: false,
      }),
    );
    await user.click(declineButton);

    expect(
      await screen.findByText(
        "Cảm ơn bạn đã cho EcoBadminton biết. Tiếc một chút, nhưng chúng mình vẫn rất trân quý lời chúc của bạn!",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Nếu kế hoạch thay đổi/i),
    ).not.toBeInTheDocument();
  });

  it("enforces the 1,000 character message limit", async () => {
    mockGuestLoad();
    const user = userEvent.setup();
    render(<RsvpExperience />);
    await selectFirstGuest(user);
    fireEvent.change(screen.getByLabelText(/Lời nhắn cho EcoBadminton/i), {
      target: { value: "a".repeat(1001) },
    });

    await user.click(screen.getByRole("button", { name: "Tham gia" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      /tối đa 1\.000 ký tự/i,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("locks the popup while an attending submission is pending", async () => {
    mockGuestLoad();
    const user = userEvent.setup();
    let resolveSubmission!: (response: Response) => void;
    render(<RsvpExperience />);
    await selectFirstGuest(user);
    fetchMock.mockImplementationOnce(() => jsonResponse(VERIFICATION));
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSubmission = resolve;
        }),
    );

    await user.click(screen.getByRole("button", { name: "Tham gia" }));

    const loadingButton = await screen.findByRole("button", { name: /đang gửi/i });
    expect(loadingButton).toBeDisabled();
    expect(
      screen.getByLabelText(/Lời nhắn cho EcoBadminton/i),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: /đóng/i })).toBeDisabled();

    resolveSubmission(
      new Response(
        JSON.stringify({
          submission: SUBMISSION,
          deduplicated: false,
          luckyNumbers: LUCKY_NUMBERS,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    expect(await screen.findByText(/Hẹn gặp bạn vào/i)).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
  });
});
