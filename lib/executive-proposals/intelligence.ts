import "server-only";

import type { ProposalIntelligenceSnapshot, ProposalIntelligenceSignal } from "./types";
import type { WorkspaceProposalsSnapshot } from "./types";
import { needsProposalFollowUp } from "./lifecycle";

/**
 * Deterministic proposal intelligence — future-ready for KXD Brain / LLM adapters.
 * Phase 9A: rule-based signals only.
 */
export function buildProposalIntelligence(
  clientId: number,
  snapshot: WorkspaceProposalsSnapshot,
): ProposalIntelligenceSnapshot {
  const signals: ProposalIntelligenceSignal[] = [];
  const base = `/admin/operations/client-command/${clientId}?tab=proposals`;

  if (snapshot.pendingFollowUpCount > 0) {
    signals.push({
      id: "prop-follow-up",
      label: "Follow up on open proposal",
      reason: `${snapshot.pendingFollowUpCount} proposal(s) awaiting client action.`,
      category: "follow-up",
      priority: "high",
      clientId,
      href: base,
    });
  }

  const current = snapshot.current;
  if (current?.status === "viewed" && current.lastViewedAt) {
    const days = Math.floor(
      (Date.now() - new Date(current.lastViewedAt).getTime()) / (24 * 60 * 60 * 1000),
    );
    if (days >= 3) {
      signals.push({
        id: "prop-viewed-stale",
        label: "Proposal viewed — follow up",
        reason: `Client viewed ${days} days ago without approval.`,
        category: "follow-up",
        priority: "critical",
        proposalId: current.id,
        clientId,
        href: current.href,
      });
    }
  }

  if (current?.proposalType === "website" && (current.oneTimeTotal ?? 0) < 15000) {
    signals.push({
      id: "prop-increase-pricing",
      label: "Review pricing uplift",
      reason: "Website proposal below typical executive tier — consider value positioning.",
      category: "pricing",
      priority: "medium",
      proposalId: current.id,
      clientId,
      href: current.href,
    });
  }

  if (current && !current.recurringTotal && current.oneTimeTotal) {
    signals.push({
      id: "prop-suggest-retainer",
      label: "Bundle monthly retainer",
      reason: "One-time project without recurring line — add care or marketing retainer.",
      category: "retainer",
      priority: "medium",
      proposalId: current.id,
      clientId,
      href: current.href,
    });
  }

  if (current?.proposalType === "crm-automation") {
    signals.push({
      id: "prop-upsell-crm",
      label: "Upsell CRM automation",
      reason: "CRM project in pipeline — expand automation and integrations.",
      category: "upsell-crm",
      priority: "low",
      proposalId: current.id,
      clientId,
      href: current.href,
    });
  }

  const hasSeoGap = snapshot.proposals.some(
    (p) => needsProposalFollowUp(p.status) && p.proposalType === "website",
  );
  if (hasSeoGap) {
    signals.push({
      id: "prop-upsell-seo",
      label: "Suggest SEO package",
      reason: "Active website proposal — bundle ongoing SEO or content.",
      category: "upsell-seo",
      priority: "low",
      clientId,
      href: base,
    });
  }

  if (snapshot.proposals.length >= 2) {
    signals.push({
      id: "prop-bundle-services",
      label: "Bundle complementary services",
      reason: "Multiple proposals on file — consolidate into unified package.",
      category: "bundle",
      priority: "medium",
      clientId,
      href: base,
    });
  }

  return {
    signals: signals.slice(0, 8),
    generatedAt: new Date().toISOString(),
    aiReady: true,
  };
}
