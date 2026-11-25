/**
 * GET /api/public/calendar/[clientSlug]
 * Published events only. No registration checkout.
 *
 * Query:
 *   scope=schedule|upcoming (default schedule — month-navigable archive)
 *   month=YYYY-MM (optional — overlap filter for a single calendar month)
 */
import { NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";
import { listPublicCalendar } from "@/lib/calendar/server";
import { parsePublicCalendarMonthParam } from "@/lib/calendar/public-window";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  context: { params: Promise<{ clientSlug: string }> },
) {
  try {
    const { clientSlug } = await context.params;
    const slug = String(clientSlug ?? "").trim().toLowerCase();
    if (!slug) {
      return NextResponse.json({ ok: false, message: "Client required." }, { status: 400 });
    }
    const url = new URL(req.url);
    const scopeParam = url.searchParams.get("scope");
    const mode = scopeParam === "upcoming" ? "upcoming" : "schedule";
    const month = parsePublicCalendarMonthParam(url.searchParams.get("month"));

    const payload = await getPayload({ config });
    const events = await listPublicCalendar(payload, slug, { mode, month });
    return NextResponse.json({
      ok: true,
      clientSlug: slug,
      count: events.length,
      scope: month ? "month" : mode,
      month: month ? `${month.year}-${String(month.month).padStart(2, "0")}` : null,
      authority: "kxd-calendar",
      events,
    });
  } catch (err) {
    console.error("[KXD Calendar] Public list failed:", err);
    return NextResponse.json({ ok: false, message: "Unable to load calendar." }, { status: 500 });
  }
}