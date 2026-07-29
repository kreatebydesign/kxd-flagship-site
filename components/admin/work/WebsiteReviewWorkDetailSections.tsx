"use client";

import Link from "next/link";
import { formatAttachmentSize } from "@/lib/ces/modules/website-review/attachments";
import { reviewInboxStatusOption } from "@/lib/website-review-inbox/status";
import type { ReviewWorkspaceAttachment } from "@/lib/website-review-inbox/types";
import type { WebsiteReviewWorkContext } from "@/lib/work/website-review-context-types";

function fmtDateLong(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}

function fmtDateShort(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

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
        className="kxd-os-work-detail__attachment kxd-os-work-detail__attachment--image"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={file.url}
          alt={file.filename}
          className="kxd-os-work-detail__attachment-img"
        />
        <span className="kxd-os-work-detail__attachment-cap">
          <span className="kxd-os-work-detail__attachment-name">{file.filename}</span>
          <span className="kxd-os-work-detail__attachment-meta">
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
      className="kxd-os-work-detail__attachment kxd-os-work-detail__attachment--doc"
    >
      <span className="kxd-os-work-detail__attachment-icon" aria-hidden>
        {docIconLabel(file.mimeType)}
      </span>
      <span className="kxd-os-work-detail__attachment-cap">
        <span className="kxd-os-work-detail__attachment-name">{file.filename}</span>
        <span className="kxd-os-work-detail__attachment-meta">
          {formatAttachmentSize(file.filesize)} · Download
        </span>
      </span>
    </a>
  );
}

function Fact({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  if (value == null || value === "") return null;
  return (
    <div className="kxd-os-work-detail__fact">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function clientReviewStatusLabel(
  context: WebsiteReviewWorkContext | null | undefined,
): string | null {
  if (!context || context.status !== "linked" || !context.reviewStatus) {
    return null;
  }
  return reviewInboxStatusOption(context.reviewStatus).label;
}

/** Prominent request block — render immediately after summary/actions. */
export function WebsiteReviewRequestSection({
  context,
}: {
  context: WebsiteReviewWorkContext;
}) {
  if (context.status !== "linked") {
    return (
      <section
        className="kxd-os-work-detail__section kxd-os-work-detail__section--notice kxd-os-work-detail__section--request"
        aria-label="Source review"
      >
        <h2 className="kxd-os-work-detail__section-title">Source Website Review</h2>
        <p className="kxd-os-work-detail__fallback">{context.fallbackMessage}</p>
        <p className="kxd-os-work-detail__meta-note">Review ID · #{context.reviewId}</p>
      </section>
    );
  }

  return (
    <section
      className="kxd-os-work-detail__section kxd-os-work-detail__section--request"
      aria-labelledby="wr-request-heading"
    >
      <h2 id="wr-request-heading" className="kxd-os-work-detail__section-title">
        Original Client Request
      </h2>
      {context.updateTypeLabel ? (
        <p className="kxd-os-work-detail__update-type">{context.updateTypeLabel}</p>
      ) : null}
      {context.requestBody ? (
        <div className="kxd-os-work-detail__prose kxd-os-work-detail__prose--request">
          <p>{context.requestBody}</p>
        </div>
      ) : (
        <p className="kxd-os-work-detail__fallback">
          No additional request details were provided.
        </p>
      )}
      {context.submittedAt ? (
        <p className="kxd-os-work-detail__meta-note">
          Submitted {fmtDateLong(context.submittedAt)}
          {context.submittedBy ? ` · ${context.submittedBy}` : ""}
        </p>
      ) : null}
    </section>
  );
}

/** Supporting evidence below the request — location, files, review notes/timeline. */
export function WebsiteReviewSupportingSections({
  context,
}: {
  context: WebsiteReviewWorkContext;
}) {
  if (context.status !== "linked") return null;

  const location = context.location;
  const locationBits = location
    ? [
        location.pageLabel ?? location.display,
        location.pagePath,
        location.section,
        location.markerNumber != null ? `Pin #${location.markerNumber}` : null,
      ].filter(Boolean)
    : [];

  return (
    <>
      <section
        className="kxd-os-work-detail__section kxd-os-work-detail__section--compact"
        aria-labelledby="wr-location-heading"
      >
        <h2 id="wr-location-heading" className="kxd-os-work-detail__section-title">
          Page &amp; Location
        </h2>
        {location && locationBits.length > 0 ? (
          <>
            <p className="kxd-os-work-detail__location-line">
              {locationBits.map((bit, i) => (
                <span key={`${bit}-${i}`}>
                  {i > 0 ? (
                    <span className="kxd-os-work-detail__location-sep" aria-hidden>
                      {" "}
                      ·{" "}
                    </span>
                  ) : null}
                  {typeof bit === "string" && bit.startsWith("/") ? (
                    <span className="kxd-os-work-detail__path">{bit}</span>
                  ) : (
                    bit
                  )}
                </span>
              ))}
            </p>
            <dl className="kxd-os-work-detail__facts kxd-os-work-detail__facts--compact">
              <Fact
                label="URL"
                value={
                  location.pageUrl ? (
                    <a
                      href={location.pageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="kxd-os-link-quiet"
                    >
                      {location.pageUrl}
                    </a>
                  ) : null
                }
              />
              <Fact label="Visual marker" value={location.visualAnchor} />
              <Fact label="Capture" value={location.source} />
            </dl>
          </>
        ) : (
          <p className="kxd-os-work-detail__fallback">
            No page location was recorded with this review.
          </p>
        )}
      </section>

      <section
        className="kxd-os-work-detail__section kxd-os-work-detail__section--compact"
        aria-labelledby="wr-files-heading"
      >
        <h2 id="wr-files-heading" className="kxd-os-work-detail__section-title">
          Screenshots &amp; Files
          {context.attachments.length > 0 ? (
            <span className="kxd-os-work-detail__count">
              {context.attachments.length}
            </span>
          ) : null}
        </h2>
        {context.attachments.length > 0 ? (
          <div className="kxd-os-work-detail__attachments">
            {context.attachments.map((file) => (
              <AttachmentCard key={file.id} file={file} />
            ))}
          </div>
        ) : (
          <p className="kxd-os-work-detail__fallback">
            No screenshots or attachments were included.
          </p>
        )}
      </section>

      {context.reviewInternalNotes ? (
        <section
          className="kxd-os-work-detail__section kxd-os-work-detail__section--compact"
          aria-labelledby="wr-review-notes-heading"
        >
          <h2
            id="wr-review-notes-heading"
            className="kxd-os-work-detail__section-title"
          >
            Review Team Notes
          </h2>
          <p className="kxd-os-work-detail__hint">
            From the original Website Review — internal only.
          </p>
          <div className="kxd-os-work-detail__prose">
            <p>{context.reviewInternalNotes}</p>
          </div>
        </section>
      ) : null}

      {context.reviewTimeline.length > 0 ? (
        <section
          className="kxd-os-work-detail__section kxd-os-work-detail__section--compact"
          aria-labelledby="wr-review-timeline-heading"
        >
          <h2
            id="wr-review-timeline-heading"
            className="kxd-os-work-detail__section-title"
          >
            Review Activity
          </h2>
          <ol className="kxd-os-work-detail__timeline">
            {[...context.reviewTimeline].reverse().map((event) => (
              <li key={event.id} className="kxd-os-work-detail__timeline-item">
                <p className="kxd-os-work-detail__timeline-event">{event.label}</p>
                <p className="kxd-os-work-detail__timeline-meta">
                  <time dateTime={event.at}>{fmtDateShort(event.at)}</time>
                </p>
                {event.detail ? (
                  <p className="kxd-os-work-detail__timeline-note">{event.detail}</p>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </>
  );
}

export function WebsiteReviewWorkPrimaryActions({
  context,
}: {
  context: WebsiteReviewWorkContext;
}) {
  if (context.status !== "linked") return null;

  return (
    <div className="kxd-os-work-detail__action-group" aria-label="Navigation">
      {context.reviewWorkspaceUrl ? (
        <Link
          href={context.reviewWorkspaceUrl}
          className="kxd-os-work-detail__action kxd-os-work-detail__action--nav"
        >
          Open Original Review
        </Link>
      ) : null}
      {context.websiteOpenUrl && context.websiteOpenLabel ? (
        <a
          href={context.websiteOpenUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="kxd-os-work-detail__action kxd-os-work-detail__action--nav"
        >
          {context.websiteOpenLabel}
        </a>
      ) : null}
    </div>
  );
}
