import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { loadWebsiteReviewTimeline } from "@/lib/ces/modules/website-review/activity";
import { formatPageContextDisplay } from "@/lib/ces/modules/website-review/context";
import { WEBSITE_REVIEW_EXPERIENCE_MODULE } from "@/lib/ces/modules/website-review/constants";
import { isWebsiteReviewImageMime } from "@/lib/ces/modules/website-review/attachments";
import type { WebsiteReviewPageContext } from "@/lib/ces/modules/website-review/types";
import { findWorkBySource } from "@/lib/work/integration/lookup";
import type {
  ReviewWorkspaceAttachment,
  ReviewWorkspaceDetail,
  ReviewWorkspaceLocation,
} from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function resolveName(rel: AnyDoc | number | null | undefined, fallback = "—"): string {
  if (!rel) return fallback;
  if (typeof rel === "object") return String((rel as AnyDoc).name ?? fallback);
  return `#${rel}`;
}

function resolveId(rel: AnyDoc | number | null | undefined): number | null {
  if (!rel) return null;
  if (typeof rel === "number") return rel;
  return Number((rel as AnyDoc).id) || null;
}

function extractUpdateTypeLabel(doc: AnyDoc): string | null {
  const raw = String(doc.requestDetails ?? "").trim();
  const match = raw.match(/^Update type:\s*(.+)$/m);
  return match?.[1]?.trim() ?? null;
}

function extractRequestBody(doc: AnyDoc): string {
  const raw = String(doc.requestDetails ?? "").trim();
  if (!raw) return "";

  const lines = raw.split("\n");
  if (!lines[0]?.startsWith("Update type:")) return raw;

  const bodyStart = lines.findIndex((line, index) => index > 0 && line.trim() === "");
  if (bodyStart < 0) return raw;

  const bodyLines: string[] = [];
  for (let i = bodyStart + 1; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (line.startsWith("Location:") || line.startsWith("Page URL:")) break;
    bodyLines.push(line);
  }

  return bodyLines.join("\n").trim();
}

function buildLocation(doc: AnyDoc): ReviewWorkspaceLocation {
  const reviewContext = (doc.reviewContext as WebsiteReviewPageContext | null | undefined) ?? {};
  const pageContext = doc.pageContext as string | null | undefined;

  return {
    pageLabel: reviewContext.pageLabel ?? null,
    section: reviewContext.section ?? null,
    pagePath: reviewContext.pagePath ?? null,
    pageUrl: reviewContext.pageUrl ?? null,
    display: formatPageContextDisplay(reviewContext, pageContext),
  };
}

async function loadAttachments(requestId: number): Promise<ReviewWorkspaceAttachment[]> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-review-media" as any,
    where: { relatedRequest: { equals: requestId } },
    sort: "createdAt",
    limit: 20,
    depth: 0,
    overrideAccess: true,
  });

  return (result.docs as AnyDoc[]).map((doc) => {
    const id = doc.id as number;
    const mimeType = String(doc.mimeType ?? "application/octet-stream");
    return {
      id,
      filename: String(doc.originalFilename ?? doc.filename ?? "Attachment"),
      mimeType,
      filesize: Number(doc.filesize ?? 0),
      isImage: isWebsiteReviewImageMime(mimeType),
      url: `/api/admin/review-inbox/attachments/${id}`,
    };
  });
}

function resolveClientWebsite(doc: AnyDoc): string | null {
  const client = doc.client;
  if (typeof client === "object" && client !== null) {
    const url = (client as AnyDoc).companyWebsite;
    return url ? String(url) : null;
  }
  return null;
}

export async function getReviewWorkspace(
  requestId: number,
): Promise<ReviewWorkspaceDetail | null> {
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

  if (doc.experienceModule !== WEBSITE_REVIEW_EXPERIENCE_MODULE) return null;

  const clientId = resolveId(doc.client);
  if (clientId == null) return null;

  const [attachments, timeline, workLink] = await Promise.all([
    loadAttachments(requestId),
    loadWebsiteReviewTimeline(clientId, requestId, doc),
    findWorkBySource(clientId, "website-review", String(requestId)),
  ]);

  const id = doc.id as number;

  return {
    id,
    title: String(doc.requestTitle ?? "Website revision"),
    clientName: resolveName(doc.client),
    clientId,
    clientWebsiteUrl: resolveClientWebsite(doc),
    submittedBy: doc.requestedBy ? String(doc.requestedBy) : null,
    submittedByEmail: doc.requestedByEmail ? String(doc.requestedByEmail) : null,
    submittedAt: String(doc.createdAt ?? new Date().toISOString()),
    priority: String(doc.priority ?? "normal"),
    status: String(doc.status ?? "new") as ReviewWorkspaceDetail["status"],
    requestBody: extractRequestBody(doc),
    updateTypeLabel: extractUpdateTypeLabel(doc),
    location: buildLocation(doc),
    attachments,
    timeline,
    internalNotes: doc.internalNotes ? String(doc.internalNotes) : null,
    payloadAdminUrl: `/admin/collections/client-requests/${id}`,
    clientPortalUrl: `/portal/website-review/${id}`,
    clientCommandUrl: `/admin/operations/client-command/${clientId}`,
    workspaceUrl: `/admin/operations/review-inbox/${id}`,
    workEngine: workLink
      ? {
          workId: workLink.workId,
          workNumber: workLink.workNumber ?? `WK-${String(workLink.workId).padStart(6, "0")}`,
          adminUrl: `/admin/collections/work/${workLink.workId}`,
        }
      : null,
  };
}

export async function updateReviewInternalNotes(
  requestId: number,
  internalNotes: string,
): Promise<void> {
  const payload = await getPayload({ config });

  const existing = await payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-requests" as any,
    id: requestId,
    depth: 0,
    overrideAccess: true,
  });

  if ((existing as AnyDoc).experienceModule !== WEBSITE_REVIEW_EXPERIENCE_MODULE) {
    throw new Error("Not a website review request.");
  }

  await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-requests" as any,
    id: requestId,
    data: { internalNotes: internalNotes.trim() || undefined } as AnyDoc,
    overrideAccess: true,
  });
}
