"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import type { LinkedWorkCounts } from "@/lib/website-review-inbox/linked-work-types";
import { formatLinkedWorkPreviewLine } from "@/lib/website-review-inbox/linked-work-types";

export interface ReviewReconcileLinkedWorkDialogProps {
  open: boolean;
  selectedCount: number;
  preview: LinkedWorkCounts | null;
  previewLoading: boolean;
  submitting: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ReviewReconcileLinkedWorkDialog({
  open,
  selectedCount,
  preview,
  previewLoading,
  submitting,
  error,
  onCancel,
  onConfirm,
}: ReviewReconcileLinkedWorkDialogProps) {
  const titleId = useId();
  const descId = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);
  const eligible = preview?.eligible ?? 0;

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
          Complete linked Work for completed Reviews?
        </h2>

        <div id={descId} className="kxd-os-review-inbox-bulk__dialog-body">
          <p>
            {selectedCount === 1
              ? "1 selected completed review will be inspected."
              : `${selectedCount} selected completed reviews will be inspected.`}{" "}
            Review statuses will not change.
          </p>

          {previewLoading ? (
            <p className="kxd-os-review-complete__note">Preparing dry-run preview…</p>
          ) : preview ? (
            <p>{formatLinkedWorkPreviewLine(preview)}</p>
          ) : null}

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
            disabled={submitting || previewLoading || eligible === 0}
            aria-busy={submitting}
            onClick={onConfirm}
          >
            {submitting
              ? "Completing Work…"
              : eligible === 0
                ? "Nothing to complete"
                : `Complete ${eligible} Work ${eligible === 1 ? "item" : "items"}`}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
