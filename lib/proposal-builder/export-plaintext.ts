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
import { formatCoverPreparedForLine, shouldShowRecurringInvestment, proseKindForTermsKey, structureProposalProse } from "./presentation.ts";
import type { CanonicalProposal } from "./types.ts";

export function renderProposalPlainText(proposal: CanonicalProposal): string {
  const lines: string[] = [];
  const push = (...parts: Array<string | null | undefined>) => {
    for (const part of parts) {
      if (part?.trim()) lines.push(part.trim());
    }
  };
  const pushStructured = (label: string, value: string | undefined, key: string) => {
    if (!value?.trim()) return;
    push(label);
    for (const block of structureProposalProse(value, proseKindForTermsKey(key))) {
      if (block.type === "paragraph") {
        push(block.text);
      } else if (block.type === "numbered") {
        block.items.forEach((item, index) => push(`${index + 1}. ${item}`));
      } else {
        block.items.forEach((item) => push(`• ${item}`));
      }
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

  const terms: Array<[string, string, string | undefined]> = [
    ["Terms", "proposalTerms", proposal.terms.proposalTerms],
    ["Payment Schedule", "paymentAssumptions", proposal.terms.paymentAssumptions],
    ["Project Timeline", "timelineAssumptions", proposal.terms.timelineAssumptions],
    ["Proposal Validity", "expirationLanguage", proposal.terms.expirationLanguage],
    ["Scope Changes", "changeRequestLanguage", proposal.terms.changeRequestLanguage],
    ["Intellectual Property", "intellectualPropertySummary", proposal.terms.intellectualPropertySummary],
    ["Cancellation", "cancellationSummary", proposal.terms.cancellationSummary],
    ["What We Need From You", "clientResponsibilities", proposal.terms.clientResponsibilities],
    ["What's Not Included", "exclusions", proposal.terms.exclusions],
    ["Next Step", "nextSteps", proposal.terms.nextSteps],
    ["Closing Note", "closingNote", proposal.terms.closingNote],
  ];
  for (const [label, key, value] of terms) {
    pushStructured(label, value, key);
  }
  if (proposal.disclosures.acceptance?.trim()) {
    push("Approval", proposal.disclosures.acceptance);
  }

  return lines.join("\n");
}
