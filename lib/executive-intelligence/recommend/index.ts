/**
 * Phase 28A — Primary recommendation selection.
 * Exactly one primary recommendation. Deterministic priority tiers.
 */

import { formatClock } from "@/lib/executive-today/brief/time-model";
import {
  PORTFOLIO_CANDIDATE_TIER,
  SCHEDULE_CANDIDATE_TIER,
} from "../constants";
import type { ScheduleEvidenceInput } from "../evidence/schedule";
import type {
  EvidenceItem,
  Interpretation,
  OperatingPicture,
  PrimaryRecommendation,
} from "../types";

interface RecommendationCandidate {
  tier: number;
  recommendation: PrimaryRecommendation;
}

function formatTimeSensitivity(minutes: number | null | undefined, fallback: string): string {
  if (minutes == null) return fallback;
  return `${minutes} minutes remaining`;
}

function buildScheduleCandidates(
  evidence: EvidenceItem[],
  schedule: ScheduleEvidenceInput,
): RecommendationCandidate[] {
  const candidates: RecommendationCandidate[] = [];
  const timeZone = schedule.timeZone;

  const recovery = evidence.find((e) => e.kind === "schedule_recovery");
  if (recovery) {
    const payload = recovery.payload as {
      title?: string;
      detail?: string;
      workHref?: string | null;
    };
    candidates.push({
      tier: SCHEDULE_CANDIDATE_TIER.recovery,
      recommendation: {
        id: "rec-schedule-recovery",
        action: "Resolve calendar recovery before treating the day as confirmed",
        reasoning: payload.detail ?? "A linked calendar commitment is missing or cancelled.",
        evidenceIds: [recovery.id],
        interpretationIds: [`interpretation-${recovery.id}`],
        confidence: "high",
        urgency: "critical",
        reversibility: "moderate",
        href: payload.workHref ?? "/admin/work/scheduling",
        hrefLabel: payload.workHref ? "Open Work" : "Open Scheduling",
        timeSensitivity: "Before relying on today's schedule",
        source: "schedule",
      },
    });
  }

  const conflict = evidence.find((e) => e.kind === "schedule_conflict");
  if (conflict) {
    const payload = conflict.payload as {
      href?: string | null;
      hrefLabel?: string | null;
    };
    candidates.push({
      tier: SCHEDULE_CANDIDATE_TIER.conflict,
      recommendation: {
        id: "rec-schedule-conflict",
        action: "Decide which overlapping commitment to protect",
        reasoning: conflict.summary,
        evidenceIds: [conflict.id],
        interpretationIds: [`interpretation-${conflict.id}`],
        confidence: "high",
        urgency: "critical",
        reversibility: "easy",
        href: payload.href ?? null,
        hrefLabel: payload.hrefLabel ?? null,
        timeSensitivity: "Now — the day plan is inconsistent",
        source: "schedule",
      },
    });
  }

  const currentLinked = evidence.find((e) => e.kind === "current_linked_work");
  if (currentLinked) {
    const payload = currentLinked.payload as {
      title?: string;
      workHref?: string | null;
      minutesRemaining?: number | null;
    };
    if (payload.workHref) {
      candidates.push({
        tier: SCHEDULE_CANDIDATE_TIER.currentLinkedWork,
        recommendation: {
          id: "rec-current-linked-work",
          action: `Continue ${payload.title ?? "linked work"}`,
          reasoning: "This Work block is active now.",
          evidenceIds: [currentLinked.id],
          interpretationIds: [`interpretation-${currentLinked.id}`],
          confidence: "high",
          urgency: "high",
          reversibility: "easy",
          href: payload.workHref,
          hrefLabel: "Open Work",
          timeSensitivity: formatTimeSensitivity(payload.minutesRemaining, "In progress"),
          source: "schedule",
        },
      });
    }
  }

  const currentExternal = evidence.find((e) => e.kind === "current_external_commitment");
  if (currentExternal) {
    const payload = currentExternal.payload as {
      calendarHtmlLink?: string | null;
      minutesRemaining?: number | null;
    };
    candidates.push({
      tier: SCHEDULE_CANDIDATE_TIER.currentExternal,
      recommendation: {
        id: "rec-current-external",
        action: "Stay with the current commitment",
        reasoning: "An external calendar block is active. Protect the transition after it ends.",
        evidenceIds: [currentExternal.id],
        interpretationIds: [`interpretation-${currentExternal.id}`],
        confidence: "high",
        urgency: "medium",
        reversibility: "hard",
        href: payload.calendarHtmlLink ?? null,
        hrefLabel: payload.calendarHtmlLink ? "Open Calendar" : null,
        timeSensitivity: formatTimeSensitivity(payload.minutesRemaining, "In progress"),
        source: "schedule",
      },
    });
  }

  const upcomingSoon = evidence.find((e) => e.kind === "upcoming_commitment_soon");
  if (upcomingSoon) {
    const payload = upcomingSoon.payload as {
      nextCommitment?: string;
      nextStartsInMinutes?: number;
    };
    candidates.push({
      tier: SCHEDULE_CANDIDATE_TIER.nextSoon,
      recommendation: {
        id: "rec-upcoming-soon",
        action: `Prepare for ${payload.nextCommitment ?? "next commitment"}`,
        reasoning: "The next commitment begins soon — avoid starting deep work that cannot finish.",
        evidenceIds: [upcomingSoon.id],
        interpretationIds: [`interpretation-${upcomingSoon.id}`],
        confidence: "high",
        urgency: "high",
        reversibility: "easy",
        href: null,
        hrefLabel: null,
        timeSensitivity: `Starts in ${payload.nextStartsInMinutes ?? "?"} minutes`,
        source: "schedule",
      },
    });
  }

  const capacityOverrun = evidence.find((e) => e.kind === "capacity_overrun");
  if (capacityOverrun) {
    const payload = capacityOverrun.payload as {
      requestedWorkMinutes?: number;
      openFocusMinutes?: number;
      moveCandidate?: { title?: string; href?: string } | null;
    };
    const move = payload.moveCandidate;
    candidates.push({
      tier: SCHEDULE_CANDIDATE_TIER.capacityOverrun,
      recommendation: {
        id: "rec-capacity-overrun",
        action: move?.title ? `Move "${move.title}" out of today` : "Reduce today's planned load",
        reasoning: `${payload.requestedWorkMinutes} minutes of planned work exceed ${payload.openFocusMinutes} minutes of open focus.`,
        evidenceIds: [capacityOverrun.id],
        interpretationIds: [`interpretation-${capacityOverrun.id}`],
        confidence: "high",
        urgency: "high",
        reversibility: "moderate",
        href: move?.href ?? "/admin/work",
        hrefLabel: move ? "Open Work" : "Open Work Engine",
        timeSensitivity: "Before the day compresses further",
        source: "schedule",
      },
    });
  }

  const scheduleOverdue = evidence.find(
    (e) => e.kind === "overdue_work" && e.id.startsWith("evidence-schedule-overdue"),
  );
  if (scheduleOverdue) {
    const payload = scheduleOverdue.payload as {
      title?: string;
      href?: string;
      estimatedEffortHours?: number | null;
      largestFocusBlockMinutes?: number;
    };
    if (
      (payload.largestFocusBlockMinutes ?? 0) >= 45 ||
      payload.estimatedEffortHours == null
    ) {
      candidates.push({
        tier: SCHEDULE_CANDIDATE_TIER.overdueWithFocus,
        recommendation: {
          id: "rec-schedule-overdue",
          action: `Begin ${payload.title ?? "overdue work"}`,
          reasoning: "Overdue Work is competing with today and a usable focus block remains.",
          evidenceIds: [scheduleOverdue.id],
          interpretationIds: [`interpretation-${scheduleOverdue.id}`],
          confidence: "high",
          urgency: "high",
          reversibility: "moderate",
          href: payload.href ?? "/admin/work",
          hrefLabel: "Open Work",
          timeSensitivity: "Use the next open focus block",
          source: "schedule",
        },
      });
    }
  }

  const focusBlock = evidence.find((e) => e.kind === "focus_block_available");
  if (focusBlock) {
    const payload = focusBlock.payload as {
      largestFocusBlockMinutes?: number;
      largestFocusBlockStart?: string | null;
      plannedWork?: { title?: string; href?: string; clientName?: string | null };
    };
    const item = payload.plannedWork;
    if (item) {
      candidates.push({
        tier: SCHEDULE_CANDIDATE_TIER.focusBlockProtect,
        recommendation: {
          id: "rec-focus-block",
          action: `Protect the next focus block for ${item.title}`,
          reasoning: `A ${payload.largestFocusBlockMinutes}-minute open block is the best available window.`,
          evidenceIds: [focusBlock.id],
          interpretationIds: [`interpretation-${focusBlock.id}`],
          confidence: "high",
          urgency: "medium",
          reversibility: "easy",
          href: item.href ?? "/admin/work",
          hrefLabel: "Open Work",
          timeSensitivity: payload.largestFocusBlockStart
            ? `From ${formatClock(payload.largestFocusBlockStart, timeZone)}`
            : "Next open block",
          source: "schedule",
        },
      });
    }
  }

  const openGap = evidence.find((e) => e.kind === "open_focus_gap");
  if (openGap) {
    const payload = openGap.payload as {
      largestFocusBlockMinutes?: number;
      plannedWork?: { href?: string } | null;
    };
    candidates.push({
      tier: SCHEDULE_CANDIDATE_TIER.openGap,
      recommendation: {
        id: "rec-open-gap",
        action: "Leave this gap intentionally open — or begin one clear Work item",
        reasoning: "You are in an open focus window with no active commitment.",
        evidenceIds: [openGap.id],
        interpretationIds: [`interpretation-${openGap.id}`],
        confidence: "high",
        urgency: "low",
        reversibility: "easy",
        href: payload.plannedWork?.href ?? "/admin/work",
        hrefLabel: payload.plannedWork ? "Open Work" : "Open Work Engine",
        timeSensitivity: `${payload.largestFocusBlockMinutes ?? 0} minutes available`,
        source: "schedule",
      },
    });
  }

  if (candidates.length === 0) {
    candidates.push({
      tier: SCHEDULE_CANDIDATE_TIER.calm,
      recommendation: {
        id: "rec-schedule-calm",
        action: "Continue planned work without forcing the calendar",
        reasoning: "No elevated schedule conflict or recovery issue requires a decision right now.",
        evidenceIds: evidence
          .filter((e) => e.domain === "schedule" || e.domain === "capacity")
          .map((e) => e.id),
        interpretationIds: [],
        confidence: "medium",
        urgency: "low",
        reversibility: "easy",
        href: "/admin/work",
        hrefLabel: "Open Work Engine",
        timeSensitivity: "Steady pace",
        source: "schedule",
      },
    });
  }

  return candidates;
}

function buildPortfolioCandidates(evidence: EvidenceItem[]): RecommendationCandidate[] {
  const candidates: RecommendationCandidate[] = [];

  const reviewNew = evidence.find((e) => e.kind === "website_review_new");
  if (reviewNew) {
    const payload = reviewNew.payload as {
      title?: string;
      clientName?: string;
      workspaceUrl?: string;
    };
    candidates.push({
      tier: PORTFOLIO_CANDIDATE_TIER.websiteReviewNew,
      recommendation: {
        id: "rec-review-new",
        action: "Triage new Website Review",
        reasoning: "New submission awaiting review",
        evidenceIds: [reviewNew.id],
        interpretationIds: [`interpretation-${reviewNew.id}`],
        confidence: "high",
        urgency: "high",
        reversibility: "easy",
        href: payload.workspaceUrl ?? "/admin/operations/review-inbox",
        hrefLabel: "Open Review Inbox",
        timeSensitivity: payload.clientName ? `${payload.clientName} · ${payload.title}` : payload.title ?? "",
        source: "portfolio",
        clientName: payload.clientName ?? null,
        itemTitle: payload.title ?? null,
      },
    });
  }

  const reviewActive = evidence.find((e) => e.kind === "website_review_active");
  if (reviewActive) {
    const payload = reviewActive.payload as {
      status?: string;
      clientName?: string;
      workspaceUrl?: string;
      title?: string;
    };
    candidates.push({
      tier: PORTFOLIO_CANDIDATE_TIER.websiteReviewActive,
      recommendation: {
        id: "rec-review-active",
        action: "Continue active revision",
        reasoning: payload.status === "in-progress" ? "In progress" : "In review",
        evidenceIds: [reviewActive.id],
        interpretationIds: [`interpretation-${reviewActive.id}`],
        confidence: "high",
        urgency: "high",
        reversibility: "easy",
        href: payload.workspaceUrl ?? "/admin/operations/review-inbox",
        hrefLabel: "Open Review Inbox",
        timeSensitivity: payload.clientName ?? "",
        source: "portfolio",
        clientName: payload.clientName ?? null,
        itemTitle: payload.title ?? null,
      },
    });
  }

  const comms = evidence.find((e) => e.kind === "communication_needs_reply");
  if (comms) {
    const payload = comms.payload as {
      subject?: string;
      clientName?: string;
      href?: string;
    };
    candidates.push({
      tier: PORTFOLIO_CANDIDATE_TIER.communicationReply,
      recommendation: {
        id: "rec-comms-reply",
        action: "Reply to client communication",
        reasoning: "Needs reply",
        evidenceIds: [comms.id],
        interpretationIds: [`interpretation-${comms.id}`],
        confidence: "high",
        urgency: "high",
        reversibility: "easy",
        href: payload.href ?? null,
        hrefLabel: "Open communication",
        timeSensitivity: payload.clientName ? `${payload.clientName} · ${payload.subject}` : payload.subject ?? "",
        source: "portfolio",
        clientName: payload.clientName ?? null,
        itemTitle: payload.subject ?? null,
      },
    });
  }

  const overdue = evidence.find(
    (e) => e.kind === "overdue_work" && e.id.startsWith("evidence-work-overdue"),
  );
  if (overdue) {
    const payload = overdue.payload as {
      title?: string;
      clientName?: string;
      href?: string;
    };
    candidates.push({
      tier: PORTFOLIO_CANDIDATE_TIER.overdueWork,
      recommendation: {
        id: "rec-portfolio-overdue",
        action: "Resolve overdue work",
        reasoning: "Overdue",
        evidenceIds: [overdue.id],
        interpretationIds: [`interpretation-${overdue.id}`],
        confidence: "high",
        urgency: "high",
        reversibility: "moderate",
        href: payload.href ?? "/admin/work",
        hrefLabel: "Open Work Engine",
        timeSensitivity: payload.clientName ? `${payload.clientName} · ${payload.title}` : payload.title ?? "",
        source: "portfolio",
        clientName: payload.clientName ?? null,
        itemTitle: payload.title ?? null,
      },
    });
  }

  const highPriority = evidence.find((e) => e.kind === "high_priority_work");
  if (highPriority) {
    const payload = highPriority.payload as {
      title?: string;
      priority?: string;
      clientName?: string;
      href?: string;
    };
    candidates.push({
      tier: PORTFOLIO_CANDIDATE_TIER.highPriorityWork,
      recommendation: {
        id: "rec-high-priority-work",
        action: "Advance high-priority work",
        reasoning: payload.priority === "critical" ? "Critical priority" : "High priority",
        evidenceIds: [highPriority.id],
        interpretationIds: [`interpretation-${highPriority.id}`],
        confidence: "high",
        urgency: payload.priority === "critical" ? "critical" : "high",
        reversibility: "moderate",
        href: payload.href ?? "/admin/work",
        hrefLabel: "Open Work Engine",
        timeSensitivity: payload.clientName ? `${payload.clientName} · ${payload.title}` : payload.title ?? "",
        source: "portfolio",
        clientName: payload.clientName ?? null,
        itemTitle: payload.title ?? null,
      },
    });
  }

  const request = evidence.find((e) => e.kind === "client_request_open");
  if (request) {
    const payload = request.payload as {
      title?: string;
      status?: string;
      clientName?: string;
      href?: string;
    };
    candidates.push({
      tier: PORTFOLIO_CANDIDATE_TIER.clientRequest,
      recommendation: {
        id: "rec-client-request",
        action: "Review open client request",
        reasoning: payload.status === "new" ? "New" : "Triaged",
        evidenceIds: [request.id],
        interpretationIds: [`interpretation-${request.id}`],
        confidence: "high",
        urgency: "medium",
        reversibility: "easy",
        href: payload.href ?? null,
        hrefLabel: "Open request",
        timeSensitivity: payload.clientName ? `${payload.clientName} · ${payload.title}` : payload.title ?? "",
        source: "portfolio",
        clientName: payload.clientName ?? null,
        itemTitle: payload.title ?? null,
      },
    });
  }

  if (candidates.length === 0) {
    candidates.push({
      tier: PORTFOLIO_CANDIDATE_TIER.calm,
      recommendation: {
        id: "rec-calm",
        action: "No urgent action. Continue planned work.",
        reasoning: "No elevated executive signal requires immediate action.",
        evidenceIds: [],
        interpretationIds: [],
        confidence: "high",
        urgency: "low",
        reversibility: "easy",
        href: null,
        hrefLabel: null,
        timeSensitivity: "Steady pace",
        source: "calm",
      },
    });
  }

  return candidates;
}

export function selectPrimaryRecommendation(input: {
  evidence: EvidenceItem[];
  interpretations: Interpretation[];
  decision: OperatingPicture;
  schedule?: ScheduleEvidenceInput | null;
}): PrimaryRecommendation {
  const scheduleCandidates = input.schedule
    ? buildScheduleCandidates(input.evidence, input.schedule)
    : [];
  const portfolioCandidates = buildPortfolioCandidates(input.evidence);

  const pool = input.decision.scheduleMaterial
    ? scheduleCandidates.length > 0
      ? scheduleCandidates
      : portfolioCandidates
    : portfolioCandidates;

  const winner = [...pool].sort((a, b) => b.tier - a.tier)[0];
  return winner.recommendation;
}

export function buildExplainabilityPath(
  evidence: EvidenceItem[],
  interpretations: Interpretation[],
  decision: OperatingPicture,
  recommendation: PrimaryRecommendation,
): {
  decisionPath: Array<{
    layer: "evidence" | "interpretation" | "decision" | "recommendation";
    label: string;
    detail: string;
  }>;
  confidenceRationale: string;
} {
  const decisionPath = [
    {
      layer: "evidence" as const,
      label: "Evidence collected",
      detail: `${evidence.length} fact${evidence.length === 1 ? "" : "s"} from ${decision.scheduleMaterial ? "schedule and portfolio" : "portfolio"} sources`,
    },
    {
      layer: "interpretation" as const,
      label: "Meaning derived",
      detail: `${interpretations.length} interpretation${interpretations.length === 1 ? "" : "s"} with deterministic mapping`,
    },
    {
      layer: "decision" as const,
      label: "Operating picture",
      detail: `Posture: ${decision.posture}. Schedule material: ${decision.scheduleMaterial ? "yes" : "no"}. Confidence: ${decision.confidence}.`,
    },
    {
      layer: "recommendation" as const,
      label: "Primary recommendation",
      detail: `${recommendation.action} (${recommendation.source})`,
    },
  ];

  const confidenceRationale =
    recommendation.confidence === "high"
      ? "High confidence — evidence is direct and current."
      : recommendation.confidence === "medium"
        ? "Medium confidence — some evidence is indirect or partial."
        : "Low confidence — limited evidence available.";

  return { decisionPath, confidenceRationale };
}
