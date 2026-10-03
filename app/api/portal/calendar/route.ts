import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { isCesModuleEnabled } from "@/lib/ces";
import { resolveExperienceProfile } from "@/lib/ces/server";
import {
  getPortalSession,
  getPortalWriteSession,
  portalPreviewReadOnlyResponse,
} from "@/lib/portal/session";
import {
  createCalendarEvent,
  listCalendarEventsForClient,
} from "@/lib/calendar/server";
import type { CalendarEventInput } from "@/lib/calendar/types";

export const dynamic = "force-dynamic";

async function requireRead() {
  const session = await getPortalSession();
  if (!session) return { error: NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 }) };
  const profile = await resolveExperienceProfile(session);
  if (!isCesModuleEnabled(profile, "calendar")) {
    return { error: NextResponse.json({ ok: false, message: "Calendar is not enabled." }, { status: 403 }) };
  }
  return { session };
}

async function requireWrite() {
  const session = await getPortalWriteSession();
  if (!session) {
    const preview = await getPortalSession();
    if (preview?.isOperatorPreview) return { error: portalPreviewReadOnlyResponse() };
    return { error: NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 }) };
  }
  const profile = await resolveExperienceProfile(session);
  if (!isCesModuleEnabled(profile, "calendar")) {
    return { error: NextResponse.json({ ok: false, message: "Calendar is not enabled." }, { status: 403 }) };
  }
  return { session };
}

export async function GET() {
  const gate = await requireRead();
  if ("error" in gate) return gate.error;
  const payload = await getPayload({ config });
  const events = await listCalendarEventsForClient(payload, gate.session.clientId);
  return NextResponse.json({ ok: true, events });
}

export async function POST(req: NextRequest) {
  const gate = await requireWrite();
  if ("error" in gate) return gate.error;
  try {
    const body = (await req.json()) as CalendarEventInput;
    const payload = await getPayload({ config });
    const result = await createCalendarEvent(payload, {
      clientId: gate.session.clientId,
      data: body,
      actor: gate.session.email,
    });
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, message: result.message, issues: result.issues },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: true, event: result.event });
  } catch (err) {
    console.error("[KXD Calendar] Create failed:", err);
    return NextResponse.json({ ok: false, message: "Could not create the event." }, { status: 500 });
  }
}
