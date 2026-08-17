/**
 * Guard: legacy public-proposal Checkout must not activate modern builder deals.
 */

const MODERN_PROPOSAL_STATUSES = new Set([
  "draft",
  "internal-review",
  "approved-for-sharing",
  "sent",
  "viewed",
  "accepted-contract-pending",
  "accepted",
  "executed",
  "superseded",
  "void",
]);

/**
 * True when a proposal should use the modern commercial lifecycle
 * (proposal builder / accepted snapshot / contract package) instead of
 * legacy embedded-agreement → Stripe Checkout → conversion.
 */
export function isModernCommercialProposal(doc: Record<string, unknown>): boolean {
  if (doc.builderDocument != null && typeof doc.builderDocument === "object") {
    return true;
  }
  if (doc.acceptedSnapshot != null && typeof doc.acceptedSnapshot === "object") {
    return true;
  }
  // Hashed public token proposals from the modern share path still carry builder docs;
  // also treat lifecycle-oriented statuses as modern when present.
  const status = String(doc.status ?? "");
  if (
    status === "accepted-contract-pending" ||
    status === "approved-for-sharing" ||
    status === "internal-review"
  ) {
    return true;
  }
  // Heuristic: modern proposals use proposalNumber + builder fields; avoid false positives
  // on ancient records that never had builderDocument.
  void MODERN_PROPOSAL_STATUSES;
  return false;
}

export const LEGACY_CHECKOUT_BLOCKED_MESSAGE =
  "This proposal uses the modern KXD commercial lifecycle. Complete contract e-signature and onboarding eligibility there — legacy Checkout is disabled for this deal.";
