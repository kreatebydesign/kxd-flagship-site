/**
 * Phase 25B — Extension contracts for future Context / Signals / Flow / Intelligence.
 * Types only — no UI activation, no page-load calls.
 */

import type {
  SchedulingConfidence,
  SchedulingPermissionLevel,
  SchedulingPolicyDecision,
  WorkSchedulingStatus,
} from "./types";

/** Executive Context — scheduling summary slot (inactive until a later phase). */
export interface ExecutiveContextSchedulingSummary {
  workId: number;
  schedulingStatus: WorkSchedulingStatus;
  proposedStart: string | null;
  proposedEnd: string | null;
  activeScheduleLinkId: number | null;
  approvalRequired: boolean;
  permissionLevel: SchedulingPermissionLevel | null;
  /** Always false in 25B — calendar not connected. */
  calendarConnected: false;
}

/** Executive Signals — evidence shape for future schedule signals. */
export interface SchedulingSignalEvidence {
  workId: number;
  linkId: number | null;
  eventType: string;
  permissionLevel: SchedulingPermissionLevel | null;
  policyDecision: SchedulingPolicyDecision | null;
  confidence: SchedulingConfidence;
  reasons: string[];
  calendarAvailabilityAssessed: false;
}

/** Operational Flow — scheduling transition kinds (registered in flow types). */
export type SchedulingOperationalKind =
  | "schedule.proposed"
  | "schedule.approval-requested"
  | "schedule.approved"
  | "schedule.rejected"
  | "schedule.canceled"
  | "schedule.completed"
  | "schedule.conflict";

/** KXD Intelligence — evidence boundary for future scheduling insights. */
export interface SchedulingIntelligenceEvidence {
  workId: number;
  linkId: number | null;
  policyDecision: SchedulingPolicyDecision;
  permissionLevel: SchedulingPermissionLevel;
  reasons: string[];
  warnings: string[];
  confidence: SchedulingConfidence;
  /** Must remain false until Google free/busy exists. */
  calendarAvailabilityAssessed: false;
  source: "scheduling-policy";
}
