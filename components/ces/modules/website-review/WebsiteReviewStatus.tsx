import type { WebsiteReviewClientStatus } from "@/lib/ces/vocabulary/website-review";
import { reviewStatusLabel } from "@/lib/ces/vocabulary/website-review";

const STATUS_CLASS: Record<WebsiteReviewClientStatus, string> = {
  "review-received": "kxd-ces-status--received",
  "in-review": "kxd-ces-status--review",
  "revision-in-progress": "kxd-ces-status--progress",
  "awaiting-your-input": "kxd-ces-status--input",
  completed: "kxd-ces-status--complete",
  closed: "kxd-ces-status--closed",
};

export function WebsiteReviewStatus({ status }: { status: WebsiteReviewClientStatus }) {
  return (
    <span className={`kxd-ces-status ${STATUS_CLASS[status] ?? ""}`}>
      {reviewStatusLabel(status)}
    </span>
  );
}
