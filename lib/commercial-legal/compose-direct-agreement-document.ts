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

const FINALIZED_PRESENTATION_COPY: Array<{ pattern: RegExp; replacement: string }> = [
  {
    pattern:
      /No invoice, charge, or payment collection is initiated by this draft record alone\.?/gi,
    replacement:
      "Finalization or execution of this agreement does not itself constitute payment collection; invoices and charges occur according to the billing schedule stated in this agreement.",
  },
];

/**
 * Render-time copy adjustments for finalized Direct Agreement PDFs.
 * Does not mutate stored contract records.
 */
export function applyFinalizedDirectAgreementPresentationCopy(
  body: string,
  commercialStatus: string | null | undefined,
): string {
  const status = String(commercialStatus ?? "").trim().toLowerCase();
  if (status !== "finalized" && status !== "sent" && status !== "accepted") {
    return body;
  }
  let next = body;
  for (const { pattern, replacement } of FINALIZED_PRESENTATION_COPY) {
    next = next.replace(pattern, replacement);
  }
  return next;
}

/** Page-1 payment summary copy — same finalized transforms as the agreement body. */
export function resolveDirectAgreementPaymentSummaryCopy(
  dueTerms: string | null | undefined,
  commercialStatus: string | null | undefined,
): string {
  return applyFinalizedDirectAgreementPresentationCopy(String(dueTerms ?? "").trim(), commercialStatus);
}
