import "server-only";

import type { PortalSession } from "@/lib/portal/session";
import type { WebsiteReviewItem, WebsiteReviewLandingData, WebsiteReviewPageContext } from "./types";
import {
  mapRequestStatusToReview,
} from "@/lib/ces/vocabulary/website-review";
import type { ResolvedExperienceProfile } from "@/lib/ces/types";
import { loadWebsiteReviewTimeline } from "./activity";
import { loadAttachmentsForRequest } from "./attachments-server";
import { formatPageContextDisplay } from "./context";
import { getWebsiteReviewRequestsForClient } from "./queries";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function relClientId(doc: AnyDoc, session: PortalSession): boolean {
  const client =
    typeof doc.client === "number"
      ? doc.client
      : (doc.client as { id?: number } | undefined)?.id;
  return client === session.clientId;
}

function parseReviewContext(doc: AnyDoc): WebsiteReviewPageContext | null {
  const raw = doc.reviewContext;
  if (!raw || typeof raw !== "object") return null;
  return raw as WebsiteReviewPageContext;
}

function extractDetailsText(doc: AnyDoc): string {
  const raw = String(doc.requestDetails ?? "").trim();
  if (!raw) return "";

  const lines = raw.split("\n");
  if (!lines[0]?.startsWith("Update type:")) return raw;

  const bodyStart = lines.findIndex((line, index) => index > 0 && line.trim() === "");
  if (bodyStart < 0) return raw;

  const bodyLines: string[] = [];
  for (let i = bodyStart + 1; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (line.startsWith("Location:") || line.startsWith("Page URL:") || line.startsWith("Visual anchor:")) break;
    bodyLines.push(line);
  }

  return bodyLines.join("\n").trim();
}

export async function mapRequestDocToWebsiteReviewItem(
  doc: AnyDoc,
  session: PortalSession,
): Promise<WebsiteReviewItem> {
  const requestId = doc.id as number;
  const status = mapRequestStatusToReview(String(doc.status ?? "new"));
  const timeline = await loadWebsiteReviewTimeline(session.clientId, requestId, doc);
  const reviewContext = parseReviewContext(doc);
  const attachments = await loadAttachmentsForRequest(requestId);
  const pageContext = formatPageContextDisplay(reviewContext, doc.pageContext as string | null);

  return {
    id: String(requestId),
    title: String(doc.requestTitle ?? "Website update"),
    summary: doc.requestDetails
      ? String(doc.requestDetails).trim().slice(0, 240)
      : "Website review request",
    details: extractDetailsText(doc),
    status,
    submittedAt: String(doc.createdAt ?? new Date().toISOString()),
    updatedAt: String(doc.updatedAt ?? doc.createdAt ?? new Date().toISOString()),
    pageContext,
    reviewContext,
    attachments,
    timeline,
  };
}

export async function getWebsiteReviewLanding(
  session: PortalSession,
  profile: ResolvedExperienceProfile,
): Promise<WebsiteReviewLandingData> {
  const docs = await getWebsiteReviewRequestsForClient(session.clientId);
  const items = await Promise.all(
    docs.map((doc) => mapRequestDocToWebsiteReviewItem(doc, session)),
  );

  const activeReviews = items.filter(
    (r) => r.status !== "completed" && r.status !== "closed",
  );
  const completedReviews = items.filter(
    (r) => r.status === "completed" || r.status === "closed",
  );

  return {
    websiteUrl: profile.identity.websiteUrl,
    activeReviews,
    completedReviews,
  };
}

export async function getWebsiteReviewById(
  session: PortalSession,
  requestId: string,
): Promise<WebsiteReviewItem | null> {
  const id = Number.parseInt(requestId, 10);
  if (!Number.isFinite(id)) return null;

  const docs = await getWebsiteReviewRequestsForClient(session.clientId);
  const doc = docs.find((d) => d.id === id);
  if (!doc || !relClientId(doc, session)) return null;

  return mapRequestDocToWebsiteReviewItem(doc, session);
}
