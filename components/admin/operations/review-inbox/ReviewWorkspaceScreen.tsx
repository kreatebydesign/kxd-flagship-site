"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import { OpsStatusBadge } from "@/components/admin/operations/shared/OpsBriefing";
import type { KxdBadgeVariant } from "@/components/os";
import { KxdPage } from "@/components/os";
import { formatAttachmentSize } from "@/lib/ces/modules/website-review/attachments";
import {
  REVIEW_INBOX_STATUS_OPTIONS,
  reviewInboxStatusOption,
} from "@/lib/website-review-inbox/status";
import type { ReviewInboxRequestStatus } from "@/lib/website-review-inbox/types";
import type { ReviewWorkspaceAttachment, ReviewWorkspaceDetail } from "@/lib/website-review-inbox/types";
import { ReviewDeleteControl } from "./ReviewDeleteControl";
import { ReviewSendToWorkControl } from "./ReviewSendToWorkControl";

function fmtDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function fmtDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const PRIO_VARIANT: Record<string, KxdBadgeVariant> = {
  urgent: "critical",
  high: "warning",
  normal: "default",
  low: "default",
};

function docIconLabel(mimeType: string): string {
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.startsWith("text/")) return "TXT";
  return "DOC";
}

function AttachmentCard({ file }: { file: ReviewWorkspaceAttachment }) {
  if (file.isImage) {
    return (
      <a
        href={file.url}
        target="_blank"
        rel="noopener noreferrer"
        className="kxd-os-review-workspace__attachment kxd-os-review-workspace__attachment--image"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={file.url} alt={file.filename} className="kxd-os-review-workspace__attachment-img" />
        <span className="kxd-os-review-workspace__attachment-cap">
          <span className="kxd-os-review-workspace__attachment-name">{file.filename}</span>
          <span className="kxd-os-review-workspace__attachment-size">
            {formatAttachmentSize(file.filesize)} · Open
          </span>
        </span>
      </a>
    );
  }

  return (
    <a
      href={file.url}
      target="_blank"
      rel="noopener noreferrer"
      className="kxd-os-review-workspace__attachment kxd-os-review-workspace__attachment--doc"
    >
      <span className="kxd-os-review-workspace__attachment-icon" aria-hidden>
        {docIconLabel(file.mimeType)}
      </span>
      <span className="kxd-os-review-workspace__attachment-cap">
        <span className="kxd-os-review-workspace__attachment-name">{file.filename}</span>
        <span className="kxd-os-review-workspace__attachment-size">
          {formatAttachmentSize(file.filesize)} · Download
        </span>
      </span>
    </a>
  );
}

export interface ReviewWorkspaceScreenProps {
  review: ReviewWorkspaceDetail;
}

export function ReviewWorkspaceScreen({ review: initialReview }: ReviewWorkspaceScreenProps) {
  const router = useRouter();
  const [review, setReview] = useState(initialReview);
  const [status, setStatus] = useState(initialReview.status);
  const [internalNotes, setInternalNotes] = useState(initialReview.internalNotes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [completionNote, setCompletionNote] = useState("");

  const statusOption = reviewInboxStatusOption(status);
  const prioVariant = PRIO_VARIANT[review.priority] ?? "default";

  async function handleStatusChange(next: ReviewInboxRequestStatus) {
    if (next === status) return;
    const previous = status;
    // Optimistic: controlled <select> otherwise snaps back while the request runs.
    setStatus(next);
    setReview((prev) => ({ ...prev, status: next }));
    setUpdatingStatus(true);
    setStatusError(null);
    try {
      const res = await fetch(`/api/admin/client-requests/${review.id}/status`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: next,
          // Optional — omit when empty; never block Complete on a note.
          clientCompletionNote:
            next === "complete" ? completionNote.trim() || undefined : undefined,
        }),
      });
      if (res.status === 401) {
        setStatus(previous);
        setReview((prev) => ({ ...prev, status: previous }));
        const returnPath = window.location.pathname;
        window.location.href = `/admin/login?redirect=${encodeURIComponent(returnPath)}`;
        return;
      }
      let body: {
        ok?: boolean;
        success?: boolean;
        status?: ReviewInboxRequestStatus;
        error?: string;
      } = {};
      try {
        body = (await res.json()) as typeof body;
      } catch {
        throw new Error("Could not update status (invalid response).");
      }
      if (!res.ok || !(body.ok || body.success) || !body.status) {
        throw new Error(body.error ?? "Could not update status.");
      }
      setStatus(body.status);
      setReview((prev) => ({ ...prev, status: body.status! }));
      router.refresh();
    } catch (err) {
      setStatus(previous);
      setReview((prev) => ({ ...prev, status: previous }));
      setStatusError(err instanceof Error ? err.message : "Could not update status.");
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function saveNotes() {
    setSavingNotes(true);
    setNotesSaved(false);
    setNotesError(null);
    try {
      const res = await fetch(`/api/admin/client-requests/${review.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internalNotes }),
      });
      const body = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !body.ok) throw new Error(body.error ?? "Could not save notes.");
      setNotesSaved(true);
    } catch (err) {
      setNotesError(err instanceof Error ? err.message : "Could not save notes.");
    } finally {
      setSavingNotes(false);
    }
  }

  async function copyClientLink() {
    const origin = window.location.origin;
    const url = `${origin}${review.clientPortalUrl}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback ignored
    }
  }

  const websiteOpenUrl =
    review.location.pageUrl ??
    (review.clientWebsiteUrl && review.location.pagePath
      ? `${review.clientWebsiteUrl.replace(/\/$/, "")}${review.location.pagePath.startsWith("/") ? review.location.pagePath : `/${review.location.pagePath}`}`
      : review.clientWebsiteUrl);

  return (
    <OperationsShell activeId="review-inbox">
      <KxdPage className="kxd-os-page--ops kxd-os-review-workspace">
        <nav className="kxd-os-review-workspace__back">
          <Link href="/admin/operations/review-inbox">← Back to Review Inbox</Link>
        </nav>

        <header className="kxd-os-review-workspace__hero">
          <div className="kxd-os-review-workspace__hero-main">
            <p className="kxd-os-review-workspace__client">{review.clientName}</p>
            <h1 className="kxd-os-review-workspace__title">
              {review.location.pageLabel ?? review.location.display ?? review.title}
            </h1>
            {review.location.section ? (
              <p className="kxd-os-review-workspace__section">{review.location.section}</p>
            ) : null}
            <div className="kxd-os-review-workspace__badges">
              <OpsStatusBadge label={review.priority} variant={prioVariant} />
              <OpsStatusBadge label={statusOption.label} variant={statusOption.variant} />
            </div>
          </div>
          <div className="kxd-os-review-workspace__hero-meta">
            <p>
              <span className="kxd-os-review-workspace__meta-label">Submitted</span>
              <time dateTime={review.submittedAt}>{fmtDateLong(review.submittedAt)}</time>
            </p>
            <p>
              <span className="kxd-os-review-workspace__meta-label">Revision</span>
              #{review.id}
            </p>
            {review.submittedBy ? (
              <p>
                <span className="kxd-os-review-workspace__meta-label">From</span>
                {review.submittedBy}
                {review.submittedByEmail ? ` · ${review.submittedByEmail}` : ""}
              </p>
            ) : null}
          </div>
        </header>

        <div className="kxd-os-review-workspace__layout">
          <div className="kxd-os-review-workspace__main">
            {review.attachments.length > 0 ? (
              <section
                className="kxd-os-review-workspace__block kxd-os-review-workspace__block--attachments"
                aria-labelledby="attachments-heading"
              >
                <h2 id="attachments-heading" className="kxd-os-review-workspace__block-title">
                  Reference materials
                  <span className="kxd-os-review-workspace__count">{review.attachments.length}</span>
                </h2>
                <div className="kxd-os-review-workspace__attachments">
                  {review.attachments.map((file) => (
                    <AttachmentCard key={file.id} file={file} />
                  ))}
                </div>
              </section>
            ) : null}

            <section className="kxd-os-review-workspace__block" aria-labelledby="client-request-heading">
              <h2 id="client-request-heading" className="kxd-os-review-workspace__block-title">
                Creative brief
              </h2>
              {review.updateTypeLabel ? (
                <p className="kxd-os-review-workspace__type">{review.updateTypeLabel}</p>
              ) : null}
              <div className="kxd-os-review-workspace__prose kxd-os-review-workspace__prose--brief">
                {review.requestBody ? (
                  <p>{review.requestBody}</p>
                ) : (
                  <p className="kxd-os-review-workspace__prose--muted">
                    No additional details provided.
                  </p>
                )}
              </div>
            </section>

            <section className="kxd-os-review-workspace__block kxd-os-review-workspace__block--quiet" aria-labelledby="location-heading">
              <h2 id="location-heading" className="kxd-os-review-workspace__block-title">
                Location
              </h2>
              <dl className="kxd-os-review-workspace__facts">
                <div>
                  <dt>Website</dt>
                  <dd>{review.clientName}</dd>
                </div>
                {review.location.pageLabel || review.location.pagePath ? (
                  <div>
                    <dt>Page</dt>
                    <dd>{review.location.pageLabel ?? review.location.pagePath}</dd>
                  </div>
                ) : null}
                {review.location.section ? (
                  <div>
                    <dt>Section</dt>
                    <dd>{review.location.section}</dd>
                  </div>
                ) : null}
                {review.location.pageUrl ? (
                  <div>
                    <dt>URL</dt>
                    <dd>
                      <a href={review.location.pageUrl} target="_blank" rel="noopener noreferrer">
                        {review.location.pageUrl}
                      </a>
                    </dd>
                  </div>
                ) : null}
              </dl>
            </section>

            <section className="kxd-os-review-workspace__block" aria-labelledby="internal-notes-heading">
              <h2 id="internal-notes-heading" className="kxd-os-review-workspace__block-title">
                Team notes
              </h2>
              <p className="kxd-os-review-workspace__hint">Internal only — not visible to the client.</p>
              <textarea
                className="kxd-os-review-workspace__notes"
                rows={5}
                value={internalNotes}
                onChange={(e) => {
                  setInternalNotes(e.target.value);
                  setNotesSaved(false);
                  setNotesError(null);
                }}
                placeholder="Context for the team — triage notes, blockers, handoff…"
              />
              <div className="kxd-os-review-workspace__notes-actions">
                <button
                  type="button"
                  className="kxd-os-btn kxd-os-btn--secondary"
                  disabled={savingNotes}
                  onClick={() => void saveNotes()}
                >
                  {savingNotes ? "Saving…" : "Save notes"}
                </button>
                {notesSaved ? (
                  <span className="kxd-os-review-workspace__saved" role="status">
                    Saved
                  </span>
                ) : null}
              </div>
              {notesError ? (
                <p className="kxd-os-review-workspace__notice kxd-os-review-workspace__notice--error" role="alert">
                  {notesError}
                </p>
              ) : null}
            </section>

            <div
              className="kxd-os-extension-slot"
              data-kxd-extension="review-workspace-annotations"
              aria-hidden="true"
            />
          </div>

          <aside className="kxd-os-review-workspace__aside">
            <section className="kxd-os-review-workspace__panel" aria-labelledby="actions-heading">
              <h2 id="actions-heading" className="kxd-os-review-workspace__panel-title">
                Next steps
              </h2>

              <label className="kxd-os-review-workspace__action-field">
                <span className="kxd-os-review-workspace__action-label">
                  Client completion note
                </span>
                <textarea
                  className="kxd-os-review-workspace__notes"
                  rows={3}
                  value={completionNote}
                  onChange={(e) => setCompletionNote(e.target.value)}
                  placeholder="Optional note shown in Completed History when marked complete."
                />
              </label>

              <label className="kxd-os-review-workspace__action-field">
                <span className="kxd-os-review-workspace__action-label">Status</span>
                <select
                  className="kxd-os-review-workspace__select"
                  value={status}
                  disabled={updatingStatus}
                  aria-busy={updatingStatus}
                  onChange={(e) =>
                    void handleStatusChange(e.target.value as ReviewInboxRequestStatus)
                  }
                >
                  {REVIEW_INBOX_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {updatingStatus ? (
                  <span className="kxd-os-review-workspace__saved" role="status">
                    Saving status…
                  </span>
                ) : null}
              </label>
              {statusError ? (
                <p className="kxd-os-review-workspace__notice kxd-os-review-workspace__notice--error" role="alert">
                  {statusError}
                </p>
              ) : null}

              <div className="kxd-os-review-workspace__action-stack">
                <Link
                  href={review.clientCommandUrl}
                  className="kxd-os-btn kxd-os-btn--primary kxd-os-review-workspace__action-btn"
                >
                  Open client workspace
                </Link>
                {websiteOpenUrl ? (
                  <a
                    href={websiteOpenUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="kxd-os-btn kxd-os-btn--secondary kxd-os-review-workspace__action-btn"
                  >
                    Open website
                  </a>
                ) : null}
                <button
                  type="button"
                  className="kxd-os-btn kxd-os-btn--secondary kxd-os-review-workspace__action-btn"
                  onClick={() => void copyClientLink()}
                >
                  {copied ? "Link copied" : "Copy client link"}
                </button>
                <a
                  href={review.payloadAdminUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="kxd-os-review-workspace__ghost-link"
                >
                  Open Payload record
                </a>
              </div>

              <ReviewSendToWorkControl
                reviewId={review.id}
                clientId={review.clientId}
                initialLink={review.workEngine}
              />

              <div
                className="kxd-os-extension-slot"
                data-kxd-extension="review-workspace-operator-actions"
                aria-hidden="true"
              />
            </section>

            <section className="kxd-os-review-workspace__panel" aria-labelledby="timeline-heading">
              <h2 id="timeline-heading" className="kxd-os-review-workspace__panel-title">
                Timeline
              </h2>
              <ol className="kxd-os-review-workspace__timeline">
                {review.timeline.map((event, index) => (
                  <li
                    key={event.id}
                    className={`kxd-os-review-workspace__timeline-item${
                      index === review.timeline.length - 1
                        ? " kxd-os-review-workspace__timeline-item--current"
                        : ""
                    }`}
                  >
                    <span className="kxd-os-review-workspace__timeline-marker" aria-hidden />
                    <div>
                      <p className="kxd-os-review-workspace__timeline-label">{event.label}</p>
                      <time className="kxd-os-review-workspace__timeline-date" dateTime={event.at}>
                        {fmtDateShort(event.at)}
                      </time>
                      {event.detail ? (
                        <p className="kxd-os-review-workspace__timeline-detail">{event.detail}</p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <ReviewDeleteControl
              requestId={review.id}
              title={review.title}
              redirectTo="/admin/operations/review-inbox?deleted=1"
              className="kxd-os-review-delete--workspace"
            />
          </aside>
        </div>
      </KxdPage>
    </OperationsShell>
  );
}
