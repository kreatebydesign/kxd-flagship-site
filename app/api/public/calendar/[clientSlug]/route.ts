/**
 * GET /api/public/calendar/[clientSlug]
 * Published upcoming events only. No registration checkout.
 */
import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { listPublicCalendar } from "@/lib/calendar/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  context: { params: Promise<{ clientSlug: string }> },
) {
  try {
    const { clientSlug } = await context.params;
    const slug = String(clientSlug ?? "").trim().toLowerCase();
    if (!slug) {
      return NextResponse.json({ ok: false, message: "Client required." }, { status: 400 });
    }
    const payload = await getPayload({ config });
    const events = await listPublicCalendar(payload, slug);
    return NextResponse.json({
      ok: true,
      clientSlug: slug,
      count: events.length,
      authority: "kxd-calendar",
      events,
    });
  } catch (err) {
    console.error("[KXD Calendar] Public list failed:", err);
    return NextResponse.json({ ok: false, message: "Unable to load calendar." }, { status: 500 });
  }
}
