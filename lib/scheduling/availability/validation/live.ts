/**
 * Phase 25E — Live read-only availability validation against connected calendar.
 * Occupancy only — never loads or returns event titles/attendees/credentials.
 */

import "server-only";

import { getGoogleCalendarConnectionStatus } from "@/lib/google/calendar/validation";
import { expandWorkingWindows } from "../working-windows";
import {
  findSchedulingCandidates,
  getAvailabilitySummary,
} from "../service";
import { resolveBuffers } from "../buffers";
import {
  buildAvailabilityValidationReport,
  formatValidationReportText,
} from "./report";
import type {
  LiveAvailabilityProbe,
  LiveAvailabilityValidationResult,
  SanitizedCandidate,
} from "./types";

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function sanitizeNext(
  next: NonNullable<
    Awaited<ReturnType<typeof findSchedulingCandidates>>["summary"]["nextAvailable"]
  > | null,
): SanitizedCandidate | null {
  if (!next) return null;
  return {
    kind: next.kind,
    start: next.start,
    end: next.end,
    durationMinutes: next.durationMinutes,
    score: next.score.score,
    confidence: next.score.confidence,
    reasons: [...next.score.reasons],
    warnings: [...next.score.warnings],
    explanations: [...next.explanations],
  };
}

async function probeDuration(
  label: string,
  durationMinutes: number,
  start: string,
  end: string,
  limit = 5,
): Promise<LiveAvailabilityProbe> {
  const result = await findSchedulingCandidates({
    start,
    end,
    durationMinutes,
    limit,
  });
  const candidateNotes =
    label === "next-five-60m-windows"
      ? result.candidates.map(
          (c, i) =>
            `candidate[${i}]=${c.start}→${c.end} score=${c.score.score}`,
        )
      : [];
  return {
    label,
    durationMinutes,
    nextAvailable: sanitizeNext(result.summary.nextAvailable),
    candidateCount: result.candidates.length,
    freeMinutesTotal: result.summary.freeMinutesTotal,
    busyMinutesTotal: result.summary.busyMinutesTotal,
    calendarAvailabilityAssessed: result.summary.calendarAvailabilityAssessed,
    timeZone: result.summary.timeZone,
    assessedAt: result.summary.assessedAt,
    warnings: [...result.summary.warnings, ...candidateNotes],
  };
}

async function reportForRange(
  start: Date,
  end: Date,
  durationMinutes: number,
  connected: boolean,
) {
  const result = await findSchedulingCandidates({
    start: start.toISOString(),
    end: end.toISOString(),
    durationMinutes,
    limit: 8,
  });
  const workingWindows = expandWorkingWindows(
    result.summary.range.start,
    result.summary.range.end,
    result.summary.workingHours,
  );
  return buildAvailabilityValidationReport({
    mode: "live",
    result,
    workingWindows,
    buffers: resolveBuffers(),
    calendarConnected: connected,
    hasCalendarId: connected,
    durationMinutes,
  });
}

/**
 * Permanent live validation probes against the connected read-only calendar.
 */
export async function runLiveAvailabilityValidation(opts?: {
  horizonDays?: number;
}): Promise<LiveAvailabilityValidationResult> {
  const status = getGoogleCalendarConnectionStatus();
  const horizonDays = opts?.horizonDays ?? 7;
  const now = new Date();
  const horizonEnd = addDays(now, horizonDays);
  const startIso = now.toISOString();
  const endIso = horizonEnd.toISOString();

  const probes: LiveAvailabilityProbe[] = [
    await probeDuration("next-30m", 30, startIso, endIso),
    await probeDuration("next-60m", 60, startIso, endIso),
    await probeDuration("next-90m", 90, startIso, endIso),
    await probeDuration("next-120m", 120, startIso, endIso),
    await probeDuration("next-five-60m-windows", 60, startIso, endIso, 5),
  ];

  const tz = probes.find((p) => p.timeZone)?.timeZone || "America/Los_Angeles";

  return {
    generatedAt: new Date().toISOString(),
    phase: "25E",
    mode: "live",
    calendarConnected: status.connected,
    calendarAvailabilityAssessed: probes.some(
      (p) => p.calendarAvailabilityAssessed,
    ),
    timeZone: tz,
    probes,
    reports: {
      today: await reportForRange(now, addDays(now, 1), 60, status.connected),
      tomorrow: await reportForRange(
        addDays(now, 1),
        addDays(now, 2),
        60,
        status.connected,
      ),
      week: await reportForRange(now, addDays(now, 7), 60, status.connected),
    },
    writeEnabled: false,
    privateDataExposed: false,
  };
}

/** Today / tomorrow / week occupancy summaries (no private metadata). */
export async function getLiveAvailabilitySummaries() {
  const now = new Date();
  const today = await getAvailabilitySummary({
    start: now.toISOString(),
    end: addDays(now, 1).toISOString(),
    durationMinutes: 60,
  });
  const tomorrow = await getAvailabilitySummary({
    start: addDays(now, 1).toISOString(),
    end: addDays(now, 2).toISOString(),
    durationMinutes: 60,
  });
  const week = await getAvailabilitySummary({
    start: now.toISOString(),
    end: addDays(now, 7).toISOString(),
    durationMinutes: 60,
  });
  return {
    today,
    tomorrow,
    week,
    writeEnabled: false as const,
    privateDataExposed: false as const,
  };
}

export function formatLiveValidationText(
  result: LiveAvailabilityValidationResult,
): string {
  const lines: string[] = [];
  lines.push(`Live Availability Validation — Phase ${result.phase}`);
  lines.push(`Generated: ${result.generatedAt}`);
  lines.push(`Timezone: ${result.timeZone}`);
  lines.push(
    `Connected: ${result.calendarConnected} · Assessed: ${result.calendarAvailabilityAssessed}`,
  );
  lines.push(`writeEnabled: ${result.writeEnabled}`);
  lines.push(`privateDataExposed: ${result.privateDataExposed}`);
  lines.push("");
  lines.push("Probes");
  for (const p of result.probes) {
    const next = p.nextAvailable
      ? `${p.nextAvailable.start} → ${p.nextAvailable.end} (score=${p.nextAvailable.score})`
      : "none";
    lines.push(
      `  • ${p.label}: next=${next} · candidates=${p.candidateCount} · free=${p.freeMinutesTotal}m · busy=${p.busyMinutesTotal}m`,
    );
  }
  lines.push("");
  for (const [label, report] of [
    ["Today", result.reports.today],
    ["Tomorrow", result.reports.tomorrow],
    ["Week", result.reports.week],
  ] as const) {
    if (!report) continue;
    lines.push(`── ${label} ──`);
    lines.push(formatValidationReportText(report));
    lines.push("");
  }
  return lines.join("\n");
}
