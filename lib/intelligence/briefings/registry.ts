import type { BriefingSignalSource } from "./types";

export interface BriefingSignalSourceDefinition {
  key: BriefingSignalSource;
  label: string;
  description: string;
  /** Whether this source is wired in Phase 15B */
  active: boolean;
}

/**
 * Registry of briefing signal sources.
 * Future modules register here to plug into the Executive Briefing automatically.
 */
export const BRIEFING_SIGNAL_SOURCES: BriefingSignalSourceDefinition[] = [
  {
    key: "work",
    label: "Work Engine",
    description: "Open, blocked, waiting, and completed work items.",
    active: true,
  },
  {
    key: "timeline",
    label: "Executive Timeline",
    description: "Recent relationship and delivery events.",
    active: true,
  },
  {
    key: "website-review",
    label: "Website Review",
    description: "Client revision submissions and review backlog.",
    active: true,
  },
  {
    key: "communications",
    label: "Communications",
    description: "Needs-reply threads, follow-ups, and client silence.",
    active: true,
  },
  {
    key: "deliverables",
    label: "Deliverables",
    description: "Monthly deliverables due and recently completed.",
    active: true,
  },
  {
    key: "client-requests",
    label: "Client Requests",
    description: "Open portal requests awaiting triage or action.",
    active: true,
  },
  {
    key: "projects",
    label: "Projects",
    description: "Active, stalled, and recently completed projects.",
    active: true,
  },
  {
    key: "platform",
    label: "Platform",
    description: "Operational readiness across KXD OS modules.",
    active: true,
  },
];

export function getBriefingSignalSource(
  key: BriefingSignalSource,
): BriefingSignalSourceDefinition | undefined {
  return BRIEFING_SIGNAL_SOURCES.find((source) => source.key === key);
}

export function listActiveBriefingSources(): BriefingSignalSourceDefinition[] {
  return BRIEFING_SIGNAL_SOURCES.filter((source) => source.active);
}
