import type { FinancialIntelligenceSnapshot } from "./types";
import type { WorkspaceBillingProfile } from "./types";
import type { WorkspaceProposalsSnapshot } from "@/lib/executive-proposals/client";

interface ClientMetricsInput {
  mrr: number;
  lifetimeValue: number;
  contractedValue: number;
  pipelineValue: number;
  projectValue: number;
  atRiskAmount: number;
  renewalStatus: string;
  activeRetainers: number;
}

/**
 * Deterministic financial intelligence — rule-based only, aiReady for future Brain.
 */
export function buildFinancialIntelligence(
  clientId: number,
  metrics: ClientMetricsInput,
  billing: WorkspaceBillingProfile | null,
  proposals: WorkspaceProposalsSnapshot | WorkspaceProposalsSnapshot["proposals"],
): FinancialIntelligenceSnapshot {
  const signals: FinancialIntelligenceSnapshot["signals"] = [];
  const base = `/admin/operations/client-command/${clientId}?tab=financial`;

  const proposalList = Array.isArray(proposals) ? proposals : proposals.proposals;

  if (!billing || !billing.setupComplete || billing.billingStatus === "not-configured") {
    signals.push({
      id: "fin-missing-billing",
      label: "Missing billing setup",
      reason: "Billing profile incomplete — configure contact, email, and terms.",
      category: "billing",
      priority: "high",
      clientId,
      href: base,
    });
  }

  if (metrics.renewalStatus === "approaching") {
    signals.push({
      id: "fin-renewal-approaching",
      label: "Retainer renewal approaching",
      reason: "Renewal date within 60 days — confirm scope and terms.",
      category: "renewal",
      priority: "medium",
      clientId,
      href: `${base}`,
    });
  }

  if (metrics.renewalStatus === "overdue") {
    signals.push({
      id: "fin-renewal-overdue",
      label: "Renewal overdue",
      reason: "Retainer renewal date has passed — engage client immediately.",
      category: "renewal",
      priority: "critical",
      clientId,
      href: base,
    });
  }

  const signedContractGap =
    metrics.contractedValue > 0 && billing && !billing.setupComplete;
  if (signedContractGap) {
    signals.push({
      id: "fin-contract-no-billing",
      label: "Contract signed — billing not configured",
      reason: "Contracted revenue on file but billing profile incomplete.",
      category: "billing",
      priority: "high",
      clientId,
      href: base,
    });
  }

  const approvedUnconverted = proposalList.filter((p) => p.status === "approved");
  if (approvedUnconverted.length > 0 && metrics.contractedValue === 0) {
    signals.push({
      id: "fin-approved-no-conversion",
      label: "Proposal approved — not converted",
      reason: `${approvedUnconverted.length} approved proposal(s) awaiting conversion.`,
      category: "conversion",
      priority: "high",
      clientId,
      href: `/admin/operations/client-command/${clientId}?tab=proposals`,
    });
  }

  if (metrics.atRiskAmount > 0) {
    signals.push({
      id: "fin-revenue-at-risk",
      label: "Revenue at risk",
      reason: `Approximately $${metrics.atRiskAmount.toLocaleString()} in unsigned or stalled revenue.`,
      category: "risk",
      priority: "critical",
      clientId,
      href: base,
    });
  }

  if (metrics.mrr > 5000 && metrics.pipelineValue > metrics.mrr * 3) {
    signals.push({
      id: "fin-upsell",
      label: "Upsell opportunity",
      reason: "High-value client with significant open pipeline — bundle expansion.",
      category: "upsell",
      priority: "medium",
      clientId,
      href: `/admin/operations/client-command/${clientId}?tab=proposals`,
    });
  }

  if (metrics.mrr > 0 && metrics.mrr < 2000 && metrics.projectValue > 15000) {
    signals.push({
      id: "fin-underpriced",
      label: "Review retainer pricing",
      reason: "Large project value with low MRR — client may be underpriced for activity.",
      category: "pricing",
      priority: "medium",
      clientId,
      href: base,
    });
  }

  if (metrics.activeRetainers > 0 && metrics.mrr > 0) {
    signals.push({
      id: "fin-retainer-review",
      label: "Retainer scope review",
      reason: "Active retainer in place — quarterly value and scope check recommended.",
      category: "retainer",
      priority: "low",
      clientId,
      href: `/admin/operations/client-command/${clientId}?tab=retainers`,
    });
  }

  return {
    signals: signals.slice(0, 8),
    generatedAt: new Date().toISOString(),
    aiReady: true,
  };
}
