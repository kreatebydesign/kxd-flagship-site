import Link from "next/link";
import type { WebsiteReviewItem } from "@/lib/ces/modules/website-review/types";
import { PORTAL_CLIENT_LANGUAGE } from "@/lib/ces/copy/portal-language";
import { resolveReviewPageLocation } from "@/lib/ces/modules/website-review/page-location";
import { WebsiteReviewStatus } from "./WebsiteReviewStatus";

function formatRelativeDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function pageMeta(review: WebsiteReviewItem): { compact: string; path: string | null } {
  const location = resolveReviewPageLocation(review.reviewContext, review.pageContext);
  const marker =
    review.markerNumber != null ? ` · Marker ${review.markerNumber}` : "";
  const section = review.section?.trim() ? ` · ${review.section.trim()}` : "";
  if (location.unspecified) {
    return { compact: location.compact + marker, path: null };
  }
  return {
    compact: `${location.compact}${section}${marker}`,
    path: location.pagePath,
  };
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
        <p className="kxd-ces-review-card__context">{location.compact}</p>
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
