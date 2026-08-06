/**
 * Default Direct Agreement commercial/legal field defaults.
 * Cancellation/refund language is owned by lib/commercial-legal (canonical).
 * Operators may override any field per deal without changing the standard.
 */

import {
  STANDARD_CANCELLATION_TERMINATION_AND_REFUNDS,
  STANDARD_RENEWAL_BEHAVIOR,
} from "@/lib/commercial-legal";

export const DEFAULT_LEGAL_COPY = {
  cancellationRefundLanguage: STANDARD_CANCELLATION_TERMINATION_AND_REFUNDS,
  intellectualPropertyLanguage:
    "Upon full payment, the client receives a license to use deliverables created for the engagement. Kreate by Design retains ownership of pre-existing tools, frameworks, and know-how.",
  portfolioUseLanguage:
    "Kreate by Design may reference the engagement and non-confidential work product in its portfolio unless the client requests otherwise in writing.",
  clientResponsibilities:
    "Client will provide timely content, approvals, access, and feedback required to perform the services. Delays may affect timelines.",
  renewalBehavior: STANDARD_RENEWAL_BEHAVIOR,
  overagePreapprovalRule:
    "Work exceeding included monthly capacity must be discussed and approved in writing before proceeding. Larger standalone projects are separately scoped.",
  paymentTerms: "One-time prepaid fee due upon acceptance. No unexpected charges.",
} as const;
