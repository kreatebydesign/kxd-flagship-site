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
import { formatCoverPreparedForLine, shouldShowRecurringInvestment } from "./presentation.ts";
import type { CanonicalProposal } from "./types.ts";

export function renderProposalPlainText(proposal: CanonicalProposal): string {
  const lines: string[] = [];
  const push = (...parts: Array<string | null | undefined>) => {
    for (const part of parts) {
      if (part?.trim()) lines.push(part.trim());
    }
  };

  push("Proposal", proposal.title);
  push(formatCoverPreparedForLine(proposal.primaryOrganization, proposal.organizations));
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
  if (e.clientContext?.trim()) push("Additional context", e.clientContext);

  proposal.scopeGroups.forEach((g) => {
    push("Included work", g.title, g.overview);
    push("Deliverables");
    for (const d of g.deliverables) {
      push(d.description ? `• ${d.title}: ${d.description}` : `• ${d.title}`);
    }
    if (g.estimatedTimeline) push(`Timeline: ${g.estimatedTimeline}`);
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
  );
  if (shouldShowRecurringInvestment(proposal.totals.monthlyTotalCents)) {
    push(
      `Monthly investment ${formatClientFacingMonthlyInvestment(proposal.totals.monthlyTotalCents, proposal.currency)}`,
    );
  }
  if (shouldShowRecurringInvestment(proposal.totals.quarterlyTotalCents)) {
    push(`Quarterly investment ${formatCents(proposal.totals.quarterlyTotalCents, proposal.currency)}`);
  }
  if (shouldShowRecurringInvestment(proposal.totals.annualTotalCents)) {
    push(`Annual investment ${formatCents(proposal.totals.annualTotalCents, proposal.currency)}`);
  }
  if (proposal.totals.depositCents > 0) {
    push(`Deposit ${formatCents(proposal.totals.depositCents, proposal.currency)}`);
  }

  if (proposal.paymentSchedule.length) {
    push("Payment schedule");
    for (const item of proposal.paymentSchedule) {
      push(
        `${item.label} | ${formatClientFacingPaymentTiming(item.due)} | ${formatCents(item.amountCents, proposal.currency)}`,
      );
    }
  }

  const terms: Array<[string, string | undefined]> = [
    ["Terms", proposal.terms.proposalTerms],
    ["Payment Schedule", proposal.terms.paymentAssumptions],
    ["Project Timeline", proposal.terms.timelineAssumptions],
    ["Proposal Validity", proposal.terms.expirationLanguage],
    ["Scope Changes", proposal.terms.changeRequestLanguage],
    ["Intellectual Property", proposal.terms.intellectualPropertySummary],
    ["Cancellation", proposal.terms.cancellationSummary],
    ["What We Need From You", proposal.terms.clientResponsibilities],
    ["What's Not Included", proposal.terms.exclusions],
    ["Next Step", proposal.terms.nextSteps],
    ["Closing Note", proposal.terms.closingNote],
    ["Approval", proposal.disclosures.acceptance],
    ["Agreement Required", proposal.disclosures.contractRequired],
  ];
  for (const [label, value] of terms) {
    if (value?.trim()) push(label, value);
  }

  return lines.join("\n");
}
