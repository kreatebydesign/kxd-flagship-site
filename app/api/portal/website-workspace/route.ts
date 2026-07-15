/**
 * POST /api/portal/website-workspace
 * Website Workspace update request submission — scoped to authenticated portal client.
 */
import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import {
  linkAttachmentsToRequest,
  validateAttachmentIdsForClient,
} from "@/lib/ces/modules/website-review/attachments-server";
import { getWebsiteWorkspaceSection } from "@/lib/ces/modules/website-workspace/catalog";
import {
  WEBSITE_WORKSPACE_EXPERIENCE_MODULE,
  WEBSITE_WORKSPACE_MAX_ATTACHMENTS,
} from "@/lib/ces/modules/website-workspace/constants";
import {
  buildWebsiteWorkspaceTitle,
  formatWebsiteWorkspaceRequestDetails,
  hasRequestedContent,
} from "@/lib/ces/modules/website-workspace/submit";
import type {
  WebsiteWorkspaceSectionContent,
  WebsiteWorkspaceUpdateContext,
} from "@/lib/ces/modules/website-workspace/types";
import { resolveExperienceProfile } from "@/lib/ces/server";
import { isCesModuleEnabled } from "@/lib/ces/types";
import { getPortalSession } from "@/lib/portal/session";
import { spawnWorkItemFromPortalRequest } from "@/lib/work-items/spawn";
import { notifyWebsiteWorkspaceSubmitted } from "@/lib/website-review-inbox/notify-workspace";

export const dynamic = "force-dynamic";

function parseContent(raw: unknown): WebsiteWorkspaceSectionContent {
  if (!raw || typeof raw !== "object") {
    return { heading: "", body: "", cta: "", imageUrl: null, imageAlt: "" };
  }
  const value = raw as Record<string, unknown>;
  return {
    heading: typeof value.heading === "string" ? value.heading : "",
    body: typeof value.body === "string" ? value.body : "",
    cta: typeof value.cta === "string" ? value.cta : "",
    imageUrl: typeof value.imageUrl === "string" ? value.imageUrl : null,
    imageAlt: typeof value.imageAlt === "string" ? value.imageAlt : "",
  };
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
    const profile = await resolveExperienceProfile(session);
    if (!isCesModuleEnabled(profile, "website-workspace")) {
      return NextResponse.json({ ok: false, message: "Module unavailable." }, { status: 403 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const pageSlug = String(body.pageSlug ?? "").trim();
    const sectionId = String(body.sectionId ?? "").trim();
    const notes = String(body.notes ?? "").trim();
    const requested = parseContent(body.requested);
    const attachmentIds = parseAttachmentIds(body);

    const located = getWebsiteWorkspaceSection(
      profile.identity.clientSlug,
      pageSlug,
      sectionId,
    );

    if (!located) {
      return NextResponse.json(
        { ok: false, message: "That page section isn’t available." },
        { status: 400 },
      );
    }

    if (!hasRequestedContent(requested) && !notes && attachmentIds.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          message: "Add a requested change, notes, or a replacement image before submitting.",
        },
        { status: 400 },
      );
    }

    if (attachmentIds.length > 0) {
      await validateAttachmentIdsForClient(
        attachmentIds,
        session.clientId,
        WEBSITE_WORKSPACE_MAX_ATTACHMENTS,
      );
    }

    const context: WebsiteWorkspaceUpdateContext = {
      pageSlug: located.page.slug,
      pageTitle: located.page.title,
      pagePath: located.page.path,
      sectionId: located.section.id,
      sectionTitle: located.section.title,
      current: located.section.current,
      requested,
      notes,
      source: "website-workspace",
    };

    const requestTitle = buildWebsiteWorkspaceTitle(
      located.page.title,
      located.section.title,
    );
    const requestDetails = formatWebsiteWorkspaceRequestDetails(context);
    const pageContext = `${located.page.title} · ${located.section.title}`;

    const payload = await getPayload({ config });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const record = await payload.create({
      collection: "client-requests" as any,
      data: {
        requestTitle,
        requestDetails,
        requestType: "content",
        client: session.clientId,
        status: "new",
        priority: "normal",
        requestedBy: session.displayName,
        requestedByEmail: session.email,
        experienceModule: WEBSITE_WORKSPACE_EXPERIENCE_MODULE,
        pageContext,
        reviewContext: context,
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
      requestType: "content",
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

    void notifyWebsiteWorkspaceSubmitted({
      requestId,
      requestTitle,
      clientName: String((clientDoc as Record<string, unknown>).name ?? "Client"),
      submittedBy: session.displayName,
      submittedByEmail: session.email,
      pageLocation: pageContext,
      notesPreview: notes.length > 160 ? `${notes.slice(0, 160).trim()}…` : notes,
      attachmentCount: attachmentIds.length,
      origin: req.nextUrl.origin,
    });

    return NextResponse.json({ ok: true, id: requestId });
  } catch (err) {
    console.error("[KXD Portal] Website Workspace submit failed:", err);
    const isClientError =
      err instanceof Error &&
      (err.message.includes("Attachment") || err.message.includes("Maximum"));

    return NextResponse.json(
      {
        ok: false,
        message: isClientError
          ? err.message
          : "We couldn't send your request just now. Please try again in a moment.",
      },
      { status: isClientError ? 400 : 500 },
    );
  }
}
