import type { ClientWorkspaceBundle } from "../workspace-types";
import type { MemorySignal } from "./types";

const OPEN_REQUEST = new Set(["new", "triaged", "in-progress", "waiting-on-client"]);
const ACTIVE_PROJECT = new Set(["planning", "active", "review", "waiting-on-client"]);

function recentTimelineWins(bundle: Omit<ClientWorkspaceBundle, "memory" | "actions" | "proposals" | "proposalIntelligence">): MemorySignal[] {
  const signals: MemorySignal[] = [];
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  for (const event of bundle.timelineEvents) {
    const ts = new Date(event.occurredAt).getTime();
    if (Number.isNaN(ts) || ts < thirtyDaysAgo) continue;

    const t = event.eventType.toLowerCase();
    const isWin =
      t.includes("launched") ||
      t.includes("paid") ||
      t.includes("completed") ||
      t.includes("milestone") ||
      event.category === "launch" ||
      event.category === "finance";

    if (!isWin) continue;

    signals.push({
      id: `timeline-win-${event.id}`,
      category: "win",
      severity: "low",
      title: event.title,
      detail: event.summary || event.details || "Recent positive activity on timeline.",
      source: event.sourceModule ?? "timeline",
      href: event.href ?? `/admin/operations/client-command/${bundle.clientId}?tab=timeline`,
    });
  }

  return signals.slice(0, 5);
}

export function extractClientMemorySignals(
  bundle: Omit<ClientWorkspaceBundle, "memory" | "actions" | "proposals" | "proposalIntelligence">,
): MemorySignal[] {
  const signals: MemorySignal[] = [];
  const { clientId, header, sections, communications, launchQa, currentWork } = bundle;
  const base = `/admin/operations/client-command/${clientId}`;

  if (communications.overdueFollowUps.length > 0) {
    signals.push({
      id: "comm-overdue-followups",
      category: "follow_up",
      severity: "high",
      title: `${communications.overdueFollowUps.length} overdue follow-up${communications.overdueFollowUps.length === 1 ? "" : "s"}`,
      detail: "Communications with past-due follow-up dates still open.",
      source: "communications",
      href: `${base}?tab=emails`,
    });
  }

  if (communications.needsReplyCount > 0) {
    signals.push({
      id: "comm-needs-reply",
      category: "follow_up",
      severity: "high",
      title: `${communications.needsReplyCount} communication${communications.needsReplyCount === 1 ? "" : "s"} need reply`,
      detail: "Outbound or inbound messages awaiting KXD response.",
      source: "communications",
      href: `${base}?tab=emails`,
    });
  }

  if (communications.hasStaleUnresolved) {
    signals.push({
      id: "comm-stale",
      category: "risk",
      severity: "medium",
      title: "Stale open communications",
      detail: `${communications.staleUnresolvedCount} open item(s) older than 7 days without resolution.`,
      source: "communications",
      href: `${base}?tab=emails`,
    });
  }

  const daysContact = bundle.analytics.daysSinceLastContact;
  if (daysContact != null && daysContact > 30) {
    signals.push({
      id: "stale-contact",
      category: "risk",
      severity: daysContact > 60 ? "high" : "medium",
      title: `No recent contact (${daysContact} days)`,
      detail: "Relationship may be cooling — schedule a check-in or log communication.",
      source: "relationship",
      href: `${base}?tab=emails`,
    });
  }

  const openRequests = bundle.requestDocs.filter((r) =>
    OPEN_REQUEST.has(String(r.status)),
  );
  if (openRequests.length > 0) {
    signals.push({
      id: "open-requests",
      category: "follow_up",
      severity: openRequests.length > 3 ? "high" : "medium",
      title: `${openRequests.length} open client request${openRequests.length === 1 ? "" : "s"}`,
      detail: "Active support or change requests need triage or completion.",
      source: "requests",
      href: `${base}?tab=requests`,
    });
  }

  const activeProjects = bundle.projectDocs.filter((p) =>
    ACTIVE_PROJECT.has(String(p.status)),
  );
  if (activeProjects.length > 0) {
    signals.push({
      id: "active-projects",
      category: "context",
      severity: "low",
      title: `${activeProjects.length} active project${activeProjects.length === 1 ? "" : "s"}`,
      detail: "Delivery work in progress — keep momentum and client visibility.",
      source: "projects",
      href: `${base}?tab=projects`,
    });
  }

  const launched = bundle.projectDocs.filter((p) => String(p.status) === "launched");
  for (const p of launched.slice(0, 3)) {
    signals.push({
      id: `project-launched-${p.id}`,
      category: "win",
      severity: "low",
      title: `Launched · ${String(p.projectName ?? "Project")}`,
      detail: p.liveUrl ? `Live at ${String(p.liveUrl)}` : "Project marked launched.",
      source: "projects",
      href: `/admin/collections/client-projects/${p.id}`,
    });
  }

  if (bundle.retainerDocs.length === 0 && header.status === "active") {
    signals.push({
      id: "no-retainer",
      category: "retainer",
      severity: "high",
      title: "No retainer on file",
      detail: "Active client without recurring retainer agreement — revenue stability opportunity.",
      source: "revenue",
      href: `/admin/collections/retainers/create?client=${clientId}`,
    });
  }

  const outstanding = bundle.invoices.filter((i) =>
    /overdue|open|pending/i.test(i.status),
  );
  if (outstanding.length > 0) {
    signals.push({
      id: "outstanding-invoices",
      category: "risk",
      severity: "medium",
      title: `${outstanding.length} outstanding invoice signal${outstanding.length === 1 ? "" : "s"}`,
      detail: "Payment or proposal status needs accounts follow-through.",
      source: "finance",
      href: `${base}?tab=invoices`,
    });
  }

  if (sections.revenue.growthOpportunities.length > 0) {
    for (const opp of sections.revenue.growthOpportunities.slice(0, 3)) {
      signals.push({
        id: `growth-${opp.id}`,
        category: "opportunity",
        severity: "medium",
        title: opp.title,
        detail: opp.detail ?? "Revenue growth signal from portfolio intelligence.",
        source: "revenue",
        href: opp.href ?? `${base}?tab=invoices`,
      });
    }
  }

  if (sections.sales.opportunities.length > 0) {
    for (const opp of sections.sales.opportunities.slice(0, 3)) {
      signals.push({
        id: `sales-opp-${opp.id}`,
        category: "opportunity",
        severity: "medium",
        title: opp.title,
        detail: opp.detail ?? "Sales pipeline opportunity.",
        source: "sales",
        href: opp.href ?? "/admin/sales/proposals",
      });
    }
  }

  if (launchQa.criticalBlockers > 0) {
    signals.push({
      id: "launch-blockers",
      category: "risk",
      severity: "critical",
      title: `${launchQa.criticalBlockers} launch QA blocker${launchQa.criticalBlockers === 1 ? "" : "s"}`,
      detail: launchQa.recommendation || "Resolve launch readiness issues before go-live.",
      source: "launch-qa",
      href: launchQa.href ?? `/admin/operations/launch-qa/${clientId}`,
    });
  }

  if (launchQa.openItems > 0 && launchQa.criticalBlockers === 0) {
    signals.push({
      id: "launch-open-items",
      category: "follow_up",
      severity: "medium",
      title: `${launchQa.openItems} launch QA item${launchQa.openItems === 1 ? "" : "s"} open`,
      detail: "Pre-launch checklist still has open tasks.",
      source: "launch-qa",
      href: launchQa.href ?? `/admin/operations/launch-qa/${clientId}`,
    });
  }

  if (currentWork.blockedCount > 0) {
    signals.push({
      id: "blocked-work",
      category: "risk",
      severity: "high",
      title: `${currentWork.blockedCount} blocked task${currentWork.blockedCount === 1 ? "" : "s"}`,
      detail: "Internal work is blocked — may delay client delivery.",
      source: "work",
      href: `/admin/operations/work/${clientId}`,
    });
  }

  const infraScore = bundle.domains?.infrastructureScore;
  if (infraScore != null && infraScore < 60) {
    signals.push({
      id: "low-infra-score",
      category: "risk",
      severity: "medium",
      title: `Infrastructure score ${infraScore}/100`,
      detail: "Stack health below target — review domains, SSL, and hosting.",
      source: "infrastructure",
      href: bundle.domains?.href ?? `/admin/operations/infrastructure/${clientId}`,
    });
  }

  const auditScore = sections.website.healthScore;
  if (auditScore != null && auditScore < 70) {
    signals.push({
      id: "low-audit-score",
      category: "upsell",
      severity: "medium",
      title: `Website audit score ${auditScore}`,
      detail: "Performance or SEO gaps — offer audit remediation or growth package.",
      source: "audits",
      href: `/admin/operations/audits`,
    });
  }

  if (bundle.portalUsers.length === 0) {
    signals.push({
      id: "no-portal-users",
      category: "upsell",
      severity: "low",
      title: "No portal users",
      detail: "Client portal not adopted — onboarding or portal walkthrough may help engagement.",
      source: "portal",
      href: `/admin/collections/portal-users/create?client=${clientId}`,
    });
  }

  for (const m of bundle.meetingDocs.slice(0, 2)) {
    if (m.wins) {
      signals.push({
        id: `checkin-win-${m.id}`,
        category: "win",
        severity: "low",
        title: `Check-in wins · ${String(m.summary ?? "Meeting").slice(0, 50)}`,
        detail: String(m.wins).slice(0, 240),
        source: "success-check-ins",
        href: `/admin/collections/success-check-ins/${m.id}`,
      });
    }
  }

  for (const note of bundle.noteDocs.filter((n) => n.pinned).slice(0, 3)) {
    signals.push({
      id: `note-context-${note.id}`,
      category: "context",
      severity: "low",
      title: String(note.title ?? "Pinned note"),
      detail: note.summary ? String(note.summary).slice(0, 200) : "Pinned executive context.",
      source: "executive-notes",
      href: `/admin/collections/executive-notes/${note.id}`,
    });
  }

  signals.push(...recentTimelineWins(bundle));

  for (const rec of bundle.recommendations.slice(0, 4)) {
    signals.push({
      id: `intel-rec-${rec.id}`,
      category: rec.category === "revenue" ? "opportunity" : "context",
      severity:
        rec.urgency === "critical"
          ? "critical"
          : rec.urgency === "high"
            ? "high"
            : rec.urgency === "medium"
              ? "medium"
              : "low",
      title: rec.title,
      detail: rec.reason,
      source: "intelligence",
      href: rec.href ?? base,
    });
  }

  return signals;
}
