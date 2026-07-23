import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { formatPageContextDisplay } from "@/lib/ces/modules/website-review/context";
import { REVIEW_PAGE_UNSPECIFIED_LABEL } from "@/lib/ces/modules/website-review/page-location";
import { WEBSITE_REVIEW_EXPERIENCE_MODULE } from "@/lib/ces/modules/website-review/constants";
import { WEBSITE_WORKSPACE_EXPERIENCE_MODULE } from "@/lib/ces/modules/website-workspace/constants";
import type { WebsiteReviewPageContext } from "@/lib/ces/modules/website-review/types";
import { notesPreviewFromDetails } from "@/lib/ces/modules/website-workspace/submit";
import { processOperationalFlow } from "@/lib/operational-flow";
import { REVIEW_INBOX_OPEN_STATUSES } from "./status";
import type {
  ReviewInboxData,
  ReviewInboxExperienceModule,
  ReviewInboxItem,
  ReviewInboxRequestStatus,
} from "./types";

const REVIEW_INBOX_MODULES = [
  WEBSITE_REVIEW_EXPERIENCE_MODULE,
  WEBSITE_WORKSPACE_EXPERIENCE_MODULE,
] as const;

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

function extractNotesPreview(doc: AnyDoc): string {
  const raw = String(doc.requestDetails ?? "").trim();
  if (!raw) return "";

  const lines = raw.split("\n");
  if (!lines[0]?.startsWith("Update type:")) return raw.slice(0, 160);

  const bodyStart = lines.findIndex((line, index) => index > 0 && line.trim() === "");
  if (bodyStart < 0) return raw.slice(0, 160);

  const bodyLines: string[] = [];
  for (let i = bodyStart + 1; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (line.startsWith("Location:") || line.startsWith("Page URL:")) break;
    bodyLines.push(line);
  }

  const text = bodyLines.join("\n").trim();
  return text.length > 160 ? `${text.slice(0, 160).trim()}…` : text;
}

function mapPageLocation(doc: AnyDoc): string {
  const reviewContext = doc.reviewContext as AnyDoc | null | undefined;
  if (reviewContext?.source === "website-workspace") {
    const parts = [reviewContext.pageTitle, reviewContext.sectionTitle]
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter(Boolean);
    if (parts.length > 0) return parts.join(" · ");
  }

  return (
    formatPageContextDisplay(
      reviewContext as WebsiteReviewPageContext | null | undefined,
      doc.pageContext as string | null,
    ) || REVIEW_PAGE_UNSPECIFIED_LABEL
  );
}

async function loadAttachmentCounts(requestIds: number[]): Promise<Map<number, number>> {
  const counts = new Map<number, number>();
  if (requestIds.length === 0) return counts;

  const payload = await getPayload({ config });
  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-review-media" as any,
    where: { relatedRequest: { in: requestIds } },
    limit: 500,
    depth: 0,
    overrideAccess: true,
  });

  for (const doc of result.docs as AnyDoc[]) {
    const requestId = resolveId(doc.relatedRequest);
    if (requestId == null) continue;
    counts.set(requestId, (counts.get(requestId) ?? 0) + 1);
  }

  return counts;
}

function mapExperienceModule(value: unknown): ReviewInboxExperienceModule {
  return value === WEBSITE_WORKSPACE_EXPERIENCE_MODULE
    ? WEBSITE_WORKSPACE_EXPERIENCE_MODULE
    : WEBSITE_REVIEW_EXPERIENCE_MODULE;
}

function mapDocToItem(doc: AnyDoc, attachmentCount: number): ReviewInboxItem {
  const id = doc.id as number;
  const status = String(doc.status ?? "new") as ReviewInboxRequestStatus;
  const experienceModule = mapExperienceModule(doc.experienceModule);

  return {
    id,
    title: String(
      doc.requestTitle ??
        (experienceModule === WEBSITE_WORKSPACE_EXPERIENCE_MODULE
          ? "Website update"
          : "Website revision"),
    ),
    clientName: resolveName(doc.client),
    clientId: resolveId(doc.client),
    submittedBy: doc.requestedBy ? String(doc.requestedBy) : null,
    submittedByEmail: doc.requestedByEmail ? String(doc.requestedByEmail) : null,
    pageLocation: mapPageLocation(doc),
    priority: String(doc.priority ?? "normal"),
    attachmentCount,
    submittedAt: String(doc.createdAt ?? new Date().toISOString()),
    status,
    experienceModule,
    notesPreview:
      experienceModule === WEBSITE_WORKSPACE_EXPERIENCE_MODULE
        ? notesPreviewFromDetails(String(doc.requestDetails ?? ""))
        : extractNotesPreview(doc),
    workspaceUrl: `/admin/operations/review-inbox/${id}`,
    payloadAdminUrl: `/admin/collections/client-requests/${id}`,
  };
}

export async function getReviewInbox(): Promise<ReviewInboxData> {
  const payload = await getPayload({ config });

  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-requests" as any,
    where: { experienceModule: { in: [...REVIEW_INBOX_MODULES] } },
    sort: "-createdAt",
    limit: 100,
    depth: 1,
    overrideAccess: true,
  });

  const docs = result.docs as AnyDoc[];
  const requestIds = docs.map((doc) => doc.id as number);
  const attachmentCounts = await loadAttachmentCounts(requestIds);

  const items = docs.map((doc) =>
    mapDocToItem(doc, attachmentCounts.get(doc.id as number) ?? 0),
  );

  const newCount = items.filter((item) => item.status === "new").length;
  const activeCount = items.filter((item) => REVIEW_INBOX_OPEN_STATUSES.includes(item.status)).length;

  return { items, newCount, activeCount };
}

export async function getReviewInboxSummary(): Promise<{ newCount: number; activeCount: number }> {
  const payload = await getPayload({ config });

  const [newResult, activeResult] = await Promise.all([
    payload.count({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-requests" as any,
      where: {
        and: [
          { experienceModule: { in: [...REVIEW_INBOX_MODULES] } },
          { status: { equals: "new" } },
        ],
      },
      overrideAccess: true,
    }),
    payload.count({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-requests" as any,
      where: {
        and: [
          { experienceModule: { in: [...REVIEW_INBOX_MODULES] } },
          { status: { in: REVIEW_INBOX_OPEN_STATUSES } },
        ],
      },
      overrideAccess: true,
    }),
  ]);

  return {
    newCount: newResult.totalDocs,
    activeCount: activeResult.totalDocs,
  };
}

export async function updateReviewRequestStatus(
  requestId: number,
  status: ReviewInboxRequestStatus,
  options?: {
    actorEmail?: string;
    clientCompletionNote?: string;
  },
): Promise<{ ok: true; status: ReviewInboxRequestStatus }> {
  const payload = await getPayload({ config });

  const existing = await payload.findByID({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-requests" as any,
    id: requestId,
    depth: 0,
    overrideAccess: true,
  });

  const row = existing as AnyDoc;
  if (
    !REVIEW_INBOX_MODULES.includes(
      row.experienceModule as (typeof REVIEW_INBOX_MODULES)[number],
    )
  ) {
    throw new Error("Not a website collaboration request.");
  }

  const previousStatus = String(row.status ?? "new");
  const data: AnyDoc = { status };
  if (status === "complete") {
    data.completedDate = new Date().toISOString().slice(0, 10);
  }

  await payload.update({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-requests" as any,
    id: requestId,
    data,
    overrideAccess: true,
    context: {
      actorEmail: options?.actorEmail,
      clientCompletionNote: options?.clientCompletionNote,
    },
  });

  const clientId =
    typeof row.client === "number"
      ? row.client
      : row.client && typeof row.client === "object" && "id" in row.client
        ? Number((row.client as AnyDoc).id) || null
        : null;

  // Persist first, respond fast. Operational flow loads the full work pool and
  // must not block Complete (or any status) — that previously hung 15–70s and
  // made the controlled dropdown look like a silent no-op.
  void processOperationalFlow({
    source: "review",
    entityId: requestId,
    clientId,
    previousStatus,
    nextStatus: status,
    actorEmail: options?.actorEmail,
  }).catch((err) => {
    console.error("[KXD Review Inbox] processOperationalFlow failed:", err);
  });

  return { ok: true, status };
}
