"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import type { ReviewWorkEngineLink } from "@/lib/website-review-inbox/types";

export interface ReviewCompleteConfirmDialogProps {
  open: boolean;
  reviewTitle: string;
  linkedWork: ReviewWorkEngineLink | null;
  linkedWorkLoading?: boolean;
  completeLinkedWork: boolean;
  onCompleteLinkedWorkChange: (next: boolean) => void;
  submitting: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ReviewCompleteConfirmDialog({
  open,
  reviewTitle,
  linkedWork,
  linkedWorkLoading = false,
  completeLinkedWork,
  onCompleteLinkedWorkChange,
  submitting,
  error,
  onCancel,
  onConfirm,
}: ReviewCompleteConfirmDialogProps) {
  const titleId = useId();
  const descId = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);
  const eligible = linkedWork?.completionEligible === true;
  const confirmDisabled = submitting || linkedWorkLoading;

  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !submitting) {
        event.preventDefault();
        onCancel();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel, submitting]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="kxd-os-review-inbox-bulk__backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onCancel();
      }}
    >
      <div
        className="kxd-os-review-inbox-bulk__dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
      >
        <h2 id={titleId} className="kxd-os-review-inbox-bulk__dialog-title">
          Complete this Website Review?
        </h2>

        <div id={descId} className="kxd-os-review-inbox-bulk__dialog-body">
          <p>
            This closes the client revision request
            {reviewTitle ? (
              <>
                {" "}
                <strong>{reviewTitle}</strong>
              </>
            ) : null}
            .
          </p>

          {linkedWorkLoading ? (
            <p className="kxd-os-review-complete__note" role="status">
              Looking up linked Work…
            </p>
          ) : linkedWork ? (
            <>
              <p>
                Its linked internal Work item{" "}
                <strong>{linkedWork.workNumber}</strong> is currently{" "}
                <strong>{linkedWork.statusLabel ?? linkedWork.status ?? "open"}</strong>.
                Review and Work statuses are separate lifecycles.
              </p>
              {eligible ? (
                <label className="kxd-os-review-complete__option">
                  <input
                    type="checkbox"
                    className="kxd-os-review-inbox-bulk__checkbox"
                    checked={completeLinkedWork}
                    disabled={submitting}
                    onChange={(event) =>
                      onCompleteLinkedWorkChange(event.target.checked)
                    }
                  />
                  <span>Also complete the linked Work item</span>
                </label>
              ) : (
                <p className="kxd-os-review-complete__note">
                  Linked Work will not be changed
                  {linkedWork.statusLabel
                    ? ` (currently ${linkedWork.statusLabel})`
                    : ""}
                  .
                </p>
              )}
            </>
          ) : (
            <p className="kxd-os-review-complete__note">
              No linked Work item will be changed.
            </p>
          )}

          {error ? (
            <p
              className="kxd-os-review-inbox__notice kxd-os-review-inbox__notice--error"
              role="alert"
            >
              {error}
            </p>
          ) : null}
        </div>

        <div className="kxd-os-review-inbox-bulk__dialog-actions">
          <button
            type="button"
            className="kxd-os-btn kxd-os-btn--secondary"
            disabled={submitting}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            className="kxd-os-btn kxd-os-btn--primary"
            disabled={confirmDisabled}
            aria-busy={submitting}
            onClick={onConfirm}
          >
            {submitting ? "Completing…" : "Confirm completion"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
