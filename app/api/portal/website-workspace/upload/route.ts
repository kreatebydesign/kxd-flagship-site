/**
 * POST /api/portal/website-workspace/upload
 * Image upload for Website Workspace replacement media.
 */
import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { getDefaultClientReviewStorageAdapter } from "@/lib/client-review-media/storage";
import { resolveWebsiteReviewMimeType } from "@/lib/ces/modules/website-review/attachments";
import { mapReviewMediaDocToAttachment } from "@/lib/ces/modules/website-review/attachments-server";
import { WEBSITE_WORKSPACE_MAX_FILE_BYTES } from "@/lib/ces/modules/website-workspace/constants";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { ok: false, message: "Please choose an image to upload." },
        { status: 400 },
      );
    }

    if (file.size > WEBSITE_WORKSPACE_MAX_FILE_BYTES) {
      return NextResponse.json(
        { ok: false, message: "Images must be 12 MB or smaller." },
        { status: 400 },
      );
    }

    const mimeType = resolveWebsiteReviewMimeType(file.type, file.name);
    if (!mimeType.startsWith("image/")) {
      return NextResponse.json(
        { ok: false, message: "Please upload an image file." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let adapter;
    try {
      adapter = getDefaultClientReviewStorageAdapter();
    } catch (err) {
      console.error("[KXD Portal] Website Workspace upload failed:", {
        category: "storage_not_configured",
        route: "/api/portal/website-workspace/upload",
        clientId: session.clientId,
        mimeType,
        filesize: file.size,
        errorName: err instanceof Error ? err.name : null,
        errorMessage: err instanceof Error ? err.message : null,
      });
      return NextResponse.json(
        { ok: false, message: "We couldn't upload that image. Please try again." },
        { status: 500 },
      );
    }

    let stored: { key: string } | null = null;

    try {
      stored = await adapter.upload({
        clientId: session.clientId,
        buffer,
        mimeType,
        originalFilename: file.name,
      });

      const payload = await getPayload({ config });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const record = await payload.create({
        collection: "client-review-media" as any,
        data: {
          client: session.clientId,
          originalFilename: file.name,
          uploadedByEmail: session.email,
          mimeType,
          filesize: file.size,
          storageProvider: adapter.provider,
          storageKey: stored.key,
        } as any,
        overrideAccess: true,
      });

      const attachment = mapReviewMediaDocToAttachment(record as Record<string, unknown>);

      return NextResponse.json({
        ok: true,
        attachment: {
          ...attachment,
          url: `/api/portal/website-workspace/attachments/${attachment.id}`,
        },
      });
    } catch (innerErr) {
      if (stored) {
        await adapter.delete(stored.key).catch((cleanupErr) => {
          console.error("[KXD Portal] Workspace upload rollback failed:", cleanupErr);
        });
      }
      throw innerErr;
    }
  } catch (err) {
    console.error("[KXD Portal] Website Workspace upload failed:", {
      category: "unexpected",
      route: "/api/portal/website-workspace/upload",
      clientId: session.clientId,
      errorName: err instanceof Error ? err.name : null,
      errorMessage: err instanceof Error ? err.message : null,
    });
    return NextResponse.json(
      { ok: false, message: "We couldn't upload that image. Please try again." },
      { status: 500 },
    );
  }
}
