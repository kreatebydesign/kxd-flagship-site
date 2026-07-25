import type {
  StaffGuidancePrompt,
  StaffHelpRequestView,
  StaffPlanState,
  StaffPrimaryAction,
} from "@/lib/staff/types";
import type { StaffGuidanceResponse } from "@/lib/staff/guidance";

export type KxdIntelligenceContextKind =
  | "staff-home"
  | "guided-work"
  | "training"
  | "executive"
  | "operations"
  | "work"
  | "generic";

export type KxdIntelligenceComposerMode = "intelligence" | "matt";

export type KxdIntelligenceTimelineKind =
  | "employee"
  | "deterministic"
  | "ai-assisted"
  | "requires-matt"
  | "matt"
  | "system"
  | "guidance";

export type KxdIntelligenceTimelineItem = {
  id: string;
  kind: KxdIntelligenceTimelineKind;
  body: string;
  meta?: string | null;
  createdAt?: string | null;
  helpId?: number | null;
  /** Context-specific approval state (presentation only). */
  stateLabel?: string | null;
  /** Resolved assignee display name when truthfully known. */
  assignedApprover?: string | null;
};

export type KxdIntelligenceSessionConfig = {
  pagePath?: string;
  contextLabel?: string;
  contextKind?: KxdIntelligenceContextKind;
  workId?: number | null;
  clientLabel?: string | null;
  workTitle?: string | null;
  helpRequests?: StaffHelpRequestView[];
  guidancePrompts?: StaffGuidancePrompt[];
  primaryAction?: StaffPrimaryAction | null;
  planState?: StaffPlanState | null;
  canAct?: boolean;
  isPreview?: boolean;
  observation?: string | null;
  recommendedActionLabel?: string | null;
  recommendedActionHref?: string | null;
};

export type KxdIntelligenceSessionState = {
  pagePath: string;
  contextLabel: string;
  contextKind: KxdIntelligenceContextKind;
  workId: number | null;
  clientLabel: string | null;
  workTitle: string | null;
  helpRequests: StaffHelpRequestView[];
  guidancePrompts: StaffGuidancePrompt[];
  primaryAction: StaffPrimaryAction | null;
  planState: StaffPlanState | null;
  canAct: boolean;
  isPreview: boolean;
  observation: string | null;
  recommendedActionLabel: string | null;
  recommendedActionHref: string | null;
  lastGuidance: StaffGuidanceResponse | null;
  sessionMessages: KxdIntelligenceTimelineItem[];
  composerMode: KxdIntelligenceComposerMode;
  historyOpen: boolean;
};

export type KxdIntelligenceContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  session: KxdIntelligenceSessionState;
  configure: (patch: KxdIntelligenceSessionConfig) => void;
  openWith: (patch?: KxdIntelligenceSessionConfig) => void;
  setComposerMode: (mode: KxdIntelligenceComposerMode) => void;
  setLastGuidance: (guidance: StaffGuidanceResponse | null) => void;
  appendSessionMessage: (item: KxdIntelligenceTimelineItem) => void;
  upsertHelpRequest: (request: StaffHelpRequestView) => void;
  setHistoryOpen: (open: boolean) => void;
  requiresMattCount: number;
  hasAttention: boolean;
};
