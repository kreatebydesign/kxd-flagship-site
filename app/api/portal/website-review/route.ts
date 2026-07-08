/**
 * POST /api/portal/website-review
 * CES Website Review submission — scoped to authenticated portal client.
 */
import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { formatPageContextDisplay, buildReviewContextFromDraft } from "@/lib/ces/modules/website-review/context";
import { WEBSITE_REVIEW_EXPERIENCE_MODULE } from "@/lib/ces/modules/website-review/constants";
import {
  linkAttachmentsToRequest,
  validateAttachmentIdsForClient,
} from "@/lib/ces/modules/website-review/attachments-server";
import {
  buildWebsiteReviewTitle,
  formatWebsiteReviewRequestDetails,
  WEBSITE_REVIEW_UPDATE_TYPE_MAP,
} from "@/lib/ces/modules/website-review/submit";
import type { ReviewAnchor } from "@/lib/ces/review";
import type { WebsiteReviewPageContext } from "@/lib/ces/modules/website-review/types";
import { getPortalSession } from "@/lib/portal/session";
import { spawnWorkItemFromPortalRequest } from "@/lib/work-items/spawn";
import { notifyWebsiteReviewSubmitted } from "@/lib/website-review-inbox/notify";

export const dynamic = "force-dynamic";

const UPDATE_TYPES = new Set(["content", "section", "fix", "other"]);
const PRIORITIES = new Set(["low", "normal", "high", "urgent"]);

function parseSource(value: unknown): WebsiteReviewPageContext["source"] {
  if (value === "review-url") return "review-url";
  if (value === "visual-review") return "visual-review";
  return "manual";
}

function parseReviewAnchor(raw: unknown): ReviewAnchor | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const anchor = raw as ReviewAnchor;
  if (!anchor.id || !anchor.viewport) return undefined;
  return anchor;
}

function parseReviewContext(body: Record<string, unknown>): WebsiteReviewPageContext | undefined {
  const raw = body.reviewContext;
  if (raw && typeof raw === "object") {
    const ctx = raw as WebsiteReviewPageContext;
    return {
      ...ctx,
      source: parseSource(ctx.source),
      reviewAnchor: parseReviewAnchor(ctx.reviewAnchor) ?? ctx.reviewAnchor,
    };
  }

  return buildReviewContextFromDraft({
    pageLabel: typeof body.pageLabel === "string" ? body.pageLabel : undefined,
    section: typeof body.section === "string" ? body.section : undefined,
    pagePath: typeof body.pagePath === "string" ? body.pagePath : undefined,
    pageUrl: typeof body.pageUrl === "string" ? body.pageUrl : undefined,
    source: parseSource(body.source),
    reviewAnchor: parseReviewAnchor(body.reviewAnchor),
  });
}

function parsePriority(body: Record<string, unknown>): string {
  const raw = String(body.priority ?? "normal").trim();
  return PRIORITIES.has(raw) ? raw : "normal";
}

function parseAttachmentIds(body: Record<string, unknown>): number[] {
  const raw = body.attachmentIds;
  if (!Array.isArray(raw)) return [];

  return raw
    .map((value) => Number.parseInt(String(value), 10))
    .filter((id) => Number.isFinite(id));
}

export async function POST(req: NextRequest) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;

    const updateType = String(body.updateType ?? "").trim();
    const details = String(body.details ?? "").trim();
    const legacyPageContext = String(body.pageContext ?? "").trim();
    const reviewContext = parseReviewContext(body);
    const pageContext =
      formatPageContextDisplay(reviewContext, legacyPageContext) ?? undefined;
    const attachmentIds = parseAttachmentIds(body);
    const priority = parsePriority(body);
    const requestTitleOverride =
      typeof body.requestTitle === "string" ? body.requestTitle.trim() : "";

    if (!UPDATE_TYPES.has(updateType)) {
      return NextResponse.json(
        { ok: false, message: "Please choose what you'd like updated." },
        { status: 400 },
      );
    }

    if (!details) {
      return NextResponse.json(
        { ok: false, message: "Please add a few details about the update." },
        { status: 400 },
      );
    }

    if (attachmentIds.length > 0) {
      await validateAttachmentIdsForClient(attachmentIds, session.clientId);
    }

    const payload = await getPayload({ config });
    const requestTitle =
      requestTitleOverride || buildWebsiteReviewTitle(updateType, details);
    const requestDetails = formatWebsiteReviewRequestDetails(
      updateType,
      details,
      pageContext,
      reviewContext,
    );
    const requestType = WEBSITE_REVIEW_UPDATE_TYPE_MAP[updateType] ?? "other";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record = await payload.create({
      collection: "client-requests" as any,
      data: {
        requestTitle,
        requestDetails,
        requestType,
        client: session.clientId,
        status: "new",
        priority,
        requestedBy: session.displayName,
        requestedByEmail: session.email,
        experienceModule: WEBSITE_REVIEW_EXPERIENCE_MODULE,
        pageContext: pageContext || undefined,
        reviewContext: reviewContext ?? undefined,
      } as any,
      overrideAccess: true,
    });

    const requestId = record.id as number;

    if (attachmentIds.length > 0) {
      await linkAttachmentsToRequest(attachmentIds, session.clientId, requestId);
    }

    await spawnWorkItemFromPortalRequest({
      clientId: session.clientId,
      requestId,
      requestTitle,
      requestType,
      requestDetails,
      relatedProjectId: null,
    });

    const clientDoc = await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "clients" as any,
      id: session.clientId,
      depth: 0,
      overrideAccess: true,
    });

    void notifyWebsiteReviewSubmitted({
      requestId,
      requestTitle,
      clientName: String((clientDoc as Record<string, unknown>).name ?? "Client"),
      submittedBy: session.displayName,
      submittedByEmail: session.email,
      pageLocation: pageContext ?? null,
      priority,
      notesPreview: details.length > 160 ? `${details.slice(0, 160).trim()}…` : details,
      attachmentCount: attachmentIds.length,
      origin: req.nextUrl.origin,
    });

    return NextResponse.json({ ok: true, id: requestId });
  } catch (err) {
    console.error("[KXD Portal] Website review submit failed:", err);
    const isClientError =
      err instanceof Error &&
      (err.message.includes("Attachment") || err.message.includes("Maximum"));

    const message = isClientError
      ? err.message
      : "We couldn't send your request just now. Please try again in a moment.";

    return NextResponse.json(
      { ok: false, message },
      { status: isClientError ? 400 : 500 },
    );
  }
}
