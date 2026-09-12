/**
 * Plain-text mirror of client-facing proposal content for verification.
 * Mirrors PDF/HTML section coverage without internal fields.
 */

import {
  formatClientFacingCreditAmount,
  formatClientFacingCreditType,
} from "./client-facing-labels.ts";
import {
  composeClosingPresentation,
  composeCoverPresentation,
  composeInvestmentPresentation,
  composeOpeningSections,
  composeScopeWorkstream,
  composeTermsSectionPlan,
  proseKindForTermsKey,
  structureProposalProse,
} from "./presentation.ts";
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
    for (const block of structureProposalProse(value, proseKindForTermsKey(key as never))) {
      if (block.type === "paragraph") {
        push(block.text);
      } else if (block.type === "numbered") {
        block.items.forEach((item, index) => push(`${index + 1}. ${item}`));
      } else {
        block.items.forEach((item) => push(`• ${item}`));
      }
    }
  };

  const cover = composeCoverPresentation(proposal);
  push("Proposal");
  for (const org of cover.organizationLines) push(org);
  if (cover.organizationJoiner) push(cover.organizationJoiner);
  push(cover.engagementTitle);
  if (cover.preparedForName) push(`Prepared for ${cover.preparedForName}`);
  if (cover.preparedForDetail) push(cover.preparedForDetail);
  for (const meta of cover.metaLines) push(meta);
  push(cover.studioLine);

  for (const section of composeOpeningSections(proposal)) {
    push(section.eyebrow, section.title, ...section.paragraphs);
  }

  proposal.scopeGroups.forEach((group, index) => {
    const workstream = composeScopeWorkstream(group, index, proposal.scopeGroups.length);
    push(workstream.indexLabel, workstream.title, workstream.subtitle, workstream.overview);
    push("Deliverables");
    for (const item of workstream.deliverables) {
      push(item.description ? `• ${item.title}: ${item.description}` : `• ${item.title}`);
    }
  });

  const investment = composeInvestmentPresentation(proposal);
  push(investment.eyebrow, investment.title);
  push(investment.heroEyebrow, investment.heroAmount, "Total project investment");
  if (investment.paymentSummary) push(investment.paymentSummary);
  if (investment.annualLines.length) {
    push("Annual hosting");
    for (const line of investment.annualLines) push(`${line.title} | ${line.amountLabel}`);
    if (investment.annualTotalLabel) push(investment.annualTotalLabel);
  }
  if (investment.monthlyLines.length) {
    push("Monthly");
    for (const line of investment.monthlyLines) push(`${line.title} | ${line.amountLabel}`);
  } else if (investment.monthlyNoneLabel) {
    push("Monthly management", investment.monthlyNoneLabel);
  }
  if (investment.quarterlyLines.length) {
    push("Quarterly");
    for (const line of investment.quarterlyLines) push(`${line.title} | ${line.amountLabel}`);
  }
  for (const credit of proposal.credits) {
    push(
      `${credit.label} | ${formatClientFacingCreditType(credit.kind)} | ${formatClientFacingCreditAmount(credit, proposal.currency)}`,
    );
  }
  if (investment.showDetailedSchedule) {
    push("Payment schedule");
    for (const row of investment.scheduleRows) {
      push(`${row.label} | ${row.timing} | ${row.amount}`);
    }
  }

  for (const section of composeTermsSectionPlan(proposal)) {
    pushStructured(section.title, section.text, section.key);
  }

  const closing = composeClosingPresentation(proposal);
  push(closing.eyebrow, closing.title);
  pushStructured("Next steps", closing.nextSteps, "nextSteps");
  if (closing.closingNote) push(closing.closingNote);
  if (closing.acceptance) push("Acceptance", closing.acceptance);

  return `${lines.join("\n")}\n`;
}
