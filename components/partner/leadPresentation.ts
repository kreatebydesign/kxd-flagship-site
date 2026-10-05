import type { PartnerVisibilityState } from "@/lib/portal/partner/types";

const LOCAL_QA_PREFIX = /^\[LOCAL PARTNER QA\]\s*/i;

/** Soften synthetic local labels in partner UI without changing stored data. */
export function partnerDisplayBusinessName(name: string): string {
  const isLocalQa = LOCAL_QA_PREFIX.test(name.trim());
  let cleaned = name.replace(LOCAL_QA_PREFIX, "").trim();
  // Strip seed/smoke timestamp suffixes used only in local QA names.
  if (isLocalQa) {
    cleaned = cleaned.replace(/\s+\d{10,}$/u, "").trim();
  }
  return cleaned || name;
}

export function isLocalQaBusinessName(name: string): boolean {
  return (
    process.env.NODE_ENV !== "production" && LOCAL_QA_PREFIX.test(name.trim())
  );
}

export function partnerLeadNextAction(state: PartnerVisibilityState): {
  label: string;
  href: string | null;
  hint: string;
} {
  switch (state) {
    case "submitted":
    case "reviewing":
      return {
        label: "No action needed",
        href: null,
        hint: "KXD is on it. Add a note only if something useful comes up.",
      };
    case "qualified":
      return {
        label: "Book KXD in",
        href: "/portal/partner/book",
        hint: "This one is ready for a discovery call.",
      };
    case "discovery_booked":
      return {
        label: "Add a note",
        href: null,
        hint: "Call is set. Capture anything that helps KXD prepare.",
      };
    case "proposal_in_motion":
      return {
        label: "Stay close",
        href: null,
        hint: "KXD owns the close. You do not manage pricing or the proposal.",
      };
    case "won":
      return {
        label: "View earnings",
        href: "/portal/partner/earnings",
        hint: "Approved commissions for this introduction appear in My earnings.",
      };
    case "not_moving_forward":
      return {
        label: "Submit another lead",
        href: "/portal/partner/submit-lead",
        hint: "This one closed. Keep the pipeline moving with the next fit.",
      };
    default:
      return {
        label: "Open lead",
        href: null,
        hint: "Review the current status and context.",
      };
  }
}
