/**
 * Presentation helpers for the Opportunities surface.
 * Revenue-oriented ordering and next-action labels over Research Desk data.
 * Does not change qualification, grading, or promote logic.
 */

export const OPPORTUNITIES_HREF = "/admin/operations/research" as const;

export type OpportunitySummaryCounts = {
  qualified: number;
  aPlus: number;
  a: number;
  b: number;
  newOrReviewing: number;
};

export type OpportunityPrimaryAction =
  | { kind: "promote"; label: "Promote to Sales" }
  | { kind: "open-sales"; label: "Open in Sales"; salesLeadId: number }
  | { kind: "qualify"; label: "Qualify" }
  | { kind: "continue"; label: "Continue Review" }
  | { kind: "review"; label: "Review" }
  | { kind: "none"; label: null };

const GRADE_RANK: Record<string, number> = {
  "A+": 0,
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  F: 5,
};

function statusBucket(status: string, grade: string | null): number {
  if (status === "qualified") {
    if (grade === "A+") return 0;
    if (grade === "A") return 1;
    if (grade === "B") return 2;
    return 3;
  }
  if (status === "new" || status === "reviewing") return 4;
  if (status === "contacted") return 5;
  if (status === "closed-won") return 6;
  if (status === "rejected" || status === "closed-lost") return 7;
  return 6;
}

/** Strongest opportunities first — presentation only. */
export function compareOpportunitiesForRevenue<
  T extends { status: string; grade: string | null; createdAt: string },
>(a: T, b: T): number {
  const bucketDiff = statusBucket(a.status, a.grade) - statusBucket(b.status, b.grade);
  if (bucketDiff !== 0) return bucketDiff;

  const gradeDiff =
    (GRADE_RANK[a.grade ?? ""] ?? 99) - (GRADE_RANK[b.grade ?? ""] ?? 99);
  if (gradeDiff !== 0) return gradeDiff;

  return String(b.createdAt).localeCompare(String(a.createdAt));
}

export function isHistoryOpportunityStatus(status: string): boolean {
  return status === "rejected" || status === "closed-lost";
}

export function resolveOpportunityPrimaryAction(lead: {
  status: string;
  grade: string | null;
  promotedSalesLeadId: number | null;
}): OpportunityPrimaryAction {
  if (lead.promotedSalesLeadId != null) {
    return {
      kind: "open-sales",
      label: "Open in Sales",
      salesLeadId: lead.promotedSalesLeadId,
    };
  }
  if (isHistoryOpportunityStatus(lead.status)) {
    return { kind: "none", label: null };
  }
  if (lead.status === "qualified" && (lead.grade === "A+" || lead.grade === "A")) {
    return { kind: "promote", label: "Promote to Sales" };
  }
  if (lead.status === "qualified") {
    return { kind: "review", label: "Review" };
  }
  if (lead.status === "new") {
    return { kind: "qualify", label: "Qualify" };
  }
  if (lead.status === "reviewing") {
    return { kind: "continue", label: "Continue Review" };
  }
  return { kind: "review", label: "Review" };
}

export function emptyOpportunitySummaryCounts(): OpportunitySummaryCounts {
  return {
    qualified: 0,
    aPlus: 0,
    a: 0,
    b: 0,
    newOrReviewing: 0,
  };
}

/**
 * Lightweight counts for Today — exact Payload counts, no record loads.
 * Mirrors getReviewInboxSummary: parallel payload.count + totalDocs.
 */
export async function loadOpportunitySummaryCounts(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: { count: (args: any) => Promise<{ totalDocs: number }> },
): Promise<OpportunitySummaryCounts> {
  const countWhere = async (where: Record<string, unknown>) => {
    const result = await payload.count({
      collection: "research-leads",
      where,
    });
    return result.totalDocs ?? 0;
  };

  try {
    const [qualified, aPlus, a, b, newOrReviewing] = await Promise.all([
      countWhere({ status: { equals: "qualified" } }),
      countWhere({
        and: [{ status: { equals: "qualified" } }, { grade: { equals: "A+" } }],
      }),
      countWhere({
        and: [{ status: { equals: "qualified" } }, { grade: { equals: "A" } }],
      }),
      countWhere({
        and: [{ status: { equals: "qualified" } }, { grade: { equals: "B" } }],
      }),
      countWhere({ status: { in: ["new", "reviewing"] } }),
    ]);

    return { qualified, aPlus, a, b, newOrReviewing };
  } catch {
    return emptyOpportunitySummaryCounts();
  }
}

/**
 * Exact desk KPIs — parallel payload.count, independent of the capped list load.
 */
export async function loadOpportunityDeskMetrics(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: { count: (args: any) => Promise<{ totalDocs: number }> },
): Promise<{
  total: number;
  new: number;
  reviewing: number;
  qualified: number;
  aPlus: number;
  a: number;
  b: number;
  closedWon: number;
  promoted: number;
  rejected: number;
}> {
  const countWhere = async (where?: Record<string, unknown>) => {
    const result = await payload.count({
      collection: "research-leads",
      ...(where ? { where } : {}),
    });
    return result.totalDocs ?? 0;
  };

  try {
    const [total, newCount, reviewing, qualified, aPlus, a, b, closedWon, promoted, rejected] =
      await Promise.all([
        countWhere(),
        countWhere({ status: { equals: "new" } }),
        countWhere({ status: { equals: "reviewing" } }),
        countWhere({ status: { equals: "qualified" } }),
        countWhere({
          and: [{ status: { equals: "qualified" } }, { grade: { equals: "A+" } }],
        }),
        countWhere({
          and: [{ status: { equals: "qualified" } }, { grade: { equals: "A" } }],
        }),
        countWhere({
          and: [{ status: { equals: "qualified" } }, { grade: { equals: "B" } }],
        }),
        countWhere({ status: { equals: "closed-won" } }),
        countWhere({ promotedSalesLead: { exists: true } }),
        countWhere({ status: { equals: "rejected" } }),
      ]);

    return {
      total,
      new: newCount,
      reviewing,
      qualified,
      aPlus,
      a,
      b,
      closedWon,
      promoted,
      rejected,
    };
  } catch {
    return {
      total: 0,
      new: 0,
      reviewing: 0,
      ...emptyOpportunitySummaryCounts(),
      closedWon: 0,
      promoted: 0,
      rejected: 0,
    };
  }
}
