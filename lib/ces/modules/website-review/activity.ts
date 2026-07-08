import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import type { WebsiteReviewTimelineEvent } from "./types";
import {
  mapRequestStatusToReview,
  reviewStatusLabel,
  WEBSITE_REVIEW_ACTIVITY_DETAILS,
  WEBSITE_REVIEW_STATUS_LABELS,
  type WebsiteReviewClientStatus,
} from "@/lib/ces/vocabulary/website-review";
import { WEBSITE_REVIEW_EXPERIENCE_MODULE } from "./constants";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function isWebsiteReviewActivityEvent(doc: AnyDoc): boolean {
  const eventType = String(doc.eventType ?? "");
  if (eventType.startsWith("website-review.")) return true;
  const meta = doc.metadata as Record<string, unknown> | undefined;
  return meta?.experienceModule === WEBSITE_REVIEW_EXPERIENCE_MODULE;
}

function clientStatusFromEvent(doc: AnyDoc): WebsiteReviewClientStatus | null {
  const meta = doc.metadata as Record<string, unknown> | undefined;
  const fromMeta = meta?.clientStatus;
  if (typeof fromMeta === "string") {
    if (fromMeta in WEBSITE_REVIEW_STATUS_LABELS) {
      return fromMeta as WebsiteReviewClientStatus;
    }
    return mapRequestStatusToReview(fromMeta);
  }
  const eventType = String(doc.eventType ?? "");
  if (eventType.startsWith("website-review.")) {
    const status = eventType.replace("website-review.", "");
    if (status in WEBSITE_REVIEW_STATUS_LABELS) {
      return status as WebsiteReviewClientStatus;
    }
  }
  return null;
}

function fallbackTimelineFromRequest(doc: AnyDoc): WebsiteReviewTimelineEvent[] {
  const status = mapRequestStatusToReview(String(doc.status ?? "new"));
  const createdAt = String(doc.createdAt ?? new Date().toISOString());
  const updatedAt = String(doc.updatedAt ?? createdAt);

  const events: WebsiteReviewTimelineEvent[] = [
    {
      id: "received",
      label: reviewStatusLabel("review-received"),
      at: createdAt,
      detail: WEBSITE_REVIEW_ACTIVITY_DETAILS["review-received"],
    },
  ];

  if (status !== "review-received") {
    events.push({
      id: `status-${status}`,
      label: reviewStatusLabel(status),
      at: updatedAt,
      detail: WEBSITE_REVIEW_ACTIVITY_DETAILS[status],
    });
  }

  return events;
}

/**
 * Loads client-visible timeline events from the Activity Engine (executive-timeline-events).
 * Falls back to request status when no published events exist yet.
 */
export async function loadWebsiteReviewTimeline(
  clientId: number,
  requestId: number,
  requestDoc?: AnyDoc | null,
): Promise<WebsiteReviewTimelineEvent[]> {
  const payload = await getPayload({ config });

  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "executive-timeline-events" as any,
    where: {
      and: [
        { client: { equals: clientId } },
        { request: { equals: requestId } },
        { internalOnly: { equals: false } },
      ],
    },
    sort: "occurredAt",
    limit: 50,
    depth: 0,
    overrideAccess: true,
  });

  const activityEvents = (result.docs as AnyDoc[])
    .filter(isWebsiteReviewActivityEvent)
    .map((doc) => {
      const clientStatus = clientStatusFromEvent(doc);
      const label =
        clientStatus != null
          ? reviewStatusLabel(clientStatus)
          : String(doc.title ?? "Update");

      return {
        id: String(doc.id),
        label,
        at: String(doc.occurredAt ?? doc.createdAt),
        detail: doc.summary ? String(doc.summary) : undefined,
      } satisfies WebsiteReviewTimelineEvent;
    });

  if (activityEvents.length > 0) return activityEvents;

  if (requestDoc) return fallbackTimelineFromRequest(requestDoc);

  return [];
}
