/**
 * Phase 23A — Executive Context Engine
 * Shared awareness layer. Composes facts — does not reason.
 */

import type { ExecutiveActivityItem } from "@/lib/activity-engine";
import type { ExecutiveSignal } from "@/lib/executive-signals";
import type { IntelligenceConfidence } from "@/lib/intelligence/types";
import type { MorningBriefPageData } from "@/lib/rituals/morning-brief";
import type { WorkListItem } from "@/lib/work/types";

export type ExecutiveContextItemKind =
  | "work"
  | "review"
  | "client"
  | "activity"
  | "training"
  | "calendar"
  | "finance"
  | "business-development"
  | "crm"
  | "notification"
  | "scheduling";

export interface ExecutiveContextRef {
  id: string;
  kind: ExecutiveContextItemKind;
  title: string;
  detail: string | null;
  href: string | null;
  clientId?: number | null;
  clientName?: string | null;
  workId?: number | null;
}

export interface ExecutiveFocusSlice {
  items: ExecutiveContextRef[];
  recommendedPriority: ExecutiveContextRef | null;
}

export interface ExecutiveContinuationSlice {
  /** Where the founder can continue — unfinished motion. */
  recommendedContinuation: ExecutiveContextRef | null;
  unfinishedWork: ExecutiveContextRef[];
  lastViewedWork: ExecutiveContextRef | null;
  recentClient: ExecutiveContextRef | null;
}

export interface ExecutiveAttentionSlice {
  items: ExecutiveContextRef[];
  /** High-signal activity since recent window. */
  whatChanged: ExecutiveContextRef[];
}

export interface ExecutiveWaitingSlice {
  waitingOnClient: ExecutiveContextRef[];
  waitingOnKxd: ExecutiveContextRef[];
  blockedItems: ExecutiveContextRef[];
  reviewsWaiting: ExecutiveContextRef[];
}

export interface ExecutiveMomentumSlice {
  postureLabel: string;
  tone: string;
  businessMomentum: "quiet" | "steady" | "elevated" | "pressured";
  quietHoursReady: boolean;
}

export interface ExecutiveSummarySlice {
  greeting: string;
  welcome: string;
  dateDisplay: string;
  timeDisplay: string;
  headline: string;
  contextSummary: string;
  confidence: IntelligenceConfidence;
}

export interface ExecutiveHistorySlice {
  recentActivity: ExecutiveActivityItem[];
  recentWorkspaceHints: string[];
  unfinishedTraining: ExecutiveContextRef | null;
  lastActivitySeen: ExecutiveContextRef | null;
}

export interface ExecutiveTrainingStatus {
  /** Architecture ready — progress wiring optional per request. */
  available: boolean;
  pathSlug: string | null;
  lessonSlug: string | null;
  note: string;
}

export interface ExecutiveExtensionSlot {
  id: "calendar" | "finance" | "business-development" | "crm" | "notifications" | "scheduling";
  status: "reserved";
  note: string;
}

/**
 * Full structured awareness snapshot for the current moment.
 */
export interface ExecutiveContext {
  generatedAt: string;
  currentFocus: ExecutiveFocusSlice;
  recommendedContinuation: ExecutiveContextRef | null;
  waitingItems: ExecutiveContextRef[];
  blockedItems: ExecutiveContextRef[];
  activeClients: ExecutiveContextRef[];
  todayWork: WorkListItem[];
  reviewsWaiting: ExecutiveContextRef[];
  trainingStatus: ExecutiveTrainingStatus;
  businessMomentum: ExecutiveMomentumSlice["businessMomentum"];
  recommendedPriority: ExecutiveContextRef | null;
  quietHoursReady: boolean;
  confidence: IntelligenceConfidence;

  /** Typed slices for focused getters. */
  focus: ExecutiveFocusSlice;
  continuation: ExecutiveContinuationSlice;
  attention: ExecutiveAttentionSlice;
  waiting: ExecutiveWaitingSlice;
  momentum: ExecutiveMomentumSlice;
  summary: ExecutiveSummarySlice;
  history: ExecutiveHistorySlice;

  /** Raw morning payload for adapters that still need Brief shapes. */
  morning: MorningBriefPageData;
  /**
   * @deprecated Prefer executiveSignals — kept for adapters still keyed on Activity items.
   */
  meaningfulActivity: ExecutiveActivityItem[];
  /** Phase 23B — scored/grouped Activity for founder attention (max 6). */
  executiveSignals: ExecutiveSignal[];
  signalsEmptyMessage: string;
  extensions: ExecutiveExtensionSlot[];
}

export interface ExecutiveContextInput {
  displayName?: string | null;
  email?: string | null;
}
