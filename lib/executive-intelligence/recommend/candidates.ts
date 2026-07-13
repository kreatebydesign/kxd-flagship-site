/**
 * Phase 28B — Candidate builders for cross-domain arbitration.
 */

import { formatClock } from "@/lib/executive-today/brief/time-model";
import type { ScheduleEvidenceInput } from "../evidence/schedule";
import type {
  DecisionClass,
  EvidenceItem,
  PrimaryRecommendation,
  RecommendationActionType,
} from "../types";

export interface RecommendationCandidate {
  decisionClass: DecisionClass;
  secondary: number;
  recommendation: Omit<PrimaryRecommendation, "fingerprint">;
}

function formatTimeSensitivity(minutes: number | null | undefined, fallback: string): string {
  if (minutes == null) return fallback;
  return `${minutes} minutes remaining`;
}

function subjectLine(clientName?: string | null, itemTitle?: string | null): string | null {
  if (clientName && itemTitle) return `${clientName} · ${itemTitle}`;
  return itemTitle ?? clientName ?? null;
}

function base(
  partial: Omit<PrimaryRecommendation, "fingerprint"> & { decisionClass: DecisionClass },
): Omit<PrimaryRecommendation, "fingerprint"> {
  return partial;
}

export function buildScheduleCandidates(
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
      decisionClass: 0,
      secondary: 100,
      recommendation: base({
        id: "rec-schedule-recovery",
        action: payload.title
          ? `Resolve calendar recovery for ${payload.title}`
          : "Resolve calendar recovery before treating the day as confirmed",
        actionType: "recover",
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
        decisionClass: 0,
        subject: payload.title ?? null,
        expectedImpact: "Restores schedule integrity so the day plan can be trusted.",
        tradeoff: "Delays other work until the broken link is confirmed or replaced.",
      }),
    });
  }

  const conflict = evidence.find((e) => e.kind === "schedule_conflict");
  if (conflict) {
    const payload = conflict.payload as {
      href?: string | null;
      hrefLabel?: string | null;
    };
    candidates.push({
      decisionClass: 0,
      secondary: 90,
      recommendation: base({
        id: "rec-schedule-conflict",
        action: "Decide which overlapping commitment to protect",
        actionType: "decide",
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
        decisionClass: 0,
        expectedImpact: "Removes an impossible plan and protects one real commitment.",
        tradeoff: "One overlapping block must yield.",
      }),
    });
  }

  const capacityOverrun = evidence.find((e) => e.kind === "capacity_overrun");
  if (capacityOverrun) {
    const payload = capacityOverrun.payload as {
      requestedWorkMinutes?: number;
      openFocusMinutes?: number;
      moveCandidate?: { title?: string; href?: string; clientName?: string | null } | null;
    };
    const move = payload.moveCandidate;
    candidates.push({
      decisionClass: 1,
      secondary: 80,
      recommendation: base({
        id: "rec-capacity-overrun",
        action: move?.title
          ? `Move "${move.title}" out of today`
          : "Reduce today's planned load",
        actionType: "reduce",
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
        decisionClass: 1,
        clientName: move?.clientName ?? null,
        itemTitle: move?.title ?? null,
        subject: subjectLine(move?.clientName, move?.title),
        expectedImpact: "Restores a realistic day and protects remaining focus.",
        tradeoff: "Planned work leaves today deliberately.",
      }),
    });
  }

  const currentLinked = evidence.find((e) => e.kind === "current_linked_work");
  if (currentLinked) {
    const payload = currentLinked.payload as {
      title?: string;
      workHref?: string | null;
      clientName?: string | null;
      minutesRemaining?: number | null;
    };
    if (payload.workHref) {
      candidates.push({
        decisionClass: 2,
        secondary: 95,
        recommendation: base({
          id: "rec-current-linked-work",
          action: payload.clientName
            ? `Continue ${payload.title ?? "linked work"} for ${payload.clientName}`
            : `Continue ${payload.title ?? "linked work"}`,
          actionType: "continue",
          reasoning: "This Work block is active now — protect the remaining time.",
          evidenceIds: [currentLinked.id],
          interpretationIds: [`interpretation-${currentLinked.id}`],
          confidence: "high",
          urgency: "high",
          reversibility: "easy",
          href: payload.workHref,
          hrefLabel: "Open Work",
          timeSensitivity: formatTimeSensitivity(payload.minutesRemaining, "In progress"),
          source: "schedule",
          decisionClass: 2,
          clientName: payload.clientName ?? null,
          itemTitle: payload.title ?? null,
          subject: subjectLine(payload.clientName, payload.title),
          expectedImpact: "Uses the active block instead of fragmenting attention.",
          tradeoff: "Other work waits until this block ends.",
        }),
      });
    }
  }

  const currentExternal = evidence.find((e) => e.kind === "current_external_commitment");
  if (currentExternal) {
    const payload = currentExternal.payload as {
      title?: string;
      calendarHtmlLink?: string | null;
      minutesRemaining?: number | null;
    };
    candidates.push({
      decisionClass: 2,
      secondary: 85,
      recommendation: base({
        id: "rec-current-external",
        action: "Stay with the current commitment",
        actionType: "continue",
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
        decisionClass: 2,
        subject: payload.title ?? null,
        expectedImpact: "Preserves presence through the commitment.",
        tradeoff: "Deep work waits for the transition.",
      }),
    });
  }

  const upcomingSoon = evidence.find((e) => e.kind === "upcoming_commitment_soon");
  if (upcomingSoon) {
    const payload = upcomingSoon.payload as {
      nextCommitment?: string;
      nextStartsInMinutes?: number;
    };
    candidates.push({
      decisionClass: 2,
      secondary: 80,
      recommendation: base({
        id: "rec-upcoming-soon",
        action: `Prepare for ${payload.nextCommitment ?? "next commitment"}`,
        actionType: "prepare",
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
        decisionClass: 2,
        subject: payload.nextCommitment ?? null,
        expectedImpact: "Arrives prepared and avoids incomplete deep work.",
        tradeoff: "Defers starting a new deep-work block.",
      }),
    });
  }

  const scheduleOverdue = evidence.find(
    (e) => e.kind === "overdue_work" && e.id.startsWith("evidence-schedule-overdue"),
  );
  if (scheduleOverdue) {
    const payload = scheduleOverdue.payload as {
      title?: string;
      href?: string;
      clientName?: string | null;
      estimatedEffortHours?: number | null;
      largestFocusBlockMinutes?: number;
    };
    if (
      (payload.largestFocusBlockMinutes ?? 0) >= 45 ||
      payload.estimatedEffortHours == null
    ) {
      candidates.push({
        decisionClass: 3,
        secondary: 70,
        recommendation: base({
          id: "rec-schedule-overdue",
          action: payload.clientName
            ? `Begin ${payload.title ?? "overdue work"} for ${payload.clientName}`
            : `Begin ${payload.title ?? "overdue work"}`,
          actionType: "begin",
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
          decisionClass: 3,
          clientName: payload.clientName ?? null,
          itemTitle: payload.title ?? null,
          subject: subjectLine(payload.clientName, payload.title),
          expectedImpact: "Clears overdue delivery risk while capacity still exists.",
          tradeoff: "Uses the best remaining focus block for recovery work.",
        }),
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
        decisionClass: 3,
        secondary: 65,
        recommendation: base({
          id: "rec-focus-block",
          action: item.clientName
            ? `Protect the next focus block for ${item.title} (${item.clientName})`
            : `Protect the next focus block for ${item.title}`,
          actionType: "protect",
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
          decisionClass: 3,
          clientName: item.clientName ?? null,
          itemTitle: item.title ?? null,
          subject: subjectLine(item.clientName, item.title),
          expectedImpact: "Converts open capacity into one completed priority.",
          tradeoff: "Other planned work waits for a later window.",
        }),
      });
    }
  }

  const openGap = evidence.find((e) => e.kind === "open_focus_gap");
  if (openGap) {
    const payload = openGap.payload as {
      largestFocusBlockMinutes?: number;
      plannedWork?: { href?: string; title?: string; clientName?: string | null } | null;
    };
    candidates.push({
      decisionClass: 5,
      secondary: 40,
      recommendation: base({
        id: "rec-open-gap",
        action: payload.plannedWork?.title
          ? `Use this open gap for ${payload.plannedWork.title} — or leave it intentional`
          : "Leave this gap intentionally open — or begin one clear Work item",
        actionType: "calm",
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
        decisionClass: 5,
        clientName: payload.plannedWork?.clientName ?? null,
        itemTitle: payload.plannedWork?.title ?? null,
        subject: subjectLine(payload.plannedWork?.clientName, payload.plannedWork?.title),
        expectedImpact: "Preserves choice without inventing urgency.",
        tradeoff: "No forced commitment — pace stays intentional.",
      }),
    });
  }

  if (candidates.length === 0) {
    candidates.push({
      decisionClass: 5,
      secondary: 10,
      recommendation: base({
        id: "rec-schedule-calm",
        action: "Continue planned work without forcing the calendar",
        actionType: "calm",
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
        decisionClass: 5,
        expectedImpact: "Maintains a healthy operating rhythm.",
        tradeoff: "No intervention — the day stays as planned.",
      }),
    });
  }

  return candidates;
}

export function buildPortfolioCandidates(evidence: EvidenceItem[]): RecommendationCandidate[] {
  const candidates: RecommendationCandidate[] = [];

  const blocked = evidence.find((e) => e.kind === "blocked_work");
  if (blocked) {
    const payload = blocked.payload as {
      title?: string;
      clientName?: string;
      href?: string;
    };
    candidates.push({
      decisionClass: 1,
      secondary: 75,
      recommendation: base({
        id: "rec-blocked-work",
        action: payload.clientName
          ? `Unblock ${payload.title ?? "work"} for ${payload.clientName}`
          : `Unblock ${payload.title ?? "blocked work"}`,
        actionType: "decide",
        reasoning: "Blocked work stops downstream delivery.",
        evidenceIds: [blocked.id],
        interpretationIds: [`interpretation-${blocked.id}`],
        confidence: "high",
        urgency: "critical",
        reversibility: "moderate",
        href: payload.href ?? "/admin/work",
        hrefLabel: "Open Work Engine",
        timeSensitivity: subjectLine(payload.clientName, payload.title) ?? "",
        source: "portfolio",
        decisionClass: 1,
        clientName: payload.clientName ?? null,
        itemTitle: payload.title ?? null,
        subject: subjectLine(payload.clientName, payload.title),
        expectedImpact: "Restores flow for dependent work.",
        tradeoff: "Other priorities wait until the blocker is cleared.",
      }),
    });
  }

  const reviewNew = evidence.find((e) => e.kind === "website_review_new");
  if (reviewNew) {
    const payload = reviewNew.payload as {
      title?: string;
      clientName?: string;
      workspaceUrl?: string;
    };
    candidates.push({
      decisionClass: 1,
      secondary: 70,
      recommendation: base({
        id: "rec-review-new",
        action: payload.clientName
          ? `Triage ${payload.clientName}'s new website review${payload.title ? ` — ${payload.title}` : ""}`
          : "Triage new Website Review",
        actionType: "triage",
        reasoning: "New submission awaiting review — client trust depends on timely response.",
        evidenceIds: [reviewNew.id],
        interpretationIds: [`interpretation-${reviewNew.id}`],
        confidence: "high",
        urgency: "high",
        reversibility: "easy",
        href: payload.workspaceUrl ?? "/admin/operations/review-inbox",
        hrefLabel: "Open Review Inbox",
        timeSensitivity: subjectLine(payload.clientName, payload.title) ?? "",
        source: "portfolio",
        decisionClass: 1,
        clientName: payload.clientName ?? null,
        itemTitle: payload.title ?? null,
        subject: subjectLine(payload.clientName, payload.title),
        expectedImpact: "Protects client response time and revision trust.",
        tradeoff: "Defers other portfolio maintenance until triage is done.",
      }),
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
      decisionClass: 2,
      secondary: 60,
      recommendation: base({
        id: "rec-review-active",
        action: payload.clientName
          ? `Continue ${payload.clientName}'s active revision${payload.title ? ` — ${payload.title}` : ""}`
          : "Continue active revision",
        actionType: "continue",
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
        decisionClass: 2,
        clientName: payload.clientName ?? null,
        itemTitle: payload.title ?? null,
        subject: subjectLine(payload.clientName, payload.title),
        expectedImpact: "Advances an open revision without restarting context.",
        tradeoff: "Other reviews wait.",
      }),
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
      decisionClass: 1,
      secondary: 65,
      recommendation: base({
        id: "rec-comms-reply",
        action: payload.clientName
          ? `Reply to ${payload.clientName}${payload.subject ? ` — ${payload.subject}` : ""}`
          : "Reply to client communication",
        actionType: "reply",
        reasoning: "Outstanding reply signals neglect and slows decisions.",
        evidenceIds: [comms.id],
        interpretationIds: [`interpretation-${comms.id}`],
        confidence: "high",
        urgency: "high",
        reversibility: "easy",
        href: payload.href ?? null,
        hrefLabel: "Open communication",
        timeSensitivity: subjectLine(payload.clientName, payload.subject) ?? "",
        source: "portfolio",
        decisionClass: 1,
        clientName: payload.clientName ?? null,
        itemTitle: payload.subject ?? null,
        subject: subjectLine(payload.clientName, payload.subject),
        expectedImpact: "Restores relationship momentum.",
        tradeoff: "Brief interruption to delivery work.",
      }),
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
      decisionClass: 4,
      secondary: 55,
      recommendation: base({
        id: "rec-portfolio-overdue",
        action: payload.clientName
          ? `Resolve overdue work — ${payload.title ?? "item"} (${payload.clientName})`
          : `Resolve overdue work — ${payload.title ?? "item"}`,
        actionType: "begin",
        reasoning: "Overdue",
        evidenceIds: [overdue.id],
        interpretationIds: [`interpretation-${overdue.id}`],
        confidence: "high",
        urgency: "high",
        reversibility: "moderate",
        href: payload.href ?? "/admin/work",
        hrefLabel: "Open Work Engine",
        timeSensitivity: subjectLine(payload.clientName, payload.title) ?? "",
        source: "portfolio",
        decisionClass: 4,
        clientName: payload.clientName ?? null,
        itemTitle: payload.title ?? null,
        subject: subjectLine(payload.clientName, payload.title),
        expectedImpact: "Clears delivery risk.",
        tradeoff: "Uses focus that could go to newer work.",
      }),
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
      decisionClass: 4,
      secondary: 50,
      recommendation: base({
        id: "rec-high-priority-work",
        action: payload.clientName
          ? `Advance ${payload.title ?? "high-priority work"} for ${payload.clientName}`
          : `Advance ${payload.title ?? "high-priority work"}`,
        actionType: "begin",
        reasoning: payload.priority === "critical" ? "Critical priority" : "High priority",
        evidenceIds: [highPriority.id],
        interpretationIds: [`interpretation-${highPriority.id}`],
        confidence: "high",
        urgency: payload.priority === "critical" ? "critical" : "high",
        reversibility: "moderate",
        href: payload.href ?? "/admin/work",
        hrefLabel: "Open Work Engine",
        timeSensitivity: subjectLine(payload.clientName, payload.title) ?? "",
        source: "portfolio",
        decisionClass: 4,
        clientName: payload.clientName ?? null,
        itemTitle: payload.title ?? null,
        subject: subjectLine(payload.clientName, payload.title),
        expectedImpact: "Moves the highest-value open Work forward.",
        tradeoff: "Lower-priority items wait.",
      }),
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
      decisionClass: 4,
      secondary: 40,
      recommendation: base({
        id: "rec-client-request",
        action: payload.clientName
          ? `Review ${payload.clientName}'s request — ${payload.title ?? "open request"}`
          : "Review open client request",
        actionType: "review",
        reasoning: payload.status === "new" ? "New" : "Triaged",
        evidenceIds: [request.id],
        interpretationIds: [`interpretation-${request.id}`],
        confidence: "high",
        urgency: "medium",
        reversibility: "easy",
        href: payload.href ?? null,
        hrefLabel: "Open request",
        timeSensitivity: subjectLine(payload.clientName, payload.title) ?? "",
        source: "portfolio",
        decisionClass: 4,
        clientName: payload.clientName ?? null,
        itemTitle: payload.title ?? null,
        subject: subjectLine(payload.clientName, payload.title),
        expectedImpact: "Keeps client requests from aging.",
        tradeoff: "Brief portfolio maintenance over deep work.",
      }),
    });
  }

  if (candidates.length === 0) {
    candidates.push({
      decisionClass: 5,
      secondary: 5,
      recommendation: base({
        id: "rec-calm",
        action: "No urgent action. Continue planned work.",
        actionType: "calm",
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
        decisionClass: 5,
        expectedImpact: "Preserves calm operating rhythm.",
        tradeoff: "No intervention required.",
      }),
    });
  }

  return candidates;
}
