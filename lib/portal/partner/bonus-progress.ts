/**
 * Shared performance-bonus window math.
 * Same predicates as Network Command — partners never invent progress.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export type BonusProgressPolicyInput = {
  performanceBonusEnabled: boolean;
  performanceBonusAmountCents: number;
  performanceBonusProjectCount: number;
  performanceBonusWindowDays: number;
};

export type BonusProgressEarningInput = {
  earningType: string;
  paymentStatus: string;
  amountCents: number;
  relatedBusinessName: string;
  relatedReferralId: number | null;
  relatedSalesLeadId?: number | null;
  approvedAt: string | null;
  paidAt: string | null;
  createdAt?: string | null;
};

export type PartnerPerformanceBonusProgress = {
  count: number;
  required: number;
  windowDays: number;
  amountCents: number;
  alreadyOnLedger: boolean;
  ledgerAmountCents: number;
  ledgerStatus: "approved" | "paid" | null;
};

function relTimeMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

function projectCommissionKey(row: BonusProgressEarningInput): string {
  if (row.relatedReferralId) return `r:${row.relatedReferralId}`;
  if (row.relatedSalesLeadId) return `s:${row.relatedSalesLeadId}`;
  return `b:${row.relatedBusinessName.trim().toLowerCase()}`;
}

function earningWindowAt(row: BonusProgressEarningInput): number | null {
  return relTimeMs(row.paidAt) ?? relTimeMs(row.approvedAt);
}

/**
 * Counts qualifying project commissions in the policy window.
 * Returns null when there is no earned progress to show (0 of N, nothing on ledger).
 */
export function computePartnerPerformanceBonusProgress(
  earnings: readonly BonusProgressEarningInput[],
  policy: BonusProgressPolicyInput,
  nowMs: number = Date.now(),
): PartnerPerformanceBonusProgress | null {
  if (!policy.performanceBonusEnabled) return null;

  const windowMs = policy.performanceBonusWindowDays * DAY_MS;
  const windowStart = nowMs - windowMs;

  const keys = new Set<string>();
  for (const row of earnings) {
    if (row.earningType !== "project_commission") continue;
    if (row.paymentStatus !== "approved" && row.paymentStatus !== "paid") continue;
    const at = earningWindowAt(row);
    if (at == null || at < windowStart) continue;
    keys.add(projectCommissionKey(row));
  }

  let ledgerAmountCents = 0;
  let ledgerStatus: "approved" | "paid" | null = null;
  for (const row of earnings) {
    if (row.earningType !== "performance_bonus") continue;
    if (row.paymentStatus === "void") continue;
    const at = earningWindowAt(row) ?? relTimeMs(row.createdAt);
    if (at == null || at < windowStart) continue;
    const amount = Number(row.amountCents);
    if (!Number.isFinite(amount) || amount < 0) continue;
    ledgerAmountCents += amount;
    if (row.paymentStatus === "paid") ledgerStatus = "paid";
    else if (ledgerStatus !== "paid" && row.paymentStatus === "approved") {
      ledgerStatus = "approved";
    }
  }

  const alreadyOnLedger = ledgerAmountCents > 0 || ledgerStatus != null;
  const count = keys.size;
  if (count === 0 && !alreadyOnLedger) return null;

  return {
    count,
    required: policy.performanceBonusProjectCount,
    windowDays: policy.performanceBonusWindowDays,
    amountCents: policy.performanceBonusAmountCents,
    alreadyOnLedger,
    ledgerAmountCents,
    ledgerStatus,
  };
}

/** Partner-facing copy only — never projects unearned bonus dollars. */
export function partnerFacingBonusProgressSentence(
  progress: PartnerPerformanceBonusProgress,
  formatCents: (cents: number) => string,
): string {
  if (progress.alreadyOnLedger) {
    const amount = formatCents(
      progress.ledgerAmountCents > 0
        ? progress.ledgerAmountCents
        : progress.amountCents,
    );
    if (progress.ledgerStatus === "paid") {
      return `Performance bonus: ${amount} paid for this ${progress.windowDays}-day window.`;
    }
    return `Performance bonus: ${amount} approved for this ${progress.windowDays}-day window.`;
  }
  return `Performance bonus: ${progress.count} of ${progress.required} paid projects in the current ${progress.windowDays}-day window.`;
}
