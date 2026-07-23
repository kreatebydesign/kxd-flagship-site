"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { createPortal } from "react-dom";

const FEEDBACK_OPTIONS = [
  { value: "something-broken", label: "Something broken" },
  { value: "something-confusing", label: "Something confusing" },
  { value: "feature-suggestion", label: "Feature suggestion" },
  { value: "general", label: "General feedback" },
] as const;

type SubmitState = "idle" | "saving" | "saved" | "failed";

export function PortalFeedbackControl() {
  const pathname = usePathname();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [feedbackType, setFeedbackType] =
    useState<(typeof FEEDBACK_OPTIONS)[number]["value"]>("general");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<SubmitState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setStatus((prev) => (prev === "saved" ? "idle" : prev));
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusable = dialogRef.current?.querySelector<HTMLElement>(
      "select, textarea, button:not([disabled])",
    );
    focusable?.focus();
    return () => {
      previouslyFocused?.focus?.();
    };
  }, [open]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (status === "saving") return;

    setStatus("saving");
    setErrorMessage(null);

    try {
      const res = await fetch("/api/portal/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedbackType,
          message,
          pagePath: pathname,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        code?: string;
      };
      if (!res.ok || !data.ok) {
        setStatus("failed");
        if (res.status === 401 || data.code === "session_expired") {
          setErrorMessage(
            data.message ??
              "Your session expired. Sign in again to continue — your message is still here.",
          );
        } else {
          setErrorMessage(
            data.message ??
              "We couldn't send your feedback just now. Please try again.",
          );
        }
        return;
      }
      setStatus("saved");
      setMessage("");
    } catch {
      setStatus("failed");
      setErrorMessage("We couldn't send your feedback just now. Please try again.");
    }
  }

  function onDialogKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab" || !dialogRef.current) return;
    const nodes = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(
        "select, textarea, button:not([disabled])",
      ),
    );
    if (nodes.length === 0) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="kxd-ces-feedback-trigger"
        onClick={() => {
          setOpen(true);
          setStatus("idle");
          setErrorMessage(null);
        }}
      >
        Send feedback
      </button>

      {open
        ? createPortal(
            <div
              className="kxd-ces-feedback-backdrop"
              role="presentation"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) close();
              }}
            >
              <div
                ref={dialogRef}
                className="kxd-ces-feedback-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                onKeyDown={onDialogKeyDown}
              >
                <div className="kxd-ces-feedback-dialog__head">
                  <h2 id={titleId}>Send feedback</h2>
                  <button
                    type="button"
                    className="kxd-ces-feedback-dialog__close"
                    onClick={close}
                    aria-label="Close feedback"
                  >
                    Close
                  </button>
                </div>

                {status === "saved" ? (
                  <div className="kxd-ces-feedback-dialog__success">
                    <p>Thank you — your feedback was sent to our team.</p>
                    <p className="kxd-ces-feedback-dialog__hint">
                      We read every note during early access. This does not
                      promise a feature or timeline.
                    </p>
                    <button
                      type="button"
                      className="kxd-ces-btn kxd-ces-btn--primary"
                      onClick={close}
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <form className="kxd-ces-feedback-dialog__form" onSubmit={onSubmit}>
                    <label className="kxd-ces-feedback-dialog__label">
                      <span>What kind of feedback is this?</span>
                      <select
                        value={feedbackType}
                        onChange={(event) =>
                          setFeedbackType(
                            event.target.value as (typeof FEEDBACK_OPTIONS)[number]["value"],
                          )
                        }
                        disabled={status === "saving"}
                      >
                        {FEEDBACK_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="kxd-ces-feedback-dialog__label">
                      <span>Your message</span>
                      <textarea
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        rows={5}
                        maxLength={2000}
                        required
                        disabled={status === "saving"}
                        placeholder="Tell us what happened, what felt unclear, or what would help."
                      />
                    </label>

                    <p className="kxd-ces-feedback-dialog__hint">
                      Do not include passwords, payment details, or sensitive
                      personal data.
                    </p>

                    {errorMessage ? (
                      <p className="kxd-ces-feedback-dialog__error" role="alert">
                        {errorMessage}
                        {status === "failed" &&
                        /session expired/i.test(errorMessage) ? (
                          <>
                            {" "}
                            <Link href="/portal/login">Sign in again</Link>
                          </>
                        ) : null}
                      </p>
                    ) : null}

                    <div className="kxd-ces-feedback-dialog__actions">
                      <button
                        type="button"
                        className="kxd-ces-btn kxd-ces-btn--ghost"
                        onClick={close}
                        disabled={status === "saving"}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="kxd-ces-btn kxd-ces-btn--primary"
                        disabled={status === "saving" || !message.trim()}
                      >
                        {status === "saving" ? "Sending…" : "Send feedback"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
