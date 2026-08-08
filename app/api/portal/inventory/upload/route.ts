/**
 * Upload inventory images into the public Payload media collection.
 */
import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { isCesModuleEnabled } from "@/lib/ces";
import { resolveExperienceProfile } from "@/lib/ces/server";
import { getPortalWriteSession } from "@/lib/portal/session";
import { mapPublicImage, resolveMediaPath, toAbsoluteMediaUrl } from "@/lib/inventory/media";
import {
  isDurablePayloadMediaUrl,
  requireDurablePayloadMedia,
} from "@/lib/media/payload-storage";
import { resolveMediaAssetUrl } from "@/lib/client-command/experience/media-url";

export const dynamic = "force-dynamic";

const MAX_BYTES = 12 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const session = await getPortalWriteSession();
  if (!session) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  const profile = await resolveExperienceProfile(session);
  if (!isCesModuleEnabled(profile, "inventory")) {
    return NextResponse.json(
      { ok: false, message: "Inventory is not enabled." },
      { status: 403 },
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { ok: false, message: "Choose an image to upload." },
        { status: 400 },
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { ok: false, message: "Images must be 12 MB or smaller." },
        { status: 400 },
      );
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { ok: false, message: "Only image uploads are supported." },
        { status: 400 },
      );
    }

    const storageReady = requireDurablePayloadMedia();
    if (!storageReady.ok) {
      return NextResponse.json({ ok: false, message: storageReady.error }, { status: 503 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const payload = await getPayload({ config });
    const created = await payload.create({
      collection: "media",
      data: {
        alt:
          (typeof formData.get("alt") === "string" &&
            String(formData.get("alt")).trim()) ||
          file.name.replace(/\.[^.]+$/, "") ||
          "Vehicle photo",
      },
      file: {
        data: buffer,
        mimetype: file.type || "image/jpeg",
        name: file.name,
        size: file.size,
      },
      overrideAccess: true,
    });

    const durableUrl =
      resolveMediaAssetUrl(created) ||
      resolveMediaPath(created, "card")?.path ||
      null;
    if (!isDurablePayloadMediaUrl(durableUrl)) {
      const createdId = Number((created as { id?: number }).id);
      if (Number.isFinite(createdId)) {
        try {
          await payload.delete({ collection: "media", id: createdId, overrideAccess: true });
        } catch {
          /* best-effort rollback */
        }
      }
      return NextResponse.json(
        { ok: false, message: "Image uploaded without durable storage. Nothing was saved." },
        { status: 500 },
      );
    }

    const resolved = resolveMediaPath(created, "card");
    const publicImage = mapPublicImage(created, "card");

    return NextResponse.json({
      ok: true,
      media: {
        id: Number((created as { id: number }).id),
        path: resolved?.path ?? null,
        url: publicImage?.url ?? (resolved ? toAbsoluteMediaUrl(resolved.path) : null),
        alt: resolved?.alt ?? "Vehicle photo",
      },
    });
  } catch (err) {
    console.error("[KXD Inventory] Upload failed:", err);
    return NextResponse.json(
      { ok: false, message: "Could not upload image." },
      { status: 500 },
    );
  }
}
