/**
 * Phase 25B — Deterministic scheduling policy evaluation.
 *
 * Evaluates whether a proposed time is *policy-allowed*.
 * Does NOT assess calendar availability. Does NOT recommend slots.
 * No AI. No free/busy. No Google.
 */

import { KXD_BUSINESS_TIMEZONE } from "@/lib/platform/timezone";
import { actorHasCapability } from "./permissions";
import type {
  SchedulingConfidence,
  SchedulingMode,
  SchedulingPermissionLevel,
  SchedulingPolicyDecision,
  SchedulingPolicyEvidence,
  SchedulingPolicyInput,
} from "./types";

/** Weekday working window in the proposal timezone (local clock). */
export const SCHEDULING_WORKING_HOURS = {
  startHour: 9,
  endHour: 17,
  weekdaysOnly: true,
} as const;

/** Durations above this (minutes) are unusual. */
export const UNUSUAL_DURATION_MINUTES = 240;

const SENSITIVE_TAG_PATTERNS = [
  /financial/i,
  /finance/i,
  /legal/i,
  /contract/i,
  /sensitive/i,
  /personal/i,
  /payroll/i,
  /tax/i,
];

function partsInZone(
  iso: string,
  timeZone: string,
): { weekday: number; hour: number; minute: number } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid datetime: ${iso}`);
  }
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  });
  const parts = fmt.formatToParts(d);
  const weekdayName = parts.find((p) => p.type === "weekday")?.value ?? "";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return { weekday: map[weekdayName] ?? d.getUTCDay(), hour, minute };
}

function isOutsideWorkingHours(
  startIso: string,
  endIso: string,
  timeZone: string,
): boolean {
  const start = partsInZone(startIso, timeZone);
  const end = partsInZone(endIso, timeZone);
  if (SCHEDULING_WORKING_HOURS.weekdaysOnly) {
    if (start.weekday === 0 || start.weekday === 6) return true;
    if (end.weekday === 0 || end.weekday === 6) return true;
  }
  const startMin = start.hour * 60 + start.minute;
  const endMin = end.hour * 60 + end.minute;
  const windowStart = SCHEDULING_WORKING_HOURS.startHour * 60;
  const windowEnd = SCHEDULING_WORKING_HOURS.endHour * 60;
  return startMin < windowStart || endMin > windowEnd || endMin <= startMin;
}

function hasSensitiveMarkers(work: SchedulingPolicyInput["work"]): string[] {
  const hits: string[] = [];
  for (const tag of work.tags) {
    if (SENSITIVE_TAG_PATTERNS.some((re) => re.test(tag))) {
      hits.push(`sensitive tag: ${tag}`);
    }
  }
  const meta = work.metadata ?? {};
  if (meta.sensitive === true || meta.schedulingSensitive === true) {
    hits.push("work metadata marks scheduling as sensitive");
  }
  if (
    typeof meta.sensitiveCategory === "string" &&
    String(meta.sensitiveCategory).length > 0
  ) {
    hits.push(`sensitive category marker: ${meta.sensitiveCategory}`);
  }
  const financialLegal =
    meta.financial === true ||
    meta.legal === true ||
    meta.matterType === "financial" ||
    meta.matterType === "legal";
  if (financialLegal) {
    hits.push("financial or legal matter indicator");
  }
  if (work.category === "operations" && meta.executiveOnly === true) {
    hits.push("executive-only operations work");
  }
  return hits;
}

function confidenceFromFlags(
  level: SchedulingPermissionLevel,
  warningCount: number,
): SchedulingConfidence {
  if (level === 3 || warningCount >= 3) return "high";
  if (warningCount >= 1) return "medium";
  return "high";
}

function blockedEvidence(
  blockingReasons: string[],
): SchedulingPolicyEvidence {
  return {
    decision: "block",
    permissionLevel: 3,
    approvalRequired: true,
    schedulingMode: "restricted",
    reasons: [],
    blockingReasons,
    warnings: [],
    confidence: "high",
    policyValid: false,
    calendarAvailabilityAssessed: false,
    calendarAvailabilityNote:
      "Calendar availability is not assessed in Phase 25B. Policy-valid ≠ available.",
  };
}

/**
 * Evaluate scheduling policy for a proposed slot.
 * Returns structured evidence. Never claims calendar availability.
 */
export function evaluateSchedulingPolicy(
  input: SchedulingPolicyInput,
): SchedulingPolicyEvidence {
  const reasons: string[] = [];
  const blockingReasons: string[] = [];
  const warnings: string[] = [];
  const tz = input.slot.timezone || KXD_BUSINESS_TIMEZONE;

  const startMs = Date.parse(input.slot.proposedStart);
  const endMs = Date.parse(input.slot.proposedEnd);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return blockedEvidence([
      "Proposed start/end must be valid ISO datetimes.",
    ]);
  }
  if (endMs <= startMs) {
    blockingReasons.push("Proposed end must be after proposed start.");
  }

  const duration =
    input.slot.durationMinutes > 0
      ? input.slot.durationMinutes
      : Math.round((endMs - startMs) / 60000);

  if (duration <= 0) {
    blockingReasons.push("Duration must be positive.");
  }

  if (blockingReasons.length > 0) {
    return blockedEvidence(blockingReasons);
  }

  // ── Restriction scan (work + slot) — before actor intent ──────────────
  let restrictionLevel: SchedulingPermissionLevel = 2;

  if (input.externalAttendees) {
    restrictionLevel = 3;
    reasons.push("External attendees require founder approval (Level 3).");
  }
  if (input.displacesProtectedTime) {
    restrictionLevel = 3;
    reasons.push("Displacement of protected time requires founder approval.");
  }
  if (input.highImpactChange) {
    restrictionLevel = 3;
    reasons.push("High-impact change requires founder approval.");
  }
  if (input.work.priority === "critical") {
    restrictionLevel = 3;
    reasons.push("Critical-priority work is restricted for scheduling.");
  }

  const sensitiveHits = hasSensitiveMarkers(input.work);
  if (sensitiveHits.length > 0) {
    restrictionLevel = 3;
    reasons.push(...sensitiveHits);
  }

  if (
    isOutsideWorkingHours(
      input.slot.proposedStart,
      input.slot.proposedEnd,
      tz,
    )
  ) {
    restrictionLevel = 3;
    reasons.push(
      `Proposed time is outside working hours (${SCHEDULING_WORKING_HOURS.startHour}:00–${SCHEDULING_WORKING_HOURS.endHour}:00 ${tz}, weekdays).`,
    );
  }

  if (duration > UNUSUAL_DURATION_MINUTES) {
    restrictionLevel = 3;
    warnings.push(
      `Duration ${duration}m exceeds unusual threshold (${UNUSUAL_DURATION_MINUTES}m).`,
    );
    reasons.push("Unusual duration requires founder approval.");
  }

  if (
    input.work.estimatedEffortHours != null &&
    input.work.estimatedEffortHours > 0
  ) {
    const budgetMinutes = input.work.estimatedEffortHours * 60;
    if (duration > budgetMinutes * 1.5) {
      restrictionLevel = 3;
      warnings.push(
        `Duration exceeds Time Budget (${input.work.estimatedEffortHours}h) by more than 50%.`,
      );
      reasons.push("Duration far exceeds Time Budget — restricted.");
    }
  }

  if (input.work.clientId != null && restrictionLevel < 3) {
    warnings.push(
      "Client-linked work — external attendees would elevate to Level 3.",
    );
  }

  const canSuggest = actorHasCapability(input.actor, "scheduling.suggest");
  const canDirect = actorHasCapability(
    input.actor,
    "scheduling.write-internal",
  );

  if (!canSuggest) {
    return blockedEvidence([
      "Actor lacks scheduling.suggest capability.",
    ]);
  }

  let decision: SchedulingPolicyDecision;
  let mode: SchedulingMode;
  let permissionLevel: SchedulingPermissionLevel;
  let approvalRequired: boolean;

  if (restrictionLevel === 3) {
    permissionLevel = 3;
    mode = "restricted";
    decision = "require-approval";
    approvalRequired = true;
    if (input.intent === "direct") {
      warnings.push(
        "Direct schedule requested but policy requires founder approval.",
      );
    }
  } else if (input.intent === "suggest" || !canDirect) {
    permissionLevel = 1;
    mode = "suggest";
    decision = "allow-suggest";
    approvalRequired = true;
    reasons.push(
      canDirect
        ? "Suggest intent — proposal only; founder approval before schedule."
        : "Actor is Level 1 (suggest only) — cannot directly schedule.",
    );
    if (input.intent === "direct" && !canDirect) {
      warnings.push(
        "Direct schedule requested but actor lacks write-internal — converted to suggest.",
      );
    }
  } else {
    permissionLevel = 2;
    mode = "direct";
    decision = "allow-direct";
    approvalRequired = false;
    reasons.push(
      "Internal work within policy constraints — Level 2 direct schedule allowed (calendar write deferred to a later phase).",
    );
  }

  return {
    decision,
    permissionLevel,
    approvalRequired,
    schedulingMode: mode,
    reasons,
    blockingReasons: [],
    warnings,
    confidence: confidenceFromFlags(permissionLevel, warnings.length),
    policyValid: true,
    calendarAvailabilityAssessed: false,
    calendarAvailabilityNote:
      "Calendar availability is not assessed in Phase 25B. Policy-valid ≠ available. Google free/busy arrives in a later phase.",
  };
}
