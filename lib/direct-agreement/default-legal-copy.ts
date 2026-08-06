/**
 * Default Direct Agreement legal/commercial language.
 * Surfaced for Matt review before production use — do not invent alternate legal systems.
 */
export const DEFAULT_LEGAL_COPY = {
  cancellationRefundLanguage:
    "Fees prepaid for a fixed service term are non-refundable except where required by law or as otherwise agreed in writing by Kreate by Design.",
  intellectualPropertyLanguage:
    "Upon full payment, the client receives a license to use deliverables created for the engagement. Kreate by Design retains ownership of pre-existing tools, frameworks, and know-how.",
  portfolioUseLanguage:
    "Kreate by Design may reference the engagement and non-confidential work product in its portfolio unless the client requests otherwise in writing.",
  clientResponsibilities:
    "Client will provide timely content, approvals, access, and feedback required to perform the services. Delays may affect timelines.",
  renewalBehavior:
    "Agreement ends on the service end date unless extended in writing. No automatic renewal.",
  overagePreapprovalRule:
    "Work exceeding included monthly capacity must be discussed and approved in writing before proceeding. Larger standalone projects are separately scoped.",
  paymentTerms: "One-time prepaid fee due upon acceptance. No unexpected charges.",
} as const;
