import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
  });

  it("submits an attending response directly from the confirmation popup", async () => {
    mockGuestLoad();
    const user = userEvent.setup();
    render(<RsvpExperience />);
    await selectFirstGuest(user);
    await user.type(
      screen.getByLabelText(/Lời nhắn cho EcoBadminton/i),
      "Hẹn gặp cả đội!",
    );
    fetchMock.mockImplementationOnce(() =>
      jsonResponse({
        submission: { ...SUBMISSION, message: "Hẹn gặp cả đội!" },
        deduplicated: false,
      }),
    );

    await user.click(screen.getByRole("button", { name: "Tham gia" }));

    expect(await screen.findByText(/Hẹn gặp bạn vào/i)).toBeInTheDocument();
    const body = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body)) as {
      guestId: string;
      attending: boolean;
      message: string;
      clientSubmissionId: string;
    };
    expect(body).toEqual({
      guestId: "guest-01",
      attending: true,
      message: "Hẹn gặp cả đội!",
      clientSubmissionId: "10000000-0000-4000-8000-000000000001",
    });
  });

  it("moves the decline button three times before enabling it", async () => {
    mockGuestLoad();
    const user = userEvent.setup();
    render(<RsvpExperience />);
    await selectFirstGuest(user);

    const declineButton = screen.getByRole("button", {
      name: "Hẹn dịp khác",
    });
    expect(declineButton).toHaveAttribute("aria-disabled", "true");
    fireEvent.mouseEnter(declineButton);
    fireEvent.mouseEnter(declineButton);
    fireEvent.mouseEnter(declineButton);
    expect(declineButton).toHaveAttribute("aria-disabled", "false");

    fetchMock.mockImplementationOnce(() =>
      jsonResponse({
        submission: { ...SUBMISSION, attending: false },
        deduplicated: false,
      }),
    );
    await user.click(declineButton);

    expect(await screen.findByText(/Tiếc một chút/i)).toBeInTheDocument();
    const body = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body)) as {
      attending: boolean;
    };
    expect(body.attending).toBe(false);
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

  it("locks the popup while a direct submission is pending", async () => {
    mockGuestLoad();
    const user = userEvent.setup();
    let resolveSubmission!: (response: Response) => void;
    render(<RsvpExperience />);
    await selectFirstGuest(user);
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSubmission = resolve;
        }),
    );

    await user.click(screen.getByRole("button", { name: "Tham gia" }));

    const loadingButton = screen.getByRole("button", { name: /đang gửi/i });
    expect(loadingButton).toBeDisabled();
    expect(
      screen.getByLabelText(/Lời nhắn cho EcoBadminton/i),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: /đóng/i })).toBeDisabled();

    resolveSubmission(
      new Response(
        JSON.stringify({ submission: SUBMISSION, deduplicated: false }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    expect(await screen.findByText(/Hẹn gặp bạn vào/i)).toBeInTheDocument();
  });
});
