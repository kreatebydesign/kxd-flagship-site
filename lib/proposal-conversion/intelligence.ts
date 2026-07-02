import "server-only";

import type { ConversionIntelligenceSnapshot } from "./types";
import type { WorkspaceContractsSnapshot } from "./types";
import type { WorkspaceProposalsSnapshot } from "@/lib/executive-proposals/client";
import { isUnsignedContract } from "@/lib/contracts/lifecycle";

/**
 * Deterministic conversion + contract intelligence — rule-based only.
 */
export function buildConversionIntelligence(
  clientId: number,
  contracts: WorkspaceContractsSnapshot,
  proposals: WorkspaceProposalsSnapshot,
): ConversionIntelligenceSnapshot {
  const signals: ConversionIntelligenceSnapshot["signals"] = [];
  const base = `/admin/operations/client-command/${clientId}?tab=contracts`;

  const convertedProposalIds = new Set(
    contracts.conversions.map((c) => c.proposalId),
  );
  const approvedUnconverted = proposals.proposals.filter(
    (p) => p.status === "approved" && !convertedProposalIds.has(p.id),
  );
  if (approvedUnconverted.length > 0) {
    signals.push({
      id: "conv-ready",
      label: "Proposal ready to convert",
      reason: `${approvedUnconverted.length} approved proposal(s) awaiting conversion.`,
      category: "conversion",
      priority: "high",
      clientId,
      proposalId: approvedUnconverted[0]?.id,
      href: `/admin/operations/client-command/${clientId}?tab=proposals`,
    });
  }

  if (contracts.unsignedCount > 0) {
    signals.push({
      id: "conv-contract-unsigned",
      label: "Contract awaiting signature",
      reason: `${contracts.unsignedCount} contract(s) not yet signed.`,
      category: "contract",
      priority: "high",
      clientId,
      contractId: contracts.current?.id,
      href: base,
    });
  }

  const current = contracts.current;
  if (current && isUnsignedContract(current.status) && current.sentAt) {
    const days = Math.floor(
      (Date.now() - new Date(current.sentAt).getTime()) / (24 * 60 * 60 * 1000),
    );
    if (days >= 5) {
      signals.push({
        id: "conv-contract-stale",
        label: "Follow up on unsigned contract",
        reason: `Contract sent ${days} days ago without signature.`,
        category: "contract",
        priority: "critical",
        clientId,
        contractId: current.id,
        href: base,
      });
    }
  }

  const incompleteLaunch = contracts.conversions.filter(
    (c) => c.launchStatus !== "completed",
  );
  if (incompleteLaunch.length > 0) {
    signals.push({
      id: "conv-launch-incomplete",
      label: "Launch automation incomplete",
      reason: `${incompleteLaunch.length} conversion(s) still in launch queue.`,
      category: "launch",
      priority: "medium",
      clientId,
      href: base,
    });
  }

  const hasRetainerProposal = proposals.proposals.some(
    (p) =>
      (p.recurringTotal ?? 0) > 0 &&
      p.status === "approved",
  );
  const hasRetainerContract = contracts.contracts.some(
    (c) => (c.monthlyAmount ?? 0) > 0,
  );
  if (hasRetainerProposal && !hasRetainerContract && contracts.conversions.length > 0) {
    signals.push({
      id: "conv-retainer-missing",
      label: "Retainer contract missing",
      reason: "Approved retainer proposal converted but no retainer contract on file.",
      category: "retainer",
      priority: "medium",
      clientId,
      href: base,
    });
  }

  const convertedWithoutOnboarding = contracts.conversions.some(
    (c) => c.status === "completed",
  );
  if (convertedWithoutOnboarding && proposals.proposals.length === 0) {
    signals.push({
      id: "conv-onboarding-gap",
      label: "Verify onboarding intake",
      reason: "Client converted — confirm onboarding form sent and completed.",
      category: "onboarding",
      priority: "medium",
      clientId,
      href: `/admin/operations/client-command/${clientId}?tab=overview`,
    });
  }

  const kickoffOverdue = contracts.conversions.find(
    (c) =>
      c.status === "completed" &&
      c.convertedAt &&
      Date.now() - new Date(c.convertedAt).getTime() > 7 * 24 * 60 * 60 * 1000 &&
      c.launchStatus !== "completed",
  );
  if (kickoffOverdue) {
    signals.push({
      id: "conv-kickoff-overdue",
      label: "Kickoff overdue",
      reason: "Conversion completed over 7 days ago — schedule kickoff if not done.",
      category: "kickoff",
      priority: "high",
      clientId,
      href: `/admin/operations/client-command/${clientId}?tab=meetings`,
    });
  }

  return {
    signals: signals.slice(0, 8),
    generatedAt: new Date().toISOString(),
  };
}
