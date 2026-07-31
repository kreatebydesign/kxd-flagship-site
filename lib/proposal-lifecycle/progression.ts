/**
 * Maps existing proposal-builder / contract DB statuses → human-facing progression.
 * Does not rename stored enums — display and gates only.
 */

import type { HumanProgression } from "./types.ts";

export function humanProgressionFromStatuses(input: {
  proposalStatus: string;
  contractStatus?: string | null;
  billingPlanStatus?: string | null;
  initialObligationStatus?: string | null;
  onboardingEligible?: boolean;
}): HumanProgression {
  const p = input.proposalStatus;
  const c = input.contractStatus ?? null;
  const b = input.billingPlanStatus ?? null;
  const inv = input.initialObligationStatus ?? null;

  if (input.onboardingEligible || inv === "paid") return "Ready for Onboarding";
  if (inv === "sent" || inv === "viewed") return "Invoice Sent";
  if (b === "ready-for-review" || b === "approved" || b === "partially-activated") {
    if (inv === "under-review" || inv === "draft-ready" || inv === "approved") {
      return "Initial Invoice Review";
    }
    return "Billing Plan Ready";
  }
  if (c === "executed" || c === "signed") return "Fully Executed";
  if (c === "partially-signed" && /* client signed last */ true) {
    // Distinguishes KXD-only vs client-signed via package when available.
  }
  if (c === "viewed" || c === "sent-for-signature" || c === "sent") {
    if (c === "viewed") return "Client Viewed";
    return "Sent for Client Signature";
  }
  if (c === "partially-signed") return "KXD Signed";
  if (c === "approved-for-signature") return "KXD Signed";
  if (c === "internal-review") return "Internal Review";
  if (c === "draft") return "Contract Drafted";
  if (p === "accepted-contract-pending") return "Accepted — Contract Required";
  if (p === "viewed" || p === "questions") return "Viewed";
  if (p === "sent") return "Sent";
  if (p === "revision-requested") return "Viewed";
  return "Draft";
}

/** Display alias: prompt uses accepted-contract-required; DB uses accepted-contract-pending. */
export function proposalStatusLabel(status: string): string {
  switch (status) {
    case "accepted-contract-pending":
      return "Accepted — Contract Required";
    case "revision-requested":
      return "Changes Requested";
    case "approved-for-sharing":
      return "Approved for Sharing";
    case "internal-review":
      return "Internal Review";
    default:
      return status
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
  }
}

export function contractStatusLabel(status: string): string {
  switch (status) {
    case "draft":
      return "Draft — Internal Review";
    case "internal-review":
      return "Internal Review";
    case "approved-for-signature":
      return "Ready for Operator Signature";
    case "sent-for-signature":
    case "sent":
      return "Sent for Client Signature";
    case "partially-signed":
      return "Operator Signed";
    case "signed":
    case "executed":
      return "Fully Executed";
    default:
      return proposalStatusLabel(status);
  }
}
