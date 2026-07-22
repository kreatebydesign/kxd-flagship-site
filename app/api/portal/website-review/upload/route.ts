/**
 * POST /api/portal/website-review/upload
 * Multipart upload for Website Review attachments.
 */
import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { deleteClientReviewMediaObject } from "@/lib/client-review-media/delete-object";
import { getDefaultClientReviewStorageAdapter } from "@/lib/client-review-media/storage";
import {
  isWebsiteReviewMimeAllowed,
  resolveWebsiteReviewMimeType,
  WEBSITE_REVIEW_MAX_FILE_BYTES,
} from "@/lib/ces/modules/website-review/attachments";
import { mapReviewMediaDocToAttachment } from "@/lib/ces/modules/website-review/attachments-server";
import { getPortalSession } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

type UploadErrorCategory =
  | "storage_not_configured"
  | "storage_upload_failed"
  | "record_create_failed"
  | "unexpected";

function categorizeUploadError(err: unknown, hadStoredObject: boolean): UploadErrorCategory {
  if (hadStoredObject) return "record_create_failed";

  const message = err instanceof Error ? err.message : String(err);
  if (
    message.includes("storage is not configured") ||
    message.includes("BLOB_") ||
    message.includes("blob credentials") ||
    message.includes("ENOENT") ||
    message.includes("/var/task/private")
  ) {
    return "storage_not_configured";
  }

  return "storage_upload_failed";
}

function logUploadFailure(context: {
  category: UploadErrorCategory | "unexpected";
  clientId?: number;
  mimeType?: string;
  filesize?: number;
  err?: unknown;
}) {
  console.error("[KXD Portal] Website review upload failed:", {
    category: context.category,
    route: "/api/portal/website-review/upload",
    clientId: context.clientId ?? null,
    mimeType: context.mimeType ?? null,
    filesize: context.filesize ?? null,
    errorName: context.err instanceof Error ? context.err.name : null,
    errorMessage: context.err instanceof Error ? context.err.message : null,
  });
}

function uploadFailureResponse() {
  return NextResponse.json(
    { ok: false, message: "We couldn't upload that file. Please try again." },
    { status: 500 },
  );
}

export async function POST(req: NextRequest) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  let mimeType: string | undefined;
  let filesize: number | undefined;

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { ok: false, message: "Please choose a file to upload." },
        { status: 400 },
      );
    }

    filesize = file.size;

    if (file.size > WEBSITE_REVIEW_MAX_FILE_BYTES) {
      return NextResponse.json(
        { ok: false, message: "Files must be 10 MB or smaller." },
        { status: 400 },
      );
    }

    mimeType = resolveWebsiteReviewMimeType(file.type, file.name);
    if (!isWebsiteReviewMimeAllowed(mimeType)) {
      return NextResponse.json(
        { ok: false, message: "That file type isn’t supported. Try an image, PDF, or document." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let adapter;
    try {
      adapter = getDefaultClientReviewStorageAdapter();
    } catch (err) {
      logUploadFailure({
        category: "storage_not_configured",
        clientId: session.clientId,
        mimeType,
        filesize,
        err,
      });
      return uploadFailureResponse();
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

      return NextResponse.json({ ok: true, attachment });
    } catch (innerErr) {
      if (stored) {
        await adapter.delete(stored.key).catch((cleanupErr) => {
          console.error("[KXD Portal] Upload rollback failed:", {
            category: "rollback_failed",
            route: "/api/portal/website-review/upload",
            clientId: session.clientId,
            errorName: cleanupErr instanceof Error ? cleanupErr.name : null,
            errorMessage: cleanupErr instanceof Error ? cleanupErr.message : null,
          });
        });
      }

      logUploadFailure({
        category: categorizeUploadError(innerErr, stored != null),
        clientId: session.clientId,
        mimeType,
        filesize,
        err: innerErr,
      });

      return uploadFailureResponse();
    }
  } catch (err) {
    logUploadFailure({
      category: "unexpected",
      clientId: session.clientId,
      mimeType,
      filesize,
      err,
    });
    return uploadFailureResponse();
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const idParam = req.nextUrl.searchParams.get("id");
  const mediaId = Number.parseInt(idParam ?? "", 10);
  if (!Number.isFinite(mediaId)) {
    return NextResponse.json({ ok: false, message: "Invalid attachment." }, { status: 400 });
  }

  try {
    const payload = await getPayload({ config });
    const doc = await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-review-media" as any,
      id: mediaId,
      depth: 0,
      overrideAccess: true,
    });

    const row = doc as Record<string, unknown>;
    const rowClientId =
      typeof row.client === "number"
        ? row.client
        : (row.client as { id?: number } | undefined)?.id;

    if (rowClientId !== session.clientId) {
      return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
    }

    const existingRequest =
      typeof row.relatedRequest === "number"
        ? row.relatedRequest
        : (row.relatedRequest as { id?: number } | undefined)?.id;

    if (existingRequest != null) {
      return NextResponse.json(
        { ok: false, message: "This attachment is already part of a revision." },
        { status: 400 },
      );
    }

    await deleteClientReviewMediaObject(row);

    await payload.delete({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-review-media" as any,
      id: mediaId,
      overrideAccess: true,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[KXD Portal] Website review attachment delete failed:", {
      category: "delete_failed",
      route: "/api/portal/website-review/upload",
      clientId: session.clientId,
      mediaId,
      errorName: err instanceof Error ? err.name : null,
      errorMessage: err instanceof Error ? err.message : null,
    });
    return NextResponse.json(
      { ok: false, message: "We couldn't remove that file." },
      { status: 500 },
    );
  }
}
