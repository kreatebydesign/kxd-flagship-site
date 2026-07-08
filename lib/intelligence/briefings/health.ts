import type { BusinessHealthSection, BriefingInputContext } from "./types";

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function levelFromScore(score: number): BusinessHealthSection["level"] {
  if (score >= 85) return "excellent";
  if (score >= 70) return "healthy";
  if (score >= 50) return "needs-attention";
  return "critical";
}

function levelLabel(level: BusinessHealthSection["level"]): string {
  switch (level) {
    case "excellent":
      return "Excellent";
    case "healthy":
      return "Healthy";
    case "needs-attention":
      return "Needs Attention";
    case "critical":
      return "Critical";
  }
}

export function buildBusinessHealth(input: BriefingInputContext): BusinessHealthSection {
  const { work, reviewInbox, communications, intelligence } = input;
  const factors: string[] = [];
  let score = 100;

  const blocked = work.stats.blockedCount;
  const open = work.stats.openCount;
  const waiting = work.stats.waitingOnClientCount;
  const completedToday = work.stats.completedTodayCount;

  if (blocked > 0) {
    const penalty = Math.min(blocked * 12, 30);
    score -= penalty;
    factors.push(`${blocked} blocked work item${blocked === 1 ? "" : "s"}`);
  }

  if (open > 40) {
    score -= 15;
    factors.push(`Large work backlog (${open} open)`);
  } else if (open > 20) {
    score -= 8;
    factors.push(`Elevated work backlog (${open} open)`);
  }

  if (waiting > 5) {
    score -= 6;
    factors.push(`${waiting} items waiting on client`);
  }

  if (reviewInbox.newCount >= 3) {
    score -= 12;
    factors.push(`${reviewInbox.newCount} new website reviews untriaged`);
  } else if (reviewInbox.newCount > 0) {
    score -= 4;
    factors.push(`${reviewInbox.newCount} new website review${reviewInbox.newCount === 1 ? "" : "s"}`);
  }

  if (reviewInbox.activeCount > 10) {
    score -= 8;
    factors.push(`Review backlog at ${reviewInbox.activeCount} active revisions`);
  }

  if (communications.needsReplyCount >= 3) {
    score -= 10;
    factors.push(`${communications.needsReplyCount} communications need reply`);
  } else if (communications.needsReplyCount > 0) {
    score -= 4;
    factors.push(`${communications.needsReplyCount} communication${communications.needsReplyCount === 1 ? "" : "s"} need reply`);
  }

  if (communications.staleUnresolvedCount > 0) {
    score -= Math.min(communications.staleUnresolvedCount * 3, 12);
    factors.push(`${communications.staleUnresolvedCount} stale unresolved thread${communications.staleUnresolvedCount === 1 ? "" : "s"}`);
  }

  const openRequests = intelligence.requests.filter((req) =>
    ["new", "triaged", "in-progress", "waiting-on-client"].includes(String(req.status ?? "")),
  ).length;

  if (openRequests > 8) {
    score -= 6;
    factors.push(`${openRequests} open client requests`);
  }

  if (completedToday > 0) {
    score += Math.min(completedToday * 3, 8);
    factors.push(`${completedToday} work item${completedToday === 1 ? "" : "s"} completed today`);
  }

  const finalScore = clampScore(score);
  const level = levelFromScore(finalScore);

  let summary: string;
  if (factors.length === 0) {
    summary = "Operations are clear with no significant pressure signals.";
  } else if (level === "excellent" || level === "healthy") {
    summary = `Overall posture is ${levelLabel(level).toLowerCase()}. ${factors.slice(0, 2).join(" · ")}.`;
  } else {
    summary = `${levelLabel(level)} — ${factors.slice(0, 3).join(" · ")}.`;
  }

  return {
    level,
    score: finalScore,
    summary,
    factors: factors.length > 0 ? factors : ["No significant pressure signals detected."],
  };
}

export function buildRelationshipHealth(input: BriefingInputContext): import("./types").RelationshipHealthSection {
  const { intelligence, work, reviewInbox } = input;
  const signals: string[] = [];
  let score = 75;

  const activeClients = intelligence.clients.filter(
    (client) => String(client.status ?? "active") === "active",
  );

  if (activeClients.length === 0) {
    return {
      level: "stable",
      score: 70,
      summary: "No active client relationships to evaluate.",
      signals: ["Portfolio has no active clients."],
    };
  }

  const recentTimeline = intelligence.executiveTimeline.filter((event) => {
    const days = Math.floor(
      (Date.now() - new Date(String(event.occurredAt ?? event.createdAt ?? "")).getTime()) /
        86_400_000,
    );
    return days <= 14;
  });

  if (recentTimeline.length >= activeClients.length) {
    score += 10;
    signals.push("Recent timeline activity across clients");
  } else if (recentTimeline.length === 0) {
    score -= 15;
    signals.push("No executive timeline activity in 14 days");
  }

  if (reviewInbox.activeCount > 0 && reviewInbox.newCount === 0) {
    score += 5;
    signals.push("Clients actively submitting website revisions");
  }

  if (reviewInbox.newCount >= 4) {
    score -= 8;
    signals.push("Review volume increasing — monitor response cadence");
  }

  const waitingRatio =
    work.stats.openCount > 0 ? work.stats.waitingOnClientCount / work.stats.openCount : 0;

  if (waitingRatio > 0.4) {
    score -= 12;
    signals.push("High proportion of work waiting on client");
  } else if (waitingRatio < 0.15 && work.stats.openCount > 0) {
    score += 5;
    signals.push("Client responsiveness supporting delivery flow");
  }

  const recentComms = intelligence.executiveTimeline.filter((event) =>
    String(event.sourceModule ?? "").toLowerCase().includes("communication"),
  ).length;

  if (recentComms > 0) {
    score += 4;
    signals.push("Communication events recorded on timeline");
  }

  if (input.communications.needsReplyCount > 2) {
    score -= 10;
    signals.push(`${input.communications.needsReplyCount} client threads awaiting studio reply`);
  }

  const completedDeliverables = intelligence.deliverables.filter((d) => {
    const status = String(d.status ?? "");
    if (status !== "delivered" && status !== "complete") return false;
    const days = Math.floor(
      (Date.now() - new Date(String(d.updatedAt ?? d.createdAt ?? "")).getTime()) / 86_400_000,
    );
    return days <= 30;
  }).length;

  if (completedDeliverables > 0) {
    score += 5;
    signals.push(`${completedDeliverables} deliverable${completedDeliverables === 1 ? "" : "s"} completed this month`);
  }

  const finalScore = clampScore(score);
  let level: import("./types").RelationshipHealthSection["level"];
  if (finalScore >= 80) level = "strong";
  else if (finalScore >= 65) level = "stable";
  else if (finalScore >= 45) level = "cooling";
  else level = "at-risk";

  const summary =
    level === "strong"
      ? "Client relationships show healthy engagement and delivery rhythm."
      : level === "stable"
        ? "Relationships are steady with manageable engagement signals."
        : level === "cooling"
          ? "Engagement is cooling — response cadence may need attention."
          : "Relationship health is at risk — prioritize client touchpoints.";

  return {
    level,
    score: finalScore,
    summary,
    signals: signals.length > 0 ? signals : ["Insufficient relationship signals to evaluate deeply."],
  };
}

export function buildOperationalHealth(input: BriefingInputContext): import("./types").OperationalHealthSection {
  const { work, reviewInbox, intelligence } = input;
  const signals: string[] = [];
  let score = 80;

  const open = work.stats.openCount;
  const queue = work.stats.queueCount;
  const inProgress = work.stats.inProgressCount;

  if (open > 35) {
    score -= 20;
    signals.push(`Work queue depth at ${open}`);
  } else if (open > 15) {
    score -= 8;
    signals.push(`Moderate work queue (${open} open)`);
  } else if (open <= 8) {
    score += 5;
    signals.push("Work queue is manageable");
  }

  if (work.stats.blockedCount >= 2) {
    score -= 15;
    signals.push(`${work.stats.blockedCount} blocked items slowing execution`);
  }

  if (reviewInbox.activeCount > 8) {
    score -= 10;
    signals.push(`Review inbox at ${reviewInbox.activeCount} active revisions`);
  }

  if (inProgress > 0 && queue > inProgress * 2) {
    score -= 6;
    signals.push("Execution queue outpacing active progress");
  }

  const stalledProjects = intelligence.projects.filter((project) => {
    const status = String(project.status ?? "");
    if (!["planning", "active", "waiting-on-client", "review"].includes(status)) return false;
    const days = Math.floor(
      (Date.now() - new Date(String(project.updatedAt ?? project.createdAt ?? "")).getTime()) /
        86_400_000,
    );
    return days > 21;
  }).length;

  if (stalledProjects > 0) {
    score -= Math.min(stalledProjects * 5, 15);
    signals.push(`${stalledProjects} stalled project${stalledProjects === 1 ? "" : "s"}`);
  }

  if (work.stats.completedTodayCount > 0) {
    score += 4;
    signals.push(`${work.stats.completedTodayCount} completed today`);
  }

  const finalScore = clampScore(score);
  let level: import("./types").OperationalHealthSection["level"];
  if (finalScore >= 80) level = "smooth";
  else if (finalScore >= 65) level = "busy";
  else if (finalScore >= 45) level = "strained";
  else level = "overloaded";

  const summary =
    level === "smooth"
      ? "Studio operations are running smoothly."
      : level === "busy"
        ? "Operations are active but within normal capacity."
        : level === "strained"
          ? "Operational load is elevated — prioritize unblocking execution."
          : "Operations are overloaded — immediate triage recommended.";

  return {
    level,
    score: finalScore,
    summary,
    signals: signals.length > 0 ? signals : ["No significant operational pressure detected."],
  };
}
