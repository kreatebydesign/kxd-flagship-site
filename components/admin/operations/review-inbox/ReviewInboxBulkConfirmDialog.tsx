"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import type { BulkCompleteClientBreakdown } from "@/lib/website-review-inbox/bulk-eligibility";
import type { ReviewInboxItem } from "@/lib/website-review-inbox/types";

export interface ReviewInboxBulkConfirmDialogProps {
  open: boolean;
  selectedCount: number;
  selectedItems: ReviewInboxItem[];
  clientBreakdown: BulkCompleteClientBreakdown[];
  submitting: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ReviewInboxBulkConfirmDialog({
  open,
  selectedCount,
  selectedItems,
  clientBreakdown,
  submitting,
  error,
  onCancel,
  onConfirm,
}: ReviewInboxBulkConfirmDialogProps) {
  const titleId = useId();
  const descId = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);

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

  const summaryItems = selectedItems.slice(0, 8);
  const remaining = selectedCount - summaryItems.length;
  const multiClient = clientBreakdown.length > 1;

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
          Mark {selectedCount === 1 ? "request" : "requests"} Completed?
        </h2>

        <div id={descId} className="kxd-os-review-inbox-bulk__dialog-body">
          <p>
            {selectedCount === 1
              ? "1 eligible request will be marked Completed."
              : `${selectedCount} eligible requests will be marked Completed.`}{" "}
            Completed requests may leave the active In Progress view.
          </p>

          {multiClient ? (
            <div className="kxd-os-review-inbox-bulk__clients">
              <p className="kxd-os-review-inbox-bulk__clients-label">By client</p>
              <ul>
                {clientBreakdown.map((row) => (
                  <li key={row.clientId != null ? `c-${row.clientId}` : row.clientName}>
                    <span>{row.clientName}</span>
                    <span>
                      {row.count} {row.count === 1 ? "request" : "requests"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : clientBreakdown[0] ? (
            <p className="kxd-os-review-inbox-bulk__single-client">
              Client: {clientBreakdown[0].clientName}
            </p>
          ) : null}

          {summaryItems.length > 0 ? (
            <div className="kxd-os-review-inbox-bulk__summary">
              <p className="kxd-os-review-inbox-bulk__summary-label">Selected</p>
              <ul>
                {summaryItems.map((item) => (
                  <li key={item.id}>
                    <span className="kxd-os-review-inbox-bulk__summary-title">{item.title}</span>
                    <span className="kxd-os-review-inbox-bulk__summary-meta">
                      {item.clientName}
                    </span>
                  </li>
                ))}
              </ul>
              {remaining > 0 ? (
                <p className="kxd-os-review-inbox-bulk__summary-more">
                  and {remaining} more
                </p>
              ) : null}
            </div>
          ) : null}

          {error ? (
            <p className="kxd-os-review-inbox__notice kxd-os-review-inbox__notice--error" role="alert">
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
            disabled={submitting}
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
