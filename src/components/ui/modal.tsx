"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

type ModalProps = {
  busy?: boolean;
  label: string;
  onClose: () => void;
  children: React.ReactNode;
};

export function Modal({ busy = false, label, onClose, children }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(busy);
  const onCloseRef = useRef(onClose);

  useLayoutEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busyRef.current) {
        onCloseRef.current();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, []);

  return (
    // Backdrop click is a mouse-only convenience; Escape and the close button already cover keyboard access.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events
    <div className="modal-overlay" onClick={busy ? undefined : onClose}>
      {/* Stops the overlay's close-on-click from firing when the click originates inside the panel. */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
      <div
        aria-label={label}
        aria-busy={busy || undefined}
        aria-modal="true"
        className="modal-panel"
        onClick={(event) => event.stopPropagation()}
        ref={panelRef}
        role="dialog"
        tabIndex={-1}
      >
        <button
          aria-label="Đóng"
          className="modal-close"
          disabled={busy}
          onClick={onClose}
          type="button"
        >
          <span aria-hidden="true">×</span>
        </button>
        {children}
      </div>
    </div>
  );
}
