/**
 * Phase 24B — Operational Flow types.
 * Observes meaningful transitions. Does not reason or render.
 */

export type OperationalSource =
  | "work"
  | "review"
  | "training"
  | "client"
  | "finance"
  | "proposal"
  | "onboarding"
  | "calendar"
  | "crm"
  | "business-development"
  | "brand-center"
  | "knowledge"
  | "notifications"
  | "system";

export type OperationalTransitionKind =
  | "work.completed"
  | "work.started"
  | "work.waiting-on-client"
  | "work.waiting-on-kxd"
  | "work.blocked"
  | "work.unblocked"
  | "work.review"
  | "work.planned"
  | "work.plan-cleared"
  | "work.archived"
  | "work.status-changed"
  | "review.submitted"
  | "review.completed"
  | "training.milestone-completed"
  | "client.became-healthy"
  | "client.became-at-risk"
  | "invoice.paid"
  | "proposal.accepted"
  | "client.onboarded"
  | "operational.milestone";

export type OperationalAffectedSystem =
  | "executive-today"
  | "executive-context"
  | "executive-signals"
  | "morning-brief"
  | "work-engine"
  | "client-success"
  | "activity"
  | "operations-experience"
  | "calendar"
  | "finance"
  | "business-development"
  | "crm"
  | "brand-center"
  | "knowledge"
  | "notifications";

export interface OperationalFlowInput {
  kind?: OperationalTransitionKind;
  source: OperationalSource;
  entityId: string | number;
  clientId?: number | null;
  workId?: number | null;
  previousStatus?: string | null;
  nextStatus?: string | null;
  plannedForDate?: string | null;
  previousPlannedForDate?: string | null;
  actorEmail?: string | null;
  at?: string;
  /** Skip path revalidation (tests / nested calls). */
  skipRevalidate?: boolean;
}

export interface OperationalContinuation {
  workId: number | null;
  title: string | null;
  href: string | null;
  clientId: number | null;
  clientName: string | null;
  reason: string;
}

export interface OperationalFocusResolution {
  shouldRefreshFocus: boolean;
  todayEmpty: boolean;
  overdueRemaining: number;
  openCount: number;
  preferredShift: "continue-execution" | "planning" | "business-development" | "calm";
}

export interface OperationalSignalResolution {
  shouldRebalanceSignals: boolean;
  elevateReview: boolean;
  elevateCompletion: boolean;
  elevateWaiting: boolean;
}

export interface OperationalContextResolution {
  shouldRefreshContext: boolean;
  shouldRefreshWaiting: boolean;
  shouldRefreshContinuation: boolean;
  shouldRefreshAttention: boolean;
}

export interface OperationalState {
  generatedAt: string;
  transition: OperationalTransitionKind;
  source: OperationalSource;
  entityId: string;
  clientId: number | null;
  workId: number | null;
  whatChanged: string;
  whoIsAffected: {
    clientId: number | null;
    workId: number | null;
    systems: OperationalAffectedSystem[];
  };
  continuation: OperationalContinuation | null;
  focus: OperationalFocusResolution;
  signals: OperationalSignalResolution;
  context: OperationalContextResolution;
  morningBriefShouldRefresh: boolean;
  recommendationMayChange: boolean;
}

export interface OperationalFlowResult {
  ok: true;
  state: OperationalState;
  affectedSystems: OperationalAffectedSystem[];
  revalidatedPaths: string[];
}

export interface OperationalExtensionSlot {
  id:
    | "calendar"
    | "finance"
    | "crm"
    | "business-development"
    | "brand-center"
    | "knowledge"
    | "notifications";
  status: "reserved";
  note: string;
}
