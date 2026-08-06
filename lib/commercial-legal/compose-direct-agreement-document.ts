/**
 * Compose Direct Agreement PDF / snapshot body from freeform body + structured terms.
 * Does not mutate stored contract records — used at filing/render time only.
 */

import type { DirectAgreementTerms } from "@/lib/direct-agreement/types";
import { STANDARD_CANCELLATION_TERMINATION_AND_REFUNDS_TITLE } from "./standard-cancellation-refunds";

function section(title: string, content: string | null | undefined): string | null {
  const text = String(content ?? "").trim();
  if (!text) return null;
  return `${title}\n${text}`;
}

/**
 * Build the document text that should appear in newly generated DA PDFs.
 * Skips a structured section when the freeform body already contains its title
 * (avoids duplicating language the operator pasted into the body).
 */
export function composeDirectAgreementDocumentBody(input: {
  body: string;
  terms: DirectAgreementTerms;
}): string {
  const body = String(input.body ?? "").trim();
  const terms = input.terms;
  const blocks: string[] = [];

  if (body) blocks.push(body);

  const legalSections: Array<[string, string | null | undefined]> = [
    [STANDARD_CANCELLATION_TERMINATION_AND_REFUNDS_TITLE, terms.cancellationRefundLanguage],
    ["Intellectual property", terms.intellectualPropertyLanguage],
    ["Portfolio use", terms.portfolioUseLanguage],
    ["Client responsibilities", terms.clientResponsibilities],
    ["Overage / pre-approval", terms.overagePreapprovalRule],
    ["Payment terms", terms.paymentTerms],
    ["Renewal", terms.renewalBehavior],
  ];

  for (const [title, content] of legalSections) {
    if (body.toLowerCase().includes(title.toLowerCase())) continue;
    const block = section(title, content);
    if (block) blocks.push(block);
  }

  return blocks.join("\n\n").trim();
}
