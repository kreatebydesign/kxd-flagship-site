/**
 * GET /api/portal/website-workspace/attachments/[id]
 * Session-scoped file delivery for Website Workspace attachments.
 */
import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { openClientReviewMedia } from "@/lib/client-review-media/serve";
import { resolveExperienceProfile } from "@/lib/ces/server";
import { isCesModuleEnabled } from "@/lib/ces/types";
import {
  decidePortalAttachmentAccess,
  decidePortalCesModuleApiAccess,
  PORTAL_ATTACHMENT_NOT_FOUND_MESSAGE,
} from "@/lib/portal/requests-files-reports";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const profile = await resolveExperienceProfile(session);
  const moduleAccess = decidePortalCesModuleApiAccess({
    moduleEnabled: isCesModuleEnabled(profile, "website-workspace"),
  });
  if (!moduleAccess.ok) {
    return NextResponse.json({ ok: false, message: "Module unavailable." }, { status: 403 });
  }

  const { id: idParam } = await params;
  const mediaId = Number.parseInt(idParam, 10);
  if (!Number.isFinite(mediaId)) {
    return NextResponse.json(
      { ok: false, message: PORTAL_ATTACHMENT_NOT_FOUND_MESSAGE },
      { status: 404 },
    );
  }

  try {
    const payload = await getPayload({ config });
    let doc: Record<string, unknown>;
    try {
      doc = (await payload.findByID({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "client-review-media" as any,
        id: mediaId,
        depth: 0,
        overrideAccess: true,
      })) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { ok: false, message: PORTAL_ATTACHMENT_NOT_FOUND_MESSAGE },
        { status: 404 },
      );
    }

    const rowClientId =
      typeof doc.client === "number"
        ? doc.client
        : (doc.client as { id?: number } | undefined)?.id;
    const ownership = decidePortalAttachmentAccess({
      mediaClientId: typeof rowClientId === "number" ? rowClientId : null,
      authorizedClientId: session.clientId,
    });
    if (!ownership.ok) {
      return NextResponse.json(
        { ok: false, message: PORTAL_ATTACHMENT_NOT_FOUND_MESSAGE },
        { status: 404 },
      );
    }

    const opened = await openClientReviewMedia(doc);

    return new NextResponse(opened.body as unknown as BodyInit, {
      headers: {
        "Content-Type": opened.mimeType,
        "Content-Disposition": `inline; filename="${opened.filename.replace(/"/g, "")}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    console.error("[KXD Portal] Workspace attachment serve failed:", err);
    return NextResponse.json(
      { ok: false, message: PORTAL_ATTACHMENT_NOT_FOUND_MESSAGE },
      { status: 404 },
    );
  }
}
