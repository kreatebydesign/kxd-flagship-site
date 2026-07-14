import Link from "next/link";
import type { WebsiteReviewItem } from "@/lib/ces/modules/website-review/types";
import { PORTAL_CLIENT_LANGUAGE } from "@/lib/ces/copy/portal-language";
import { WebsiteReviewStatus } from "./WebsiteReviewStatus";

function formatRelativeDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function pageMeta(review: WebsiteReviewItem): string | null {
  const parts = [
    review.pageLabel || review.pagePath || null,
    review.section || null,
    review.markerNumber != null ? `Marker ${review.markerNumber}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : review.pageContext || null;
}

export function WebsiteReviewCard({
  review,
  emphasizeCompleted = false,
}: {
  review: WebsiteReviewItem;
  emphasizeCompleted?: boolean;
}) {
  const preview = review.details.trim() || review.summary.trim();
  const dateIso = emphasizeCompleted
    ? review.completedAt || review.updatedAt
    : review.submittedAt;
  const updatedLabel = emphasizeCompleted
    ? `Completed ${formatRelativeDate(dateIso)}`
    : PORTAL_CLIENT_LANGUAGE.cardUpdated(formatRelativeDate(dateIso));
  const location = pageMeta(review);

  return (
    <Link
      href={`/portal/website-review/${review.id}`}
      className={`kxd-ces-review-card${emphasizeCompleted ? " kxd-ces-review-card--completed" : ""}`}
    >
      <div className="kxd-ces-review-card__head">
        <h3 className="kxd-ces-review-card__title">{review.title}</h3>
        {location ? <p className="kxd-ces-review-card__context">{location}</p> : null}
        {review.pageUrl ? (
          <p className="kxd-ces-review-card__url">{review.pageUrl}</p>
        ) : null}
      </div>
      {preview ? <p className="kxd-ces-review-card__summary">{preview}</p> : null}
      {emphasizeCompleted && review.completionNote ? (
        <p className="kxd-ces-review-card__note">{review.completionNote}</p>
      ) : null}
      <div className="kxd-ces-review-card__foot">
        <WebsiteReviewStatus status={review.status} />
        <time className="kxd-ces-review-card__date" dateTime={dateIso}>
          {updatedLabel}
        </time>
      </div>
    </Link>
  );
}
