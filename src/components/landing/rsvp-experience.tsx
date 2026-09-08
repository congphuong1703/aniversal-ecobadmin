"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { EVENT } from "@/data/event";
import type { PublicGuest } from "@/lib/guests-public";
import { FormError } from "@/components/ui/form-error";
import { Modal } from "@/components/ui/modal";

type ExperienceStep =
  | "selecting"
  | "responding"
  | "submitting"
  | "success"
  | "failure";

type FailureContext = "guests" | "submission";

type ApiError = {
  error?: {
    code?: string;
    message?: string;
    field?: string;
  };
};

type SubmitResponse = {
  submission: {
    attending: boolean;
  };
  deduplicated: boolean;
};

const MESSAGE_LIMIT = 1000;
const DECLINE_HOVER_LIMIT = 5;
const DECLINE_OFFSETS = [
  { x: -104, y: -84 },
  { x: 112, y: -84 },
  { x: -144, y: 0 },
  { x: 144, y: 0 },
  { x: 0, y: -108 },
  { x: -112, y: 54 },
  { x: 112, y: 54 },
  { x: -84, y: -42 },
  { x: 84, y: -42 },
  { x: 0, y: 78 },
] as const;

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
    throw new Error(
      await readError(response, "Không thể tải danh sách khách mời."),
    );
  }

  const body = (await response.json()) as { guests: readonly PublicGuest[] };
  return body.guests;
}

export function RsvpExperience() {
  const [step, setStep] = useState<ExperienceStep>("selecting");
  const [guests, setGuests] = useState<readonly PublicGuest[]>([]);
  const [isLoadingGuests, setIsLoadingGuests] = useState(true);
  const [selectedGuestId, setSelectedGuestId] = useState("");
  const [message, setMessage] = useState("");
  const [submittedAttending, setSubmittedAttending] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [declineHoverCount, setDeclineHoverCount] = useState(0);
  const [failureContext, setFailureContext] =
    useState<FailureContext>("guests");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Đang tải danh sách khách mời…");

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
      setError(
        "Không thể kết nối để tải danh sách khách mời. Vui lòng thử lại.",
      );
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
        setError(
          "Không thể kết nối để tải danh sách khách mời. Vui lòng thử lại.",
        );
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

  function selectGuest(guest: PublicGuest) {
    setSelectedGuestId(guest.id);
    setError("");
    setMessage("");
    setDeclineHoverCount(0);
    setStep("responding");
    setStatus(`Đã chọn ${guest.fullName}. Bạn có thể xác nhận tham gia.`);
  }

  function handleSelectGuestClick(event: React.MouseEvent<HTMLButtonElement>) {
    const guest = guests.find(
      (candidate) => candidate.id === event.currentTarget.dataset.guestId,
    );
    if (guest) {
      selectGuest(guest);
    }
  }

  async function sendSubmission(
    clientSubmissionId: string,
    attendingValue: boolean,
  ) {
    if (!selectedGuestId) {
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
          guestId: selectedGuestId,
          attending: attendingValue,
          message: message.trim() || null,
          clientSubmissionId,
        }),
      });

      if (!response.ok) {
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

  async function submitRsvp(
    event: FormEvent<HTMLFormElement> | undefined,
    attendingValue: boolean,
  ) {
    event?.preventDefault();

    if ([...message].length > MESSAGE_LIMIT) {
      setError("Lời nhắn tối đa 1.000 ký tự.");
      messageInputRef.current?.focus();
      return;
    }

    const clientSubmissionId = crypto.randomUUID();
    setSubmissionId(clientSubmissionId);
    await sendSubmission(clientSubmissionId, attendingValue);
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
    setMessage("");
    setSubmissionId(null);
    setDeclineHoverCount(0);
    setError("");
    setStep("selecting");
    setStatus("Hãy chọn tên của bạn.");
  }

  function renderSelecting() {
    if (isLoadingGuests) {
      return (
        <div className="rsvp-loading" aria-hidden="true">
          {Array.from({ length: 8 }, (_, index) => (
            <span key={index} />
          ))}
        </div>
      );
    }

    if (step === "failure" && failureContext === "guests") {
      return (
        <div className="rsvp-panel rsvp-panel-centered">
          <span className="rsvp-kicker">Danh sách khách mời</span>
          <h3 className="font-display">Chưa thể mở danh sách.</h3>
          <FormError>{error}</FormError>
          <button className="button-primary" type="button" onClick={loadGuests}>
            Thử tải lại
          </button>
        </div>
      );
    }

    return (
      <div className="rsvp-selection">
        <p className="rsvp-selection-hint">
          Chọn tên của bạn và xem thư mời.
        </p>
        <ul className="guest-name-list" aria-label="Danh sách khách mời">
          {guests.map((guest, index) => (
            <li key={guest.id}>
              <button
                className="guest-name-item"
                data-guest-id={guest.id}
                onClick={handleSelectGuestClick}
                type="button"
              >
                <span className="guest-name-avatar">
                  <Image
                    alt=""
                    fill
                    sizes="44px"
                    src={guest.imagePath}
                    style={{ objectPosition: guest.imagePosition || "50% 50%" }}
                  />
                </span>
                <span className="guest-name-main">
                  <span className="guest-name-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                <span className="guest-name-text">{guest.fullName}</span>
                </span>
                <span aria-hidden="true" className="guest-name-arrow">
                  →
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  function renderResponse() {
    const isSubmitting = step === "submitting";
    const failed = step === "failure" && failureContext === "submission";
    const messageLength = [...message].length;
    const declineUnlocked = declineHoverCount >= DECLINE_HOVER_LIMIT;
    const declineIsMoving = declineHoverCount > 0 && !declineUnlocked;
    const declineOffset = DECLINE_OFFSETS[
      Math.min(declineHoverCount - 1, DECLINE_HOVER_LIMIT - 1)
    ];

    if (!selectedGuest) {
      return renderSelecting();
    }

    return (
      <form
        className="rsvp-panel rsvp-verification rsvp-direct-confirmation"
        onSubmit={(event) => void submitRsvp(event, true)}
      >
        <div className="selected-guest">
          <Image
            alt={`Ảnh khách mời ${selectedGuest.fullName}`}
            height={500}
            src={selectedGuest.imagePath}
            style={{ objectPosition: selectedGuest.imagePosition || "50% 50%" }}
            width={400}
          />
          <div>
            <span>Khách mời đã chọn</span>
            <strong>{selectedGuest.fullName}</strong>
          </div>
        </div>
        <div className="rsvp-form">
          <div>
            <h3 className="font-display">Đúng người, đúng cuộc hẹn.</h3>
            <p>
              Một lựa chọn ngắn thôi — còn những câu chuyện dài, mình để dành
              cho buổi tiệc.
            </p>
          </div>
          <div className="message-field">
            <label className="field-label" htmlFor="rsvp-message">
              Lời nhắn cho EcoBadminton
            </label>
            <textarea
              aria-describedby={
                error ? "rsvp-error message-count" : "message-count"
              }
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
            <span
              className={messageLength > MESSAGE_LIMIT ? "count-over" : ""}
              id="message-count"
            >
              {messageLength.toLocaleString("vi-VN")} / 1.000
            </span>
          </div>
          {error ? <FormError id="rsvp-error">{error}</FormError> : null}
          <div className="form-actions rsvp-confirm-actions">
            <button
              aria-disabled={!declineUnlocked}
              className="button-primary rsvp-decline-button"
              disabled={isSubmitting}
              style={
                declineIsMoving
                  ? {
                      transform: `translate(${declineOffset.x}px, ${declineOffset.y}px)`,
                    }
                  : undefined
              }
              type="button"
              onClick={() => {
                if (!declineUnlocked) {
                  setError("Hãy di chuột thêm một chút trước khi hẹn dịp khác.");
                  return;
                }

                void submitRsvp(undefined, false);
              }}
              onMouseEnter={() => {
                setDeclineHoverCount((count) =>
                  Math.min(count + 1, DECLINE_HOVER_LIMIT),
                );
              }}
            >
              Hẹn dịp khác
            </button>
            {failed ? (
              <button
                className="button-primary"
                disabled={isSubmitting}
                type="button"
                onClick={() =>
                  submissionId
                    ? void sendSubmission(submissionId, true)
                    : void submitRsvp(undefined, true)
                }
              >
                Thử gửi lại
              </button>
            ) : (
              <button
                className="button-primary"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? (
                  <>
                    <span aria-hidden="true" className="button-spinner" />
                    Đang gửi…
                  </>
                ) : (
                  "Tham gia"
                )}
              </button>
            )}
          </div>
        </div>
      </form>
    );
  }

  function renderSuccess() {
    const resetResponse = () => {
      setSubmissionId(null);
      setError("");
      setStep("responding");
      setStatus("Bạn có thể gửi một phản hồi mới.");
    };
    const hasSubmittedMessage = message.trim().length > 0;

    return (
      <div className="rsvp-panel rsvp-success">
        <span className="success-mark" aria-hidden="true">
          ✓
        </span>
        <span className="rsvp-kicker">Đã ghi nhận</span>
        <h3 className="font-display">Cảm ơn bạn.</h3>
        {submittedAttending ? (
          <>
            <p>
              Hẹn gặp bạn vào {EVENT.time} ngày {EVENT.date} tại {EVENT.venue}.
            </p>
            <div className="rsvp-success-actions">
              <button className="button-ghost" type="button" onClick={resetResponse}>
                Gửi phản hồi mới
              </button>
              <a
                className="button-primary"
                href={EVENT.mapUrl}
                rel="noreferrer"
                target="_blank"
              >
                Mở Google Maps <span aria-hidden="true">↗</span>
              </a>
            </div>
          </>
        ) : (
          <p>
            {hasSubmittedMessage
              ? "Cảm ơn bạn đã cho EcoBadminton biết. Tiếc một chút, nhưng chúng mình vẫn rất trân quý lời chúc của bạn!"
              : "Cảm ơn bạn đã cho EcoBadminton biết. Thật tiếc quá, hẹn bạn vào dịp gần nhất nhaaa!"}
          </p>
        )}
        {!submittedAttending ? (
          <button className="button-ghost" type="button" onClick={resetResponse}>
            Gửi phản hồi mới
          </button>
        ) : null}
      </div>
    );
  }

  const visibleStep =
    step === "failure"
      ? failureContext === "submission"
        ? "responding"
        : "selecting"
      : step;

  return (
    <section className="rsvp-section" id="rsvp" aria-labelledby="rsvp-title">
      <div className="section-shell">
        <div className="section-heading reveal">
          <div>
            <span className="eyebrow">Bữa tiệc sẽ thật trọn vẹn khi có bạn</span>
            <h2 className="font-display" id="rsvp-title">
              Tham gia ngay thôi!
            </h2>
          </div>
        </div>
        <p className="sr-only" aria-live="polite">
          {status}
        </p>
        <div className="reveal reveal-delay">
          {visibleStep === "selecting" ? renderSelecting() : null}
        </div>
      </div>
      {visibleStep !== "selecting" ? (
        <Modal
          busy={step === "submitting"}
          label={
            selectedGuest
              ? `Xác nhận tham gia · ${selectedGuest.fullName}`
              : "Xác nhận tham gia"
          }
          onClose={chooseAnotherGuest}
        >
          {visibleStep === "responding" || visibleStep === "submitting"
            ? renderResponse()
            : null}
          {visibleStep === "success" ? renderSuccess() : null}
        </Modal>
      ) : null}
    </section>
  );
}
