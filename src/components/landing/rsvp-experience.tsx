"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { EVENT } from "@/data/event";
import type { PublicGuest } from "@/lib/guests-public";
import { FormError } from "@/components/ui/form-error";

type ExperienceStep =
  | "selecting"
  | "verifying"
  | "responding"
  | "submitting"
  | "success"
  | "failure";

type FailureContext = "guests" | "verification" | "submission";

type ApiError = {
  error?: {
    code?: string;
    message?: string;
    field?: string;
  };
};

type VerifyResponse = {
  verificationToken: string;
  guest: PublicGuest;
};

type SubmitResponse = {
  submission: {
    attending: boolean;
  };
  deduplicated: boolean;
};

const MESSAGE_LIMIT = 1000;

async function readError(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as ApiError;
    return body.error?.message || fallback;
  } catch {
    return fallback;
  }
}

async function requestGuests() {
  const response = await fetch("/api/guests");

  if (!response.ok) {
    throw new Error(await readError(response, "Không thể tải danh sách khách mời."));
  }

  const body = (await response.json()) as { guests: readonly PublicGuest[] };
  return body.guests;
}

export function RsvpExperience() {
  const [step, setStep] = useState<ExperienceStep>("selecting");
  const [guests, setGuests] = useState<readonly PublicGuest[]>([]);
  const [isLoadingGuests, setIsLoadingGuests] = useState(true);
  const [selectedGuestId, setSelectedGuestId] = useState("");
  const [typedName, setTypedName] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [attending, setAttending] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  const [submittedAttending, setSubmittedAttending] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [failureContext, setFailureContext] =
    useState<FailureContext>("guests");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Đang tải danh sách khách mời…");

  const nameInputRef = useRef<HTMLInputElement>(null);
  const attendingInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  const selectedGuest = useMemo(
    () => guests.find((guest) => guest.id === selectedGuestId),
    [guests, selectedGuestId],
  );

  async function loadGuests() {
    setIsLoadingGuests(true);
    setError("");
    setStatus("Đang tải danh sách khách mời…");

    try {
      setGuests(await requestGuests());
      setStep("selecting");
      setStatus("Danh sách khách mời đã sẵn sàng.");
    } catch {
      setFailureContext("guests");
      setStep("failure");
      setError("Không thể kết nối để tải danh sách khách mời. Vui lòng thử lại.");
      setStatus("Tải danh sách khách mời không thành công.");
    } finally {
      setIsLoadingGuests(false);
    }
  }

  useEffect(() => {
    let active = true;

    void requestGuests()
      .then((loadedGuests) => {
        if (!active) {
          return;
        }

        setGuests(loadedGuests);
        setStep("selecting");
        setStatus("Danh sách khách mời đã sẵn sàng.");
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setFailureContext("guests");
        setStep("failure");
        setError("Không thể kết nối để tải danh sách khách mời. Vui lòng thử lại.");
        setStatus("Tải danh sách khách mời không thành công.");
      })
      .finally(() => {
        if (active) {
          setIsLoadingGuests(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  function continueToVerification() {
    if (!selectedGuest) {
      return;
    }

    setError("");
    setStep("verifying");
    setStatus(`Đã chọn ${selectedGuest.maskedName}. Hãy xác minh họ tên.`);
    window.requestAnimationFrame(() => nameInputRef.current?.focus());
  }

  async function verifyGuest(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    if (!selectedGuest || !typedName.trim()) {
      setError("Vui lòng nhập họ và tên đầy đủ.");
      nameInputRef.current?.focus();
      return;
    }

    setError("");
    setStatus("Đang xác minh thông tin khách mời…");

    try {
      const response = await fetch("/api/rsvp/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ guestId: selectedGuest.id, name: typedName }),
      });

      if (!response.ok) {
        const apiError = await readError(
          response,
          "Thông tin chưa khớp với ảnh đã chọn.",
        );
        setError(
          response.status === 400
            ? "Thông tin chưa khớp với ảnh đã chọn."
            : apiError,
        );
        setStatus("Xác minh chưa thành công.");
        nameInputRef.current?.focus();
        return;
      }

      const body = (await response.json()) as VerifyResponse;
      setVerificationToken(body.verificationToken);
      setStep("responding");
      setStatus("Xác minh thành công. Bạn có thể gửi phản hồi.");
    } catch {
      setFailureContext("verification");
      setStep("failure");
      setError("Không thể kết nối để xác minh. Tên bạn nhập vẫn được giữ lại.");
      setStatus("Mất kết nối trong lúc xác minh.");
    }
  }

  async function sendSubmission(clientSubmissionId: string) {
    if (attending === null) {
      return;
    }

    setStep("submitting");
    setError("");
    setStatus("Đang gửi phản hồi của bạn…");

    try {
      const response = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          verificationToken,
          attending,
          message: message.trim() || null,
          clientSubmissionId,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          setVerificationToken("");
          setSubmissionId(null);
          setStep("verifying");
          setError("Phiên xác minh đã hết hạn. Vui lòng xác minh lại họ tên.");
          setStatus("Phiên xác minh đã hết hạn.");
          window.requestAnimationFrame(() => nameInputRef.current?.focus());
          return;
        }

        throw new Error(await readError(response, "Không thể lưu phản hồi."));
      }

      const body = (await response.json()) as SubmitResponse;
      setSubmittedAttending(body.submission.attending);
      setSubmissionId(null);
      setStep("success");
      setStatus("Phản hồi đã được ghi nhận. Cảm ơn bạn!");
    } catch {
      setFailureContext("submission");
      setStep("failure");
      setError(
        "Chưa nhận được xác nhận từ hệ thống. Hãy thử gửi lại để tránh tạo phản hồi trùng.",
      );
      setStatus("Gửi phản hồi chưa thành công.");
    }
  }

  async function submitRsvp(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    if (attending === null) {
      setError("Vui lòng chọn tham dự hoặc không tham dự.");
      attendingInputRef.current?.focus();
      return;
    }

    if ([...message].length > MESSAGE_LIMIT) {
      setError("Lời nhắn tối đa 1.000 ký tự.");
      messageInputRef.current?.focus();
      return;
    }

    const clientSubmissionId = crypto.randomUUID();
    setSubmissionId(clientSubmissionId);
    await sendSubmission(clientSubmissionId);
  }

  function beginChangedSubmission() {
    setError("");
    setSubmissionId(null);

    if (step === "failure" && failureContext === "submission") {
      setStep("responding");
      setStatus("Phản hồi đã thay đổi. Lần gửi tiếp theo là một phản hồi mới.");
    }
  }

  function chooseAnotherGuest() {
    setSelectedGuestId("");
    setTypedName("");
    setVerificationToken("");
    setAttending(null);
    setMessage("");
    setSubmissionId(null);
    setError("");
    setStep("selecting");
    setStatus("Hãy chọn ảnh của bạn.");
  }

  function renderSelecting() {
    if (isLoadingGuests) {
      return (
        <div className="rsvp-loading" aria-hidden="true">
          {Array.from({ length: 10 }, (_, index) => (
            <span key={index} />
          ))}
        </div>
      );
    }

    if (step === "failure" && failureContext === "guests") {
      return (
        <div className="rsvp-panel rsvp-panel-centered">
          <span className="rsvp-kicker">Danh sách khách mời</span>
          <h3 className="font-display">Chưa thể mở album.</h3>
          <FormError>{error}</FormError>
          <button className="button-primary" type="button" onClick={loadGuests}>
            Thử tải lại
          </button>
        </div>
      );
    }

    return (
      <form
        className="rsvp-selection"
        onSubmit={(event) => {
          event.preventDefault();
          continueToVerification();
        }}
      >
        <fieldset>
          <legend className="sr-only">Chọn ảnh của bạn trong danh sách khách mời</legend>
          <div className="guest-grid">
            {guests.map((guest, index) => (
              <label className="guest-card" key={guest.id}>
                <input
                  checked={selectedGuestId === guest.id}
                  name="guest"
                  onChange={() => {
                    setSelectedGuestId(guest.id);
                    setError("");
                  }}
                  type="radio"
                  value={guest.id}
                />
                <Image
                  alt={`Ảnh khách mời ${guest.maskedName}`}
                  className="guest-card-image"
                  height={500}
                  priority={index < 5}
                  src={guest.imagePath}
                  style={{ objectPosition: guest.imagePosition || "50% 50%" }}
                  width={400}
                />
                <span className="guest-card-shade" />
                <span className="guest-card-index">{String(index + 1).padStart(2, "0")}</span>
                <span className="guest-card-name">{guest.maskedName}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="rsvp-selection-action">
          <p>Chỉ tên đã che được hiển thị công khai.</p>
          <button
            className="button-primary"
            disabled={!selectedGuestId}
            type="submit"
          >
            Tiếp tục <span aria-hidden="true">→</span>
          </button>
        </div>
      </form>
    );
  }

  function renderVerification() {
    if (!selectedGuest) {
      return renderSelecting();
    }

    const failed = step === "failure" && failureContext === "verification";

    return (
      <div className="rsvp-panel rsvp-verification">
        <div className="selected-guest">
          <Image
            alt={`Ảnh khách mời ${selectedGuest.maskedName}`}
            height={500}
            src={selectedGuest.imagePath}
            style={{ objectPosition: selectedGuest.imagePosition || "50% 50%" }}
            width={400}
          />
          <div>
            <span>Khách mời đã chọn</span>
            <strong>{selectedGuest.maskedName}</strong>
          </div>
        </div>
        <form className="rsvp-form" onSubmit={verifyGuest}>
          <div>
            <span className="rsvp-kicker">Bước 02 · Xác minh</span>
            <h3 className="font-display">Đúng người, đúng cuộc hẹn.</h3>
            <p>
              Nhập họ tên đầy đủ có dấu để chúng mình xác nhận riêng với danh sách nội bộ.
            </p>
          </div>
          <label className="field-label" htmlFor="guest-name">
            Họ và tên đầy đủ
          </label>
          <input
            aria-describedby={error ? "verification-error" : undefined}
            autoComplete="name"
            id="guest-name"
            onChange={(event) => {
              setTypedName(event.target.value);
              setError("");
            }}
            placeholder="Ví dụ: Nguyễn Văn An"
            ref={nameInputRef}
            type="text"
            value={typedName}
          />
          {error ? <FormError id="verification-error">{error}</FormError> : null}
          <div className="form-actions">
            <button className="button-ghost" type="button" onClick={chooseAnotherGuest}>
              Chọn lại ảnh
            </button>
            {failed ? (
              <button className="button-primary" type="button" onClick={() => void verifyGuest()}>
                Thử xác minh lại
              </button>
            ) : (
              <button className="button-primary" type="submit">
                Xác minh <span aria-hidden="true">→</span>
              </button>
            )}
          </div>
        </form>
      </div>
    );
  }

  function renderResponse() {
    const isSubmitting = step === "submitting";
    const failed = step === "failure" && failureContext === "submission";
    const messageLength = [...message].length;

    return (
      <form className="rsvp-panel rsvp-response rsvp-form" onSubmit={submitRsvp}>
        <div>
          <span className="rsvp-kicker">Bước 03 · Phản hồi</span>
          <h3 className="font-display">Bạn sẽ tham dự chứ?</h3>
          <p>
            Một lựa chọn ngắn thôi — còn những câu chuyện dài, mình để dành cho buổi tiệc.
          </p>
        </div>
        <fieldset className="attendance-options">
          <legend>Bạn có tham dự không?</legend>
          <label>
            <input
              aria-label="Tham dự"
              checked={attending === true}
              disabled={isSubmitting}
              name="attending"
              onChange={() => {
                setAttending(true);
                beginChangedSubmission();
              }}
              ref={attendingInputRef}
              type="radio"
            />
            <span>
              <strong>Tham dự</strong>
              <small>Có mặt và chung vui</small>
            </span>
          </label>
          <label>
            <input
              aria-label="Không tham dự"
              checked={attending === false}
              disabled={isSubmitting}
              name="attending"
              onChange={() => {
                setAttending(false);
                beginChangedSubmission();
              }}
              type="radio"
            />
            <span>
              <strong>Không tham dự</strong>
              <small>Hẹn nhau một dịp gần nhất</small>
            </span>
          </label>
        </fieldset>
        <div className="message-field">
          <label className="field-label" htmlFor="rsvp-message">
            Lời nhắn cho EcoBadminton <span>Không bắt buộc</span>
          </label>
          <textarea
            aria-describedby={error ? "rsvp-error message-count" : "message-count"}
            disabled={isSubmitting}
            id="rsvp-message"
            onChange={(event) => {
              setMessage(event.target.value);
              beginChangedSubmission();
            }}
            placeholder="Một kỷ niệm, một lời chúc, hay chỉ một chiếc emoji…"
            ref={messageInputRef}
            rows={5}
            value={message}
          />
          <span className={messageLength > MESSAGE_LIMIT ? "count-over" : ""} id="message-count">
            {messageLength.toLocaleString("vi-VN")} / 1.000
          </span>
        </div>
        {error ? <FormError id="rsvp-error">{error}</FormError> : null}
        <div className="form-actions">
          <button className="button-ghost" disabled={isSubmitting} type="button" onClick={() => setStep("verifying")}>
            Quay lại
          </button>
          {failed ? (
            <button
              className="button-primary"
              type="button"
              onClick={() => submissionId && void sendSubmission(submissionId)}
            >
              Thử gửi lại
            </button>
          ) : (
            <button className="button-primary" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Đang gửi…" : "Gửi phản hồi"}
            </button>
          )}
        </div>
      </form>
    );
  }

  function renderSuccess() {
    return (
      <div className="rsvp-panel rsvp-success">
        <span className="success-mark" aria-hidden="true">✓</span>
        <span className="rsvp-kicker">Đã ghi nhận</span>
        <h3 className="font-display">Cảm ơn bạn.</h3>
        {submittedAttending ? (
          <>
            <p>
              Hẹn gặp bạn vào {EVENT.time} ngày {EVENT.date} tại {EVENT.venue}.
            </p>
            <a className="button-primary" href={EVENT.mapUrl} rel="noreferrer" target="_blank">
              Mở Google Maps <span aria-hidden="true">↗</span>
            </a>
          </>
        ) : (
          <p>
            Cảm ơn bạn đã cho EcoBadminton biết. Tiếc một chút, nhưng lời chúc của bạn vẫn ở lại với đội.
          </p>
        )}
        <p className="success-note">
          Nếu kế hoạch thay đổi, bạn có thể gửi lại. Mỗi phản hồi mới sẽ được lưu vào lịch sử.
        </p>
        <button
          className="button-ghost"
          type="button"
          onClick={() => {
            setSubmissionId(null);
            setError("");
            setStep("responding");
            setStatus("Bạn có thể gửi một phản hồi mới.");
          }}
        >
          Gửi phản hồi mới
        </button>
      </div>
    );
  }

  const visibleStep =
    step === "failure"
      ? failureContext === "verification"
        ? "verifying"
        : failureContext === "submission"
          ? "responding"
          : "selecting"
      : step;

  return (
    <section className="rsvp-section" id="rsvp" aria-labelledby="rsvp-title">
      <div className="section-shell">
        <div className="section-heading reveal">
          <div>
            <span className="eyebrow">RSVP · 20 khách mời</span>
            <h2 className="font-display" id="rsvp-title">Tìm mình trong đội hình.</h2>
          </div>
          <p>
            Chọn ảnh của bạn, xác minh họ tên và để lại phản hồi trước buổi hẹn.
          </p>
        </div>
        <p className="sr-only" aria-live="polite">{status}</p>
        <div className="reveal reveal-delay">
          {visibleStep === "selecting" ? renderSelecting() : null}
          {visibleStep === "verifying" ? renderVerification() : null}
          {visibleStep === "responding" || visibleStep === "submitting"
            ? renderResponse()
            : null}
          {visibleStep === "success" ? renderSuccess() : null}
        </div>
      </div>
    </section>
  );
}
