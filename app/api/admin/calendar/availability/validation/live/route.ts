import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { isGoogleCalendarError } from "@/lib/google/calendar";
import {
  formatLiveValidationText,
  getLiveAvailabilitySummaries,
  runLiveAvailabilityValidation,
} from "@/lib/scheduling/availability/validation/live";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/calendar/availability/validation/live
 * Read-only live occupancy validation against connected calendar.
 * Never returns event titles, attendees, descriptions, locations, or credentials.
 */
export async function GET(req: Request) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const format = url.searchParams.get("format");
  const summariesOnly = url.searchParams.get("summaries") === "1";
  const horizonDays = Number(url.searchParams.get("horizonDays") || "7");

  try {
    if (summariesOnly) {
      const summaries = await getLiveAvailabilitySummaries();
      return NextResponse.json({
        ok: true,
        summaries: {
          today: {
            freeMinutesTotal: summaries.today.freeMinutesTotal,
            busyMinutesTotal: summaries.today.busyMinutesTotal,
            freeWindowCount: summaries.today.freeWindowCount,
            candidateCount: summaries.today.candidateCount,
            nextAvailable: summaries.today.nextAvailable
              ? {
                  start: summaries.today.nextAvailable.start,
                  end: summaries.today.nextAvailable.end,
                  durationMinutes: summaries.today.nextAvailable.durationMinutes,
                }
              : null,
            calendarAvailabilityAssessed:
              summaries.today.calendarAvailabilityAssessed,
            timeZone: summaries.today.timeZone,
            warnings: summaries.today.warnings,
          },
          tomorrow: {
            freeMinutesTotal: summaries.tomorrow.freeMinutesTotal,
            busyMinutesTotal: summaries.tomorrow.busyMinutesTotal,
            freeWindowCount: summaries.tomorrow.freeWindowCount,
            candidateCount: summaries.tomorrow.candidateCount,
            nextAvailable: summaries.tomorrow.nextAvailable
              ? {
                  start: summaries.tomorrow.nextAvailable.start,
                  end: summaries.tomorrow.nextAvailable.end,
                  durationMinutes:
                    summaries.tomorrow.nextAvailable.durationMinutes,
                }
              : null,
            calendarAvailabilityAssessed:
              summaries.tomorrow.calendarAvailabilityAssessed,
            timeZone: summaries.tomorrow.timeZone,
            warnings: summaries.tomorrow.warnings,
          },
          week: {
            freeMinutesTotal: summaries.week.freeMinutesTotal,
            busyMinutesTotal: summaries.week.busyMinutesTotal,
            freeWindowCount: summaries.week.freeWindowCount,
            candidateCount: summaries.week.candidateCount,
            nextAvailable: summaries.week.nextAvailable
              ? {
                  start: summaries.week.nextAvailable.start,
                  end: summaries.week.nextAvailable.end,
                  durationMinutes: summaries.week.nextAvailable.durationMinutes,
                }
              : null,
            calendarAvailabilityAssessed:
              summaries.week.calendarAvailabilityAssessed,
            timeZone: summaries.week.timeZone,
            warnings: summaries.week.warnings,
          },
        },
        writeEnabled: false,
        privateDataExposed: false,
        phase: "25E",
      });
    }

    const result = await runLiveAvailabilityValidation({
      horizonDays: Number.isFinite(horizonDays) ? horizonDays : 7,
    });

    if (format === "text") {
      return new NextResponse(formatLiveValidationText(result), {
        status: 200,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    return NextResponse.json({
      ok: result.calendarAvailabilityAssessed,
      result,
      writeEnabled: false,
      privateDataExposed: false,
      phase: "25E",
    });
  } catch (err) {
    if (isGoogleCalendarError(err)) {
      return NextResponse.json(
        { ok: false, error: err.message, code: err.code, writeEnabled: false },
        { status: 400 },
      );
    }
    const message =
      err instanceof Error ? err.message : "Live availability validation failed.";
    return NextResponse.json(
      { ok: false, error: message, writeEnabled: false },
      { status: 400 },
    );
  }
}
