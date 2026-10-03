import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { isCesModuleEnabled } from "@/lib/ces";
import { resolveExperienceProfile } from "@/lib/ces/server";
import { getPortalWriteSession, getPortalSession, portalPreviewReadOnlyResponse } from "@/lib/portal/session";
import { fetchMotorsportRegFeed, reconcileMotorsportRegEvents } from "@/lib/calendar/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getPortalWriteSession();
  if (!session) {
    const preview = await getPortalSession();
    if (preview?.isOperatorPreview) return portalPreviewReadOnlyResponse();
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }
  const profile = await resolveExperienceProfile(session);
  if (!isCesModuleEnabled(profile, "calendar")) {
    return NextResponse.json({ ok: false, message: "Calendar is not enabled." }, { status: 403 });
  }
  try {
    const payload = await getPayload({ config });
    const feed = await fetchMotorsportRegFeed();
    const result = await reconcileMotorsportRegEvents(payload, {
      clientId: session.clientId,
      feed,
      actor: session.email,
    });
    return NextResponse.json({ ok: true, ...result, feedCount: feed.length });
  } catch (err) {
    console.error("[KXD Calendar] Sync failed:", err);
    return NextResponse.json(
      { ok: false, message: "Could not refresh the official schedule." },
      { status: 502 },
    );
  }
}
