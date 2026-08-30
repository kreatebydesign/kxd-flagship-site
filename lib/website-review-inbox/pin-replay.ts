import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import type { ReviewAnchor, ReviewSessionPin } from "@/lib/ces/review";
import { WEBSITE_REVIEW_EXPERIENCE_MODULE } from "@/lib/ces/modules/website-review/constants";
import { WEBSITE_WORKSPACE_EXPERIENCE_MODULE } from "@/lib/ces/modules/website-workspace/constants";
import type { WebsiteReviewPageContext } from "@/lib/ces/modules/website-review/types";
import { resolveReviewPageLocation } from "@/lib/ces/modules/website-review/page-location";
import { resolveWebsiteReviewTargetUrl } from "@/lib/ces/modules/website-review/target-url";
import {
  buildWebsiteReviewOpenUrl,
  isSafeExternalHttpUrl,
} from "@/lib/work/website-review-context-helpers";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export interface ReviewPinReplayData {
  requestId: number;
  title: string;
  clientName: string;
  workspaceUrl: string;
  pageUrl: string;
  pin: ReviewSessionPin;
  scrollX: number;
  scrollY: number;
}

function resolveId(rel: AnyDoc | number | null | undefined): number | null {
  if (!rel) return null;
  if (typeof rel === "number") return rel;
  return Number((rel as AnyDoc).id) || null;
}

function resolveName(rel: AnyDoc | number | null | undefined, fallback = "—"): string {
  if (!rel) return fallback;
  if (typeof rel === "object") return String((rel as AnyDoc).name ?? fallback);
  return `#${rel}`;
}

function parseStoredAnchor(raw: unknown): ReviewAnchor | null {
  if (!raw || typeof raw !== "object") return null;
  const anchor = raw as ReviewAnchor;
  if (!anchor.id || typeof anchor.id !== "string") return null;
  const viewport = anchor.viewport;
  if (!viewport || typeof viewport !== "object") return null;
  const point = viewport.point;
  if (
    !point ||
    typeof point.x !== "number" ||
    typeof point.y !== "number" ||
    !Number.isFinite(point.x) ||
    !Number.isFinite(point.y)
  ) {
    return null;
  }
  return {
    id: anchor.id,
    requestId: typeof anchor.requestId === "number" ? anchor.requestId : undefined,
    viewport: {
      pageUrl: String(viewport.pageUrl ?? ""),
      pagePath: String(viewport.pagePath ?? "/"),
      pageLabel: viewport.pageLabel ? String(viewport.pageLabel) : undefined,
      viewportWidth: Number(viewport.viewportWidth) || 0,
      viewportHeight: Number(viewport.viewportHeight) || 0,
      scrollX: Number(viewport.scrollX) || 0,
      scrollY: Number(viewport.scrollY) || 0,
      point: {
        x: Math.min(1, Math.max(0, point.x)),
        y: Math.min(1, Math.max(0, point.y)),
      },
      clientX: Number(viewport.clientX) || 0,
      clientY: Number(viewport.clientY) || 0,
      capturedAt: String(viewport.capturedAt ?? new Date().toISOString()),
    },
  };
}

/**
 * True when Review Inbox can offer operator pin replay for this request.
 */
export function hasReplayablePin(reviewContext: WebsiteReviewPageContext | null | undefined): boolean {
  return parseStoredAnchor(reviewContext?.reviewAnchor) != null;
}

export function reviewPinReplayHref(requestId: number): string {
  return `/admin/operations/review-inbox/${requestId}/pin-replay`;
}

/**
 * Load operator pin-replay payload from Shared Core (no new revision created).
 */
export async function getReviewPinReplay(
  requestId: number,
): Promise<ReviewPinReplayData | null> {
  const payload = await getPayload({ config });

  let doc: AnyDoc;
  try {
    doc = (await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-requests" as any,
      id: requestId,
      depth: 1,
      overrideAccess: true,
    })) as AnyDoc;
  } catch {
    return null;
  }

  const moduleId = doc.experienceModule;
  if (
    moduleId !== WEBSITE_REVIEW_EXPERIENCE_MODULE &&
    moduleId !== WEBSITE_WORKSPACE_EXPERIENCE_MODULE
  ) {
    return null;
  }

  const clientId = resolveId(doc.client);
  if (clientId == null) return null;

  const reviewContext =
    (doc.reviewContext as WebsiteReviewPageContext | null | undefined) ?? {};
  const anchor = parseStoredAnchor(reviewContext.reviewAnchor);
  if (!anchor) return null;

  const pageContext = doc.pageContext as string | null | undefined;
  const resolved = resolveReviewPageLocation(reviewContext, pageContext);
  const clientWebsiteUrl = await resolveWebsiteReviewTargetUrl(clientId);

  const pageUrl =
    buildWebsiteReviewOpenUrl({
      pageUrl:
        resolved.pageUrl ??
        reviewContext.pageUrl ??
        (anchor.viewport.pageUrl || null),
      pagePath: resolved.pagePath ?? reviewContext.pagePath ?? null,
      clientWebsiteUrl,
    }) ?? null;

  if (!pageUrl || !isSafeExternalHttpUrl(pageUrl)) return null;

  const markerNumber =
    typeof reviewContext.markerNumber === "number" &&
    Number.isFinite(reviewContext.markerNumber) &&
    reviewContext.markerNumber > 0
      ? Math.floor(reviewContext.markerNumber)
      : 1;

  const title = String(
    doc.requestTitle ??
      (moduleId === WEBSITE_WORKSPACE_EXPERIENCE_MODULE
        ? "Website update"
        : "Website revision"),
  );

  const pin: ReviewSessionPin = {
    id: `replay-${requestId}-${anchor.id}`,
    number: markerNumber,
    anchor: { ...anchor, requestId },
    title,
    summary: "",
    requestId,
    priority: String(doc.priority ?? "normal"),
  };

  return {
    requestId,
    title,
    clientName: resolveName(doc.client),
    workspaceUrl: `/admin/operations/review-inbox/${requestId}`,
    pageUrl,
    pin,
    scrollX: anchor.viewport.scrollX,
    scrollY: anchor.viewport.scrollY,
  };
}
