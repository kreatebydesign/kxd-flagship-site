/**
 * Client Command — attention counts for the Overview strip (Primal Phase 1, Build 1).
 * Pure aggregation over already-scoped inquiry records. No fabricated metrics —
 * every count is derived from real attention flags (see attention.ts).
 */

import type { ClientInquiryRecord } from "@/lib/managed-client-leads/types";
import { deriveLeadAttentionFlags } from "./attention";
import type { LeadAttentionCounts } from "./types";

export function summarizeLeadAttentionCounts(
  inquiries: readonly ClientInquiryRecord[],
  now: Date = new Date(),
): LeadAttentionCounts {
  const counts: LeadAttentionCounts = {
    total: inquiries.length,
    newUntouched: 0,
    unassigned: 0,
    followUpDue: 0,
    followUpOverdue: 0,
  };

  for (const inquiry of inquiries) {
    const flags = deriveLeadAttentionFlags(inquiry, now);
    if (flags.includes("NEW_UNTOUCHED")) counts.newUntouched += 1;
    if (flags.includes("UNASSIGNED")) counts.unassigned += 1;
    if (flags.includes("FOLLOW_UP_DUE")) counts.followUpDue += 1;
    if (flags.includes("FOLLOW_UP_OVERDUE")) counts.followUpOverdue += 1;
  }

  return counts;
}

/** Calm, factual headline for the home attention strip — never an empty-state apology. */
export function summarizeLeadAttentionHeadline(counts: LeadAttentionCounts): string {
  if (counts.followUpOverdue > 0) {
    return counts.followUpOverdue === 1
      ? "1 lead has an overdue follow-up"
      : `${counts.followUpOverdue} leads have an overdue follow-up`;
  }
  if (counts.newUntouched > 0) {
    return counts.newUntouched === 1
      ? "1 new lead hasn't been touched yet"
      : `${counts.newUntouched} new leads haven't been touched yet`;
  }
  if (counts.unassigned > 0) {
    return counts.unassigned === 1
      ? "1 lead is unassigned"
      : `${counts.unassigned} leads are unassigned`;
  }
  if (counts.followUpDue > 0) {
    return counts.followUpDue === 1
      ? "1 follow-up is due soon"
      : `${counts.followUpDue} follow-ups are due soon`;
  }
  return "All leads are on track";
}

export type LeadOverviewResult =
  | { ok: true; counts: LeadAttentionCounts }
  | { ok: false; code: "disabled" | "misconfigured" | "error"; message: string };

/**
 * Loads attention counts for a session's tenant — reuses the same scoped
 * inquiry loader as the list view so counts and the list never disagree.
 */
export async function loadLeadAttentionOverview(input: {
  session: import("@/lib/portal/session").PortalSession;
  profile: import("@/lib/ces").ResolvedExperienceProfile;
  canManage: boolean;
}): Promise<LeadOverviewResult> {
  const { loadLeadList } = await import("./load");
  const result = await loadLeadList({
    session: input.session,
    profile: input.profile,
    canManage: input.canManage,
  });
  if (!result.ok) {
    return { ok: false, code: result.code, message: result.message };
  }
  return {
    ok: true,
    counts: summarizeLeadAttentionCounts(result.items.map((item) => item.inquiry)),
  };
}
