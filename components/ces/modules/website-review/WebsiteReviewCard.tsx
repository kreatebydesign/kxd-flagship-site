import Link from "next/link";
import type { WebsiteReviewItem } from "@/lib/ces/modules/website-review/types";
import { PORTAL_CLIENT_LANGUAGE } from "@/lib/ces/copy/portal-language";
import { WebsiteReviewStatus } from "./WebsiteReviewStatus";

function formatRelativeDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function WebsiteReviewCard({ review }: { review: WebsiteReviewItem }) {
  const preview = review.details.trim() || review.summary.trim();
  const updatedLabel = PORTAL_CLIENT_LANGUAGE.cardUpdated(formatRelativeDate(review.updatedAt));

  return (
    <Link href={`/portal/website-review/${review.id}`} className="kxd-ces-review-card">
      <div className="kxd-ces-review-card__head">
        <h3 className="kxd-ces-review-card__title">{review.title}</h3>
        {review.pageContext ? (
          <p className="kxd-ces-review-card__context">{review.pageContext}</p>
        ) : null}
      </div>
      {preview ? <p className="kxd-ces-review-card__summary">{preview}</p> : null}
      <div className="kxd-ces-review-card__foot">
        <WebsiteReviewStatus status={review.status} />
        <time className="kxd-ces-review-card__date" dateTime={review.updatedAt}>
          {updatedLabel}
        </time>
      </div>
    </Link>
  );
}
