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
    maskedName: "Nguyễn V** A*",
    imagePath: "/guests/guest-01.svg",
  },
  {
    id: "guest-02",
    maskedName: "Trần M*** C***",
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
  await screen.findByRole("radio", { name: /Nguyễn V\*\* A\*/i });
  await user.click(screen.getByRole("radio", { name: /Nguyễn V\*\* A\*/i }));
  await user.click(screen.getByRole("button", { name: /tiếp tục/i }));
}

async function verifyFirstGuest(user: ReturnType<typeof userEvent.setup>) {
  await selectFirstGuest(user);
  fetchMock.mockImplementationOnce(() =>
    jsonResponse({ verificationToken: "signed-token", guest: GUESTS[0] }),
  );
  await user.type(screen.getByLabelText(/họ và tên đầy đủ/i), "Nguyễn Văn An");
  await user.click(screen.getByRole("button", { name: /xác minh/i }));
  await screen.findByRole("heading", { name: /bạn sẽ tham dự chứ/i });
}

describe("RsvpExperience", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    randomUuid.mockReset();
    randomUuid
      .mockReturnValueOnce("10000000-0000-4000-8000-000000000001")
      .mockReturnValueOnce("10000000-0000-4000-8000-000000000002");
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("crypto", { randomUUID: randomUuid });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("keeps empty gallery validation reachable and focuses the first guest", async () => {
    mockGuestLoad();
    const user = userEvent.setup();

    render(<RsvpExperience />);

    expect(await screen.findAllByRole("radio")).toHaveLength(GUESTS.length);
    const continueButton = screen.getByRole("button", { name: /tiếp tục/i });
    const guestGroup = screen.getByRole("group", {
      name: /chọn ảnh của bạn trong danh sách khách mời/i,
    });
    const firstGuest = screen.getByRole("radio", {
      name: /Nguyễn V\*\* A\*/i,
    });

    expect(continueButton).toBeEnabled();
    expect(continueButton).toHaveAttribute("aria-disabled", "true");

    await user.click(continueButton);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(/chọn ảnh của bạn/i);
    expect(guestGroup).toHaveAttribute("aria-describedby", alert.id);
    expect(guestGroup).toHaveAttribute("aria-invalid", "true");
    expect(firstGuest).toHaveFocus();

    await user.click(
      screen.getByRole("radio", { name: /Trần M\*\*\* C\*\*\*/i }),
    );

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(guestGroup).not.toHaveAttribute("aria-describedby");
    expect(guestGroup).not.toHaveAttribute("aria-invalid");
    expect(continueButton).toHaveAttribute("aria-disabled", "false");
  });

  it("shows the selected portrait and masked name during verification", async () => {
    mockGuestLoad();
    const user = userEvent.setup();

    render(<RsvpExperience />);
    await selectFirstGuest(user);

    expect(
      screen.getByRole("img", { name: /Nguyễn V\*\* A\*/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Nguyễn V** A*")).toBeInTheDocument();
  });

  it("keeps the entered name after a verification network failure", async () => {
    mockGuestLoad();
    const user = userEvent.setup();

    render(<RsvpExperience />);
    await selectFirstGuest(user);
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    const nameInput = screen.getByLabelText(/họ và tên đầy đủ/i);
    await user.type(nameInput, "Nguyễn Văn An");
    await user.click(screen.getByRole("button", { name: /xác minh/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /không thể kết nối/i,
    );
    expect(nameInput).toHaveValue("Nguyễn Văn An");
  });

  it("requires an attendance choice and focuses the first invalid control", async () => {
    mockGuestLoad();
    const user = userEvent.setup();

    render(<RsvpExperience />);
    await verifyFirstGuest(user);
    await user.click(screen.getByRole("button", { name: /gửi phản hồi/i }));

    const attendanceGroup = screen.getByRole("group", {
      name: /bạn có tham dự không/i,
    });
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(/chọn tham dự hoặc không tham dự/i);
    const attendingRadio = screen.getByRole("radio", { name: /^tham dự$/i });
    expect(attendanceGroup.nextElementSibling).toBe(alert);
    expect(attendanceGroup).toHaveAttribute("aria-describedby", alert.id);
    expect(attendanceGroup).toHaveAttribute("aria-invalid", "true");
    expect(attendingRadio).toHaveFocus();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("enforces the 1,000 character message limit", async () => {
    mockGuestLoad();
    const user = userEvent.setup();

    render(<RsvpExperience />);
    await verifyFirstGuest(user);
    await user.click(screen.getByRole("radio", { name: /^tham dự$/i }));
    fireEvent.change(screen.getByLabelText(/lời nhắn/i), {
      target: { value: "a".repeat(1001) },
    });
    await user.click(screen.getByRole("button", { name: /gửi phản hồi/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/tối đa 1\.000 ký tự/i);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    [true, /hẹn gặp bạn vào 19:00 ngày 17\/09\/2026/i],
    [false, /cảm ơn bạn đã cho EcoBadminton biết/i],
  ])(
    "renders the matching success copy for attending=%s",
    async (attending, copy) => {
      mockGuestLoad();
      const user = userEvent.setup();

      render(<RsvpExperience />);
      await verifyFirstGuest(user);
      await user.click(
        screen.getByRole("radio", {
          name: attending ? /^tham dự$/i : /không tham dự/i,
        }),
      );
      fetchMock.mockImplementationOnce(() =>
        jsonResponse({
          submission: { ...SUBMISSION, attending },
          deduplicated: false,
        }),
      );
      await user.click(screen.getByRole("button", { name: /gửi phản hồi/i }));

      expect(await screen.findByText(copy)).toBeInTheDocument();
    },
  );

  it("reuses one UUID for a technical retry and creates a new UUID for a later intentional response", async () => {
    mockGuestLoad();
    const user = userEvent.setup();

    render(<RsvpExperience />);
    await verifyFirstGuest(user);
    await user.click(screen.getByRole("radio", { name: /^tham dự$/i }));
    fetchMock
      .mockRejectedValueOnce(new TypeError("Response lost"))
      .mockImplementationOnce(() =>
        jsonResponse({ submission: SUBMISSION, deduplicated: true }),
      );

    await user.click(screen.getByRole("button", { name: /gửi phản hồi/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /chưa nhận được xác nhận/i,
    );
    await user.click(screen.getByRole("button", { name: /thử gửi lại/i }));
    await screen.findByText(/hẹn gặp bạn/i);

    const firstAttemptBody = JSON.parse(
      String(fetchMock.mock.calls[2]?.[1]?.body),
    ) as { clientSubmissionId: string };
    const retryBody = JSON.parse(
      String(fetchMock.mock.calls[3]?.[1]?.body),
    ) as { clientSubmissionId: string };
    expect(firstAttemptBody.clientSubmissionId).toBe(
      retryBody.clientSubmissionId,
    );
    expect(randomUuid).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: /gửi phản hồi mới/i }));
    fetchMock.mockImplementationOnce(() =>
      jsonResponse({
        submission: {
          ...SUBMISSION,
          clientSubmissionId: "10000000-0000-4000-8000-000000000002",
        },
        deduplicated: false,
      }),
    );
    await user.click(screen.getByRole("button", { name: /gửi phản hồi/i }));

    await waitFor(() => expect(randomUuid).toHaveBeenCalledTimes(2));
    const laterAttemptBody = JSON.parse(
      String(fetchMock.mock.calls[4]?.[1]?.body),
    ) as { clientSubmissionId: string };
    expect(laterAttemptBody.clientSubmissionId).not.toBe(
      firstAttemptBody.clientSubmissionId,
    );
  });

  it("creates a new UUID when the guest edits a failed submission before sending again", async () => {
    mockGuestLoad();
    const user = userEvent.setup();

    render(<RsvpExperience />);
    await verifyFirstGuest(user);
    await user.click(screen.getByRole("radio", { name: /^tham dự$/i }));
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await user.click(screen.getByRole("button", { name: /gửi phản hồi/i }));
    await screen.findByRole("button", { name: /thử gửi lại/i });

    await user.type(screen.getByLabelText(/lời nhắn/i), "Kế hoạch mới");
    fetchMock.mockImplementationOnce(() =>
      jsonResponse({
        submission: {
          ...SUBMISSION,
          message: "Kế hoạch mới",
          clientSubmissionId: "10000000-0000-4000-8000-000000000002",
        },
        deduplicated: false,
      }),
    );
    await user.click(screen.getByRole("button", { name: /gửi phản hồi/i }));

    await screen.findByText(/hẹn gặp bạn/i);
    const firstBody = JSON.parse(
      String(fetchMock.mock.calls[2]?.[1]?.body),
    ) as { clientSubmissionId: string };
    const changedBody = JSON.parse(
      String(fetchMock.mock.calls[3]?.[1]?.body),
    ) as { clientSubmissionId: string };
    expect(changedBody.clientSubmissionId).not.toBe(
      firstBody.clientSubmissionId,
    );
    expect(randomUuid).toHaveBeenCalledTimes(2);
  });

  it("preserves the retry UUID when an expired token must be renewed", async () => {
    mockGuestLoad();
    const user = userEvent.setup();

    render(<RsvpExperience />);
    await verifyFirstGuest(user);
    await user.click(screen.getByRole("radio", { name: /^tham dự$/i }));
    fetchMock.mockRejectedValueOnce(new TypeError("Response lost"));
    await user.click(screen.getByRole("button", { name: /gửi phản hồi/i }));

    fetchMock.mockImplementationOnce(() =>
      jsonResponse(
        {
          error: {
            code: "INVALID_VERIFICATION_TOKEN",
            message: "Verification is invalid or expired.",
          },
        },
        { status: 401 },
      ),
    );
    await user.click(
      await screen.findByRole("button", { name: /thử gửi lại/i }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(/hết hạn/i);

    fetchMock.mockImplementationOnce(() =>
      jsonResponse({ verificationToken: "renewed-token", guest: GUESTS[0] }),
    );
    fetchMock.mockImplementationOnce(() =>
      jsonResponse({ submission: SUBMISSION, deduplicated: true }),
    );
    await user.click(screen.getByRole("button", { name: /xác minh/i }));
    await screen.findByText(/hẹn gặp bạn/i);

    const firstBody = JSON.parse(
      String(fetchMock.mock.calls[2]?.[1]?.body),
    ) as { clientSubmissionId: string; verificationToken: string };
    const expiredRetryBody = JSON.parse(
      String(fetchMock.mock.calls[3]?.[1]?.body),
    ) as { clientSubmissionId: string; verificationToken: string };
    const renewedRetryBody = JSON.parse(
      String(fetchMock.mock.calls[5]?.[1]?.body),
    ) as { clientSubmissionId: string; verificationToken: string };
    expect(expiredRetryBody.clientSubmissionId).toBe(
      firstBody.clientSubmissionId,
    );
    expect(renewedRetryBody.clientSubmissionId).toBe(
      firstBody.clientSubmissionId,
    );
    expect(renewedRetryBody.verificationToken).toBe("renewed-token");
    expect(randomUuid).toHaveBeenCalledTimes(1);
  });

  it("resumes a pending technical retry after using Back and re-verifying", async () => {
    mockGuestLoad();
    const user = userEvent.setup();

    render(<RsvpExperience />);
    await verifyFirstGuest(user);
    await user.click(screen.getByRole("radio", { name: /^tham dự$/i }));
    await user.type(screen.getByLabelText(/lời nhắn/i), "Giữ nguyên lời nhắn");
    fetchMock.mockRejectedValueOnce(new TypeError("Response lost"));
    await user.click(screen.getByRole("button", { name: /gửi phản hồi/i }));
    await screen.findByRole("button", { name: /thử gửi lại/i });

    await user.click(screen.getByRole("button", { name: /quay lại/i }));
    fetchMock.mockImplementationOnce(() =>
      jsonResponse({ verificationToken: "renewed-token", guest: GUESTS[0] }),
    );
    fetchMock.mockImplementationOnce(() =>
      jsonResponse({ submission: SUBMISSION, deduplicated: true }),
    );
    await user.click(screen.getByRole("button", { name: /xác minh/i }));

    await screen.findByText(/hẹn gặp bạn/i);
    const originalBody = JSON.parse(
      String(fetchMock.mock.calls[2]?.[1]?.body),
    ) as {
      attending: boolean;
      message: string;
      clientSubmissionId: string;
    };
    const resumedBody = JSON.parse(
      String(fetchMock.mock.calls[4]?.[1]?.body),
    ) as {
      attending: boolean;
      message: string;
      clientSubmissionId: string;
    };
    expect(resumedBody).toMatchObject({
      attending: originalBody.attending,
      message: originalBody.message,
      clientSubmissionId: originalBody.clientSubmissionId,
    });
    expect(randomUuid).toHaveBeenCalledTimes(1);
  });
});
