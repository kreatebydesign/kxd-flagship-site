import type { Payload } from "payload";
import { getPayload } from "payload";
import config from "@payload-config";
import { publishClientActivity } from "./publish";
import type { WebsiteReviewClientStatus } from "@/lib/ces/vocabulary/website-review";
import {
  reviewEventTypeForStatus,
  reviewStatusLabel,
  WEBSITE_REVIEW_ACTIVITY_DETAILS,
} from "@/lib/ces/vocabulary/website-review";
import { WEBSITE_REVIEW_EXPERIENCE_MODULE } from "@/lib/ces/modules/website-review/constants";

export { WEBSITE_REVIEW_EXPERIENCE_MODULE };

export interface PublishWebsiteReviewActivityInput {
  clientId: number;
  requestId: number;
  clientStatus: WebsiteReviewClientStatus;
  summary?: string;
  author?: string;
  timestamp?: string;
}

/**
 * Client-visible Activity Engine bridge — writes to executive-timeline-events
 * with internalOnly: false and CES hospitality copy.
 */
export async function publishWebsiteReviewActivity(
  input: PublishWebsiteReviewActivityInput,
  payloadInstance?: Payload,
): Promise<void> {
  const payload = payloadInstance ?? (await getPayload({ config }));
  const eventType = reviewEventTypeForStatus(input.clientStatus);
  const label = reviewStatusLabel(input.clientStatus);

  await publishClientActivity(
    {
      clientId: input.clientId,
      sourceModule: "Portal",
      sourceType: "website-review",
      sourceId: `${input.requestId}:${eventType}`,
      eventType,
      title: label,
      summary:
        input.summary ??
        WEBSITE_REVIEW_ACTIVITY_DETAILS[input.clientStatus] ??
        undefined,
      requestId: input.requestId,
      author: input.author,
      timestamp: input.timestamp ?? new Date().toISOString(),
      status:
        input.clientStatus === "completed" || input.clientStatus === "closed"
          ? "completed"
          : "open",
      internalOnly: false,
      metadata: {
        experienceModule: WEBSITE_REVIEW_EXPERIENCE_MODULE,
        clientStatus: input.clientStatus,
      },
      relatedLinks: [
        {
          label: "Website Review",
          href: `/portal/website-review/${input.requestId}`,
        },
      ],
    },
    payload,
  );
}
