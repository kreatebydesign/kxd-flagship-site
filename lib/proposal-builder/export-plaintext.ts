/**
 * Plain-text mirror of client-facing proposal content for verification.
 * Mirrors PDF/HTML section coverage without internal fields.
 */

import { formatProposalCalendarDate } from "./calendar-date.ts";
import {
  formatClientFacingBilling,
  formatClientFacingCreditAmount,
  formatClientFacingCreditType,
  formatClientFacingLineAmount,
  formatClientFacingMonthlyInvestment,
  formatClientFacingPaymentTiming,
} from "./client-facing-labels.ts";
import { formatProposalContactSummary } from "./document.ts";
import { formatCents } from "./money.ts";
import type { CanonicalProposal } from "./types.ts";

export function renderProposalPlainText(proposal: CanonicalProposal): string {
  const lines: string[] = [];
  const push = (...parts: Array<string | null | undefined>) => {
    for (const part of parts) {
      if (part?.trim()) lines.push(part.trim());
    }
  };

  push("Proposal", proposal.title);
  push(`Prepared for ${proposal.primaryOrganization}`);
  push(formatProposalContactSummary(proposal.primaryContact));
  push(
    `${proposal.proposalNumber} · Version ${proposal.version}`,
    `${formatProposalCalendarDate(proposal.proposalDate)} · Expires ${formatProposalCalendarDate(proposal.expirationDate)}`,
    `Prepared by ${proposal.preparedBy}`,
  );

  const e = proposal.executive;
  push("Introduction", e.clientFacingIntro);
  push("Executive summary", e.executiveSummary);
  push("Current Situation", e.currentSituation);
  push("Objectives", e.objectives);
  push("Direction", e.recommendedDirection);
  push("Desired Outcomes", e.desiredOutcomes);
  push("Client-Specific Context", e.clientContext);

  proposal.scopeGroups.forEach((g, i) => {
    push(`Scope ${String(i + 1).padStart(2, "0")}`, g.title, g.organizationName, g.overview);
    push("Deliverables");
    for (const d of g.deliverables) push(`• ${d.title}`);
    if (g.estimatedTimeline) push(`Timeline: ${g.estimatedTimeline}`);
    if (g.exclusions?.trim()) push("Exclusions", g.exclusions);
  });

  push("Investment", "Pricing");
  for (const line of proposal.pricingLines) {
    const badge =
      line.inclusion === "optional" || line.isAddon
        ? "Optional"
        : formatClientFacingBilling(line.cadence);
    push(
      `${line.title} | ${badge} | ${formatClientFacingLineAmount(
        line.unitPriceCents * (line.quantity || 1),
        line.cadence,
        proposal.currency,
      )}`,
    );
  }
  for (const credit of proposal.credits) {
    push(
      `${credit.label} | ${formatClientFacingCreditType(credit.kind)} | ${formatClientFacingCreditAmount(credit, proposal.currency)}`,
    );
    if (credit.notes?.trim()) push("Sponsorship condition", credit.notes);
  }
  push(
    `One-time investment ${formatCents(proposal.totals.oneTimeTotalCents, proposal.currency)}`,
    `Monthly investment ${formatClientFacingMonthlyInvestment(proposal.totals.monthlyTotalCents, proposal.currency)}`,
  );
  if (proposal.totals.depositCents > 0) {
    push(`Deposit ${formatCents(proposal.totals.depositCents, proposal.currency)}`);
  }

  if (proposal.paymentSchedule.length) {
    push("Payment timing");
    for (const item of proposal.paymentSchedule) {
      push(
        `${item.label} | ${formatClientFacingPaymentTiming(item.due)} | ${formatCents(item.amountCents, proposal.currency)}`,
      );
    }
  }

  const terms: Array<[string, string | undefined]> = [
    ["Proposal-Specific Terms", proposal.terms.proposalTerms],
    ["Payment Assumptions", proposal.terms.paymentAssumptions],
    ["Timeline Assumptions", proposal.terms.timelineAssumptions],
    ["Expiration Language", proposal.terms.expirationLanguage],
    ["Change-Request Language", proposal.terms.changeRequestLanguage],
    ["Intellectual Property Summary", proposal.terms.intellectualPropertySummary],
    ["Cancellation Summary", proposal.terms.cancellationSummary],
    ["Client Responsibilities", proposal.terms.clientResponsibilities],
    ["Overall Exclusions", proposal.terms.exclusions],
    ["Next Steps", proposal.terms.nextSteps],
    ["Closing Note", proposal.terms.closingNote],
    ["Acceptance Disclosure", proposal.disclosures.acceptance],
    ["Contract Required Disclosure", proposal.disclosures.contractRequired],
  ];
  for (const [label, value] of terms) {
    if (value?.trim()) push(label, value);
  }

  return lines.join("\n");
}
