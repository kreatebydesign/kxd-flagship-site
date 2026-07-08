"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const CONFIRM_MESSAGE =
  "Delete this revision? This removes the revision from the client workspace and Review Inbox.";

export interface ReviewDeleteControlProps {
  requestId: number;
  title: string;
  /** Redirect after successful delete (workspace flow). */
  redirectTo?: string;
  /** Called after successful delete when staying on the page (inbox flow). */
  onDeleted?: () => void;
  className?: string;
}

export function ReviewDeleteControl({
  requestId,
  title,
  redirectTo,
  onDeleted,
  className,
}: ReviewDeleteControlProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/client-requests/${requestId}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });

      const body = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !body.ok) {
        throw new Error(body.error ?? "Could not delete revision.");
      }

      if (redirectTo) {
        router.push(redirectTo);
        router.refresh();
        return;
      }

      onDeleted?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete revision.");
    } finally {
      setDeleting(false);
    }
  }

  function cancel() {
    setConfirming(false);
    setError(null);
  }

  return (
    <div className={`kxd-os-review-delete${className ? ` ${className}` : ""}`}>
      {!confirming ? (
        <button
          type="button"
          className="kxd-os-review-delete__trigger"
          onClick={() => setConfirming(true)}
        >
          Delete revision
        </button>
      ) : (
        <div
          className="kxd-os-review-delete__confirm"
          role="alertdialog"
          aria-labelledby={`review-delete-title-${requestId}`}
          aria-describedby={`review-delete-desc-${requestId}`}
        >
          <p id={`review-delete-title-${requestId}`} className="kxd-os-review-delete__title">
            Delete revision
          </p>
          <p id={`review-delete-desc-${requestId}`} className="kxd-os-review-delete__message">
            {CONFIRM_MESSAGE}
          </p>
          <p className="kxd-os-review-delete__target">
            <span className="kxd-os-review-delete__target-label">Revision</span>
            {title}
          </p>
          {error ? (
            <p className="kxd-os-review-delete__error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="kxd-os-review-delete__actions">
            <button
              type="button"
              className="kxd-os-btn kxd-os-btn--secondary"
              disabled={deleting}
              onClick={cancel}
            >
              Cancel
            </button>
            <button
              type="button"
              className="kxd-os-btn kxd-os-btn--danger"
              disabled={deleting}
              onClick={() => void handleDelete()}
            >
              {deleting ? "Deleting…" : "Delete permanently"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
