import Link from "next/link";
import type { WebsiteReviewItem } from "@/lib/ces/modules/website-review/types";
import type { ResolvedExperienceProfile } from "@/lib/ces";
import { PORTAL_CLIENT_LANGUAGE } from "@/lib/ces/copy/portal-language";
import { formatAttachmentSize } from "@/lib/ces/modules/website-review/attachments";
import { formatPageContextDisplay } from "@/lib/ces/modules/website-review/context";
import { CesHero, CesPage, CesTimeline } from "@/components/ces/primitives";
import { WebsiteReviewStatus } from "./WebsiteReviewStatus";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export interface WebsiteReviewDetailProps {
  profile: ResolvedExperienceProfile;
  review: WebsiteReviewItem;
}

export function WebsiteReviewDetail({ profile, review }: WebsiteReviewDetailProps) {
  const eyebrow =
    profile.terminology["website-review.detail.eyebrow"] ??
    profile.hospitality.welcomeEyebrow;

  const location = formatPageContextDisplay(review.reviewContext, review.pageContext);

  const timelineEvents = review.timeline.map((event, index) => ({
    ...event,
    state:
      index === review.timeline.length - 1
        ? ("current" as const)
        : ("complete" as const),
  }));

  return (
    <CesPage>
      <nav className="kxd-ces-breadcrumb" aria-label="Breadcrumb">
        <Link href="/portal/website-review">Website Review</Link>
        <span aria-hidden>/</span>
        <span>{review.title}</span>
      </nav>

      <header className="kxd-ces-detail-hero">
        <div className="kxd-ces-detail-hero__copy">
          <p className="kxd-ces-detail-hero__eyebrow">{eyebrow}</p>
          <h1 className="kxd-ces-detail-hero__title">{review.title}</h1>
          <p className="kxd-ces-detail-hero__meta">
            <span>{PORTAL_CLIENT_LANGUAGE.detailReference} {review.id}</span>
            <span aria-hidden> · </span>
            <span>Submitted {formatDate(review.submittedAt)}</span>
          </p>
        </div>
        <WebsiteReviewStatus status={review.status} />
      </header>

      <div className="kxd-ces-detail-layout">
        <section className="kxd-ces-detail-main" aria-labelledby="review-overview-heading">
          <h2 id="review-overview-heading" className="kxd-ces-section__title">
            {PORTAL_CLIENT_LANGUAGE.detailDetails}
          </h2>

          {review.details ? (
            <div className="kxd-ces-detail-prose">
              <p>{review.details}</p>
            </div>
          ) : (
            <p className="kxd-ces-detail-prose kxd-ces-detail-prose--muted">
              {review.summary}
            </p>
          )}

          {location ? (
            <dl className="kxd-ces-detail-facts">
              <div className="kxd-ces-detail-facts__row">
                <dt>On your site</dt>
                <dd>{location}</dd>
              </div>
              {review.reviewContext?.pageUrl ? (
                <div className="kxd-ces-detail-facts__row">
                  <dt>Page</dt>
                  <dd>
                    <a
                      href={review.reviewContext.pageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="kxd-ces-detail-link"
                    >
                      {review.reviewContext.pageUrl}
                    </a>
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : null}

          {review.attachments.length > 0 ? (
            <div className="kxd-ces-detail-attachments">
              <h3 className="kxd-ces-detail-attachments__title">
                {PORTAL_CLIENT_LANGUAGE.detailAttachments}
              </h3>
              <ul className="kxd-ces-detail-attachment-grid">
                {review.attachments.map((file) => (
                  <li key={file.id}>
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`kxd-ces-detail-attachment${file.isImage ? " kxd-ces-detail-attachment--image" : ""}`}
                    >
                      {file.isImage ? (
                        <span className="kxd-ces-detail-attachment__preview">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={file.url} alt="" />
                        </span>
                      ) : (
                        <span className="kxd-ces-detail-attachment__chip" aria-hidden>
                          {file.mimeType === "application/pdf" ? "PDF" : "DOC"}
                        </span>
                      )}
                      <span className="kxd-ces-detail-attachment__meta">
                        <span className="kxd-ces-detail-attachment__name">{file.filename}</span>
                        <span className="kxd-ces-detail-attachment__size">
                          {formatAttachmentSize(file.filesize)}
                        </span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div
            className="kxd-ces-extension-slot"
            data-ces-extension="website-review-detail-annotations"
            aria-hidden="true"
          />
        </section>

        <aside className="kxd-ces-detail-aside" aria-labelledby="review-timeline-heading">
          <h2 id="review-timeline-heading" className="kxd-ces-section__title">
            {PORTAL_CLIENT_LANGUAGE.detailProgress}
          </h2>
          <p className="kxd-ces-detail-aside__lead">{PORTAL_CLIENT_LANGUAGE.detailTimelineLead}</p>

          <CesTimeline events={timelineEvents} />

          {review.timeline.length === 1 ? (
            <p className="kxd-ces-detail-aside__reassurance">
              {PORTAL_CLIENT_LANGUAGE.detailTimelineReassurance}
            </p>
          ) : null}
        </aside>
      </div>
    </CesPage>
  );
}
