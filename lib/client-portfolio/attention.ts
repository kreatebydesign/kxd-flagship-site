import type { AttentionReason, PortfolioRow } from "@/lib/client-portfolio/types";

function parseDueDate(raw: string | null): Date | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function startOfTodayLocal(now: Date = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Verified attention signals for Batch 3B — no invented health or work rules. */
export function resolveAttentionReasons(
  row: PortfolioRow,
  duplicateWarning: string | undefined,
  now: Date = new Date(),
): AttentionReason[] {
  const reasons: AttentionReason[] = [];
  const today = startOfTodayLocal(now);

  if (row.internalPriority === "critical") {
    reasons.push({ code: "critical-priority", label: "Critical priority" });
  } else if (row.internalPriority === "high") {
    reasons.push({ code: "high-priority", label: "High priority" });
  }

  if (row.relationshipStatus === "at-risk") {
    reasons.push({ code: "executive-at-risk", label: "At-risk relationship" });
  }

  if (row.clientRelationshipHealth === "needs-attention") {
    reasons.push({
      code: "relationship-needs-attention",
      label: "Needs attention",
    });
  } else if (row.clientRelationshipHealth === "at-risk") {
    reasons.push({
      code: "relationship-health-at-risk",
      label: "Relationship health at risk",
    });
  }

  if (duplicateWarning) {
    reasons.push({ code: "duplicate", label: "Possible duplicate" });
  }

  if (row.clientStatus === "active" && !row.hasExecutiveProfile) {
    reasons.push({ code: "profile-pending", label: "Profile pending" });
  }

  const due = parseDueDate(row.nextActionDueDate);
  if (due && due < today) {
    reasons.push({ code: "next-action-overdue", label: "Next action overdue" });
  }

  return reasons;
}

export function rowNeedsAttention(
  row: PortfolioRow,
  duplicateWarnings: Readonly<Record<number, string>>,
  now?: Date,
): boolean {
  return (
    resolveAttentionReasons(row, duplicateWarnings[row.clientId], now).length > 0
  );
}

export function countAttentionRows(
  rows: PortfolioRow[],
  duplicateWarnings: Readonly<Record<number, string>>,
  now?: Date,
): number {
  return rows.filter((r) => rowNeedsAttention(r, duplicateWarnings, now)).length;
}