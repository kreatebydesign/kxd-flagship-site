"use client";

/**
 * Compatibility adapter — Staff Home no longer mounts a permanent Intelligence rail.
 * Prefer KxdIntelligenceBriefing + global KxdIntelligenceWorkspace.
 */
import {
  KxdIntelligenceBriefing,
  useKxdIntelligenceOptional,
} from "@/components/os";
import type { StaffGuidanceResponse } from "@/lib/staff/guidance";
import type {
  StaffGuidancePrompt,
  StaffHelpRequestView,
  StaffPlanState,
  StaffPrimaryAction,
} from "@/lib/staff/types";

export interface StaffGuidancePanelProps {
  prompts: StaffGuidancePrompt[];
  lastResponse: StaffGuidanceResponse | null;
  onSelectPrompt: (promptId: string) => void;
  loading?: boolean;
  primaryAction?: StaffPrimaryAction | null;
  planState?: StaffPlanState | null;
  pagePath?: string;
  workId?: number | null;
  canAct?: boolean;
  isPreview?: boolean;
  helpRequests?: StaffHelpRequestView[];
  askHelpDefaultOpen?: boolean;
}

function observationFrom(primaryAction?: StaffPrimaryAction | null): string {
  if (!primaryAction) {
    return "Open Intelligence for guidance on today’s sequence, what’s missing, or Matt preparation.";
  }
  if (primaryAction.label === "You are caught up") {
    return "You’re caught up. Open Intelligence to wrap the day or review anything still open.";
  }
  const title = primaryAction.title?.trim() || primaryAction.label;
  const client = primaryAction.clientOrCategory?.trim();
  if (client) return `Your next priority is ${title} (${client}).`;
  return `Your next priority is ${title}.`;
}

export function StaffGuidancePanel({
  prompts,
  lastResponse,
  primaryAction = null,
  planState = null,
  pagePath = "/admin/operations/staff",
  workId = null,
  canAct = true,
  isPreview = false,
  helpRequests = [],
}: StaffGuidancePanelProps) {
  const intel = useKxdIntelligenceOptional();
  const requiresMattCount = helpRequests.filter(
    (row) => row.requiresMatt && !row.mattResponse && row.status !== "resolved",
  ).length;

  return (
    <KxdIntelligenceBriefing
      observation={observationFrom(primaryAction)}
      recommendedAction={
        primaryAction?.title?.trim() ||
        primaryAction?.label ||
        "Open Intelligence for recommended next steps"
      }
      requiresMattCount={requiresMattCount}
      onOpen={() => {
        intel?.openWith({
          pagePath,
          contextLabel: "Daily staff plan",
          contextKind: "staff-home",
          workId,
          helpRequests,
          guidancePrompts: prompts,
          primaryAction,
          planState,
          canAct,
          isPreview,
        });
        if (lastResponse) intel?.setLastGuidance(lastResponse);
      }}
    />
  );
}
