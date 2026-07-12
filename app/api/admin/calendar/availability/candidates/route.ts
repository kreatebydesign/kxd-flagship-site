import { NextResponse } from "next/server";
import { requirePayloadAdminApi } from "@/lib/admin/auth";
import { findSchedulingCandidates } from "@/lib/scheduling/availability/service";
import { isGoogleCalendarError } from "@/lib/google/calendar";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/calendar/availability/candidates
 * Read-only candidate windows from free/busy + working hours.
 */
export async function POST(req: Request) {
  const auth = await requirePayloadAdminApi();
  if (auth instanceof NextResponse) return auth;

  const body = (await req.json().catch(() => ({}))) as {
    start?: string;
    end?: string;
    durationMinutes?: number;
    calendarId?: string;
    buffers?: {
      preEventMinutes?: number;
      postEventMinutes?: number;
      minimumTransitionMinutes?: number;
      focusProtectionMinutes?: number;
    };
    limit?: number;
    stepMinutes?: number;
  };

  if (!body.start || !body.end || !body.durationMinutes) {
    return NextResponse.json(
      {
        ok: false,
        error: "start, end, and durationMinutes are required.",
      },
      { status: 400 },
    );
  }

  try {
    const result = await findSchedulingCandidates({
      start: body.start,
      end: body.end,
      durationMinutes: Number(body.durationMinutes),
      calendarId: body.calendarId,
      buffers: body.buffers,
      limit: body.limit,
      stepMinutes: body.stepMinutes,
    });

    return NextResponse.json({
      ok: true,
      candidates: result.candidates.map((c) => ({
        kind: c.kind,
        start: c.start,
        end: c.end,
        durationMinutes: c.durationMinutes,
        timeZone: c.timeZone,
        score: c.score.score,
        confidence: c.score.confidence,
        reasons: c.score.reasons,
        warnings: c.score.warnings,
        tradeoffs: c.score.tradeoffs,
        explanations: c.explanations,
      })),
      summary: {
        timeZone: result.summary.timeZone,
        workingHoursSource: result.summary.workingHours.source,
        workingWindowCount: result.summary.workingWindowCount,
        freeWindowCount: result.summary.freeWindowCount,
        freeMinutesTotal: result.summary.freeMinutesTotal,
        busyMinutesTotal: result.summary.busyMinutesTotal,
        candidateCount: result.summary.candidateCount,
        nextAvailable: result.summary.nextAvailable
          ? {
              start: result.summary.nextAvailable.start,
              end: result.summary.nextAvailable.end,
            }
          : null,
        calendarAvailabilityAssessed:
          result.summary.calendarAvailabilityAssessed,
        assessedAt: result.summary.assessedAt,
        dataFreshness: result.summary.dataFreshness,
        warnings: result.summary.warnings,
      },
      writeEnabled: false,
      phase: "26A",
    });
  } catch (err) {
    if (isGoogleCalendarError(err)) {
      return NextResponse.json(
        { ok: false, error: err.message, code: err.code },
        { status: 400 },
      );
    }
    const message =
      err instanceof Error ? err.message : "Availability query failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
