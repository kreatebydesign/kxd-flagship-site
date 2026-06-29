import type { ClientWorkspaceBundle } from "../workspace-types";
import type { ClientMemoryAction, MemorySignal } from "./types";

const SEVERITY_RANK = { critical: 0, high: 1, medium: 2, low: 3 };

function actionFromSignal(
  signal: MemorySignal,
  label: string,
  category: ClientMemoryAction["category"],
): ClientMemoryAction {
  return {
    id: `action-${signal.id}`,
    label,
    reason: signal.detail,
    href: signal.href ?? `/admin/operations/client-command`,
    category,
    priority: signal.severity,
  };
}

export function buildMemoryRecommendations(
  bundle: Omit<ClientWorkspaceBundle, "memory" | "actions" | "proposals" | "proposalIntelligence">,
  signals: MemorySignal[],
): ClientMemoryAction[] {
  const actions: ClientMemoryAction[] = [];
  const base = `/admin/operations/client-command/${bundle.clientId}`;
  const email = bundle.header.primaryEmail;

  const byId = new Map(signals.map((s) => [s.id, s]));

  if (byId.has("comm-overdue-followups") || byId.has("comm-needs-reply")) {
    const sig = byId.get("comm-needs-reply") ?? byId.get("comm-overdue-followups")!;
    actions.push(actionFromSignal(sig, "Follow up on overdue communication", "communication"));
  }

  if (byId.has("stale-contact")) {
    actions.push({
      id: "action-schedule-checkin",
      label: "Schedule success check-in",
      reason: byId.get("stale-contact")!.detail,
      href: `/admin/collections/success-check-ins/create?client=${bundle.clientId}`,
      category: "relationship",
      priority: "high",
    });
  }

  if (email) {
    actions.push({
      id: "action-send-recap",
      label: "Send recap email",
      reason: "Summarize recent wins and next steps for the client.",
      href: `mailto:${email}`,
      category: "communication",
      priority: "medium",
    });
  }

  if (byId.has("no-retainer")) {
    actions.push({
      id: "action-propose-retainer",
      label: "Propose retainer",
      reason: byId.get("no-retainer")!.detail,
      href: `/admin/collections/retainers/create?client=${bundle.clientId}`,
      category: "revenue",
      priority: "high",
    });
  }

  if (byId.has("low-audit-score")) {
    actions.push({
      id: "action-audit-website",
      label: "Audit website performance",
      reason: byId.get("low-audit-score")!.detail,
      href: `/admin/operations/audits`,
      category: "growth",
      priority: "medium",
    });
  }

  if (byId.has("open-requests")) {
    actions.push({
      id: "action-review-requests",
      label: "Review open requests",
      reason: byId.get("open-requests")!.detail,
      href: `${base}?tab=requests`,
      category: "project",
      priority: "high",
    });
  }

  if (byId.has("active-projects")) {
    actions.push({
      id: "action-review-project",
      label: "Review open project",
      reason: byId.get("active-projects")!.detail,
      href: `${base}?tab=projects`,
      category: "project",
      priority: "medium",
    });
  }

  if (byId.has("launch-blockers") || byId.has("launch-open-items")) {
    const sig = byId.get("launch-blockers") ?? byId.get("launch-open-items")!;
    actions.push({
      id: "action-launch-qa",
      label: "Resolve launch QA items",
      reason: sig.detail,
      href: bundle.launchQa.href ?? `/admin/operations/launch-qa/${bundle.clientId}`,
      category: "project",
      priority: sig.severity,
    });
  }

  if (byId.has("low-infra-score")) {
    actions.push({
      id: "action-infra-review",
      label: "Review infrastructure registry",
      reason: byId.get("low-infra-score")!.detail,
      href: bundle.domains?.href ?? `/admin/operations/infrastructure/${bundle.clientId}`,
      category: "infrastructure",
      priority: "medium",
    });
  }

  if (byId.has("no-portal-users")) {
    actions.push({
      id: "action-portal-onboarding",
      label: "Offer portal onboarding",
      reason: byId.get("no-portal-users")!.detail,
      href: `/admin/collections/portal-users/create?client=${bundle.clientId}`,
      category: "relationship",
      priority: "low",
    });
  }

  const launched = bundle.projectDocs.some((p) => String(p.status) === "launched");
  if (launched) {
    actions.push({
      id: "action-request-testimonial",
      label: "Request testimonial",
      reason: "Recent launch — good moment to capture client quote or case study.",
      href: `${base}?tab=projects`,
      category: "growth",
      priority: "low",
    });
  }

  if (bundle.retainerDocs.length > 0) {
    actions.push({
      id: "action-newsletter-support",
      label: "Offer newsletter support",
      reason: "Retainer client — expand recurring content or email marketing scope.",
      href: `${base}?tab=retainers`,
      category: "revenue",
      priority: "low",
    });
  }

  for (const rec of bundle.recommendations.slice(0, 3)) {
    actions.push({
      id: `action-rec-${rec.id}`,
      label: rec.recommendedAction.slice(0, 60),
      reason: rec.reason,
      href: rec.href ?? base,
      category: rec.category === "infrastructure" ? "infrastructure" : "growth",
      priority:
        rec.urgency === "critical"
          ? "critical"
          : rec.urgency === "high"
            ? "high"
            : rec.urgency === "medium"
              ? "medium"
              : "low",
    });
  }

  const seen = new Set<string>();
  const unique = actions.filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });

  unique.sort(
    (a, b) =>
      (SEVERITY_RANK[a.priority] ?? 9) - (SEVERITY_RANK[b.priority] ?? 9),
  );

  return unique.slice(0, 10);
}
