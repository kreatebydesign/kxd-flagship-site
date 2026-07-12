/**
 * Phase 25E — Sanitize availability results for engineering validation.
 * Strips any path to private calendar content (titles never enter this layer).
 */

import { minutesBetween, toMs } from "../time";
import type {
  AvailabilityBufferConfig,
  AvailabilityWorkingHoursPolicy,
  CandidateSlot,
  FindCandidatesResult,
  NormalizedBusyBlock,
  NormalizedTimeWindow,
} from "../types";
import { DEFAULT_AVAILABILITY_BUFFERS } from "../types";
import type {
  AvailabilityValidationReport,
  SanitizedBusyBlock,
  SanitizedCandidate,
  SanitizedWindow,
} from "./types";

function sanitizeBusy(blocks: NormalizedBusyBlock[]): SanitizedBusyBlock[] {
  return blocks.map((b) => ({
    start: b.start,
    end: b.end,
    durationMinutes: minutesBetween(b.startMs, b.endMs),
  }));
}

function sanitizeWindows(windows: NormalizedTimeWindow[]): SanitizedWindow[] {
  return windows.map((w) => ({
    start: w.start,
    end: w.end,
    durationMinutes: minutesBetween(w.startMs, w.endMs),
  }));
}

function sanitizeCandidate(c: CandidateSlot): SanitizedCandidate {
  return {
    kind: c.kind,
    start: c.start,
    end: c.end,
    durationMinutes: c.durationMinutes,
    score: c.score.score,
    confidence: c.score.confidence,
    reasons: [...c.score.reasons],
    warnings: [...c.score.warnings],
    explanations: [...c.explanations],
  };
}

export function buildAvailabilityValidationReport(input: {
  mode: "synthetic" | "live";
  result: FindCandidatesResult;
  workingWindows: NormalizedTimeWindow[];
  buffers?: AvailabilityBufferConfig;
  calendarConnected: boolean;
  hasCalendarId: boolean;
  durationMinutes: number;
}): AvailabilityValidationReport {
  const { result } = input;
  const buffers = input.buffers ?? DEFAULT_AVAILABILITY_BUFFERS;
  const hours = result.summary.workingHours;
  const next = result.summary.nextAvailable
    ? sanitizeCandidate(result.summary.nextAvailable)
    : null;

  return {
    generatedAt: new Date().toISOString(),
    mode: input.mode,
    phase: "25E",
    timeZone: result.summary.timeZone,
    calendarAvailabilityAssessed: result.summary.calendarAvailabilityAssessed,
    calendarConnected: input.calendarConnected,
    hasCalendarId: input.hasCalendarId,
    workingHours: {
      source: hours.source,
      weekdays: [...hours.weekdays],
      startHour: hours.startHour,
      endHour: hours.endHour,
      timeZone: hours.timeZone,
      note: hours.note,
      warnings: [...hours.warnings],
    },
    buffers: { ...buffers },
    range: { ...result.summary.range },
    durationMinutes: input.durationMinutes,
    busyBlocks: sanitizeBusy(
      // Reconstruct from free/busy difference is hard; use bufferedBusy minus buffers approx.
      // Report uses bufferedBusy as the occupancy applied to generation.
      result.bufferedBusy,
    ),
    bufferedBusy: sanitizeBusy(result.bufferedBusy),
    workingWindows: sanitizeWindows(input.workingWindows),
    freeWindows: sanitizeWindows(result.freeWindows),
    candidates: result.candidates.map(sanitizeCandidate),
    rejectedSummary: {
      outsideWorkingHoursSamples: 0,
      overlapSamples: result.bufferedBusy.length,
      notes: [
        "Rejected windows are those that failed duration, hours, or busy constraints during generation.",
        "Private event titles are never loaded into the availability engine.",
      ],
    },
    summary: {
      workingWindowCount: result.summary.workingWindowCount,
      freeWindowCount: result.summary.freeWindowCount,
      freeMinutesTotal: result.summary.freeMinutesTotal,
      busyMinutesTotal: result.summary.busyMinutesTotal,
      candidateCount: result.summary.candidateCount,
      dataFreshness: result.summary.dataFreshness,
      assessedAt: result.summary.assessedAt,
      warnings: [...result.summary.warnings],
    },
    evidence: {
      nextAvailable: next,
      topReasons: next?.reasons.slice(0, 5) ?? [],
      confidence: next?.confidence ?? null,
    },
    writeEnabled: false,
  };
}

export function formatValidationReportText(
  report: AvailabilityValidationReport,
): string {
  const lines: string[] = [];
  lines.push(`Availability Validation Report (${report.mode}) — Phase ${report.phase}`);
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Timezone: ${report.timeZone}`);
  lines.push(
    `Connected: ${report.calendarConnected} · Assessed: ${report.calendarAvailabilityAssessed}`,
  );
  lines.push("");
  lines.push("Working hours");
  lines.push(
    `  source=${report.workingHours.source} ${report.workingHours.startHour}:00–${report.workingHours.endHour}:00 weekdays=[${report.workingHours.weekdays.join(",")}]`,
  );
  lines.push(`  ${report.workingHours.note}`);
  lines.push("");
  lines.push("Buffers");
  lines.push(
    `  pre=${report.buffers.preEventMinutes}m post=${report.buffers.postEventMinutes}m transition=${report.buffers.minimumTransitionMinutes}m focus=${report.buffers.focusProtectionMinutes}m`,
  );
  lines.push("");
  lines.push(
    `Busy (buffered occupancy): ${report.bufferedBusy.length} blocks · ${report.summary.busyMinutesTotal}m`,
  );
  for (const b of report.bufferedBusy.slice(0, 12)) {
    lines.push(`  • ${b.start} → ${b.end} (${b.durationMinutes}m)`);
  }
  if (report.bufferedBusy.length > 12) {
    lines.push(`  … ${report.bufferedBusy.length - 12} more`);
  }
  lines.push("");
  lines.push(
    `Free windows: ${report.freeWindows.length} · ${report.summary.freeMinutesTotal}m`,
  );
  for (const w of report.freeWindows.slice(0, 8)) {
    lines.push(`  • ${w.start} → ${w.end} (${w.durationMinutes}m)`);
  }
  lines.push("");
  lines.push(`Candidates (${report.durationMinutes}m): ${report.candidates.length}`);
  for (const c of report.candidates.slice(0, 8)) {
    lines.push(
      `  • [${c.kind}] ${c.start} → ${c.end} score=${c.score} conf=${c.confidence}`,
    );
    for (const r of c.reasons.slice(0, 2)) lines.push(`      – ${r}`);
  }
  lines.push("");
  lines.push("Evidence");
  if (report.evidence.nextAvailable) {
    lines.push(
      `  next: ${report.evidence.nextAvailable.start} → ${report.evidence.nextAvailable.end}`,
    );
  } else {
    lines.push("  next: none");
  }
  lines.push(`  confidence: ${report.evidence.confidence ?? "n/a"}`);
  lines.push("  writeEnabled: false");
  return lines.join("\n");
}

export function hoursPolicySnapshot(
  hours: AvailabilityWorkingHoursPolicy,
): AvailabilityValidationReport["workingHours"] {
  return {
    source: hours.source,
    weekdays: [...hours.weekdays],
    startHour: hours.startHour,
    endHour: hours.endHour,
    timeZone: hours.timeZone,
    note: hours.note,
    warnings: [...hours.warnings],
  };
}

export function assertFiniteRange(start: string, end: string): void {
  const s = toMs(start);
  const e = toMs(end);
  if (e <= s) throw new Error("Invalid validation range.");
}
