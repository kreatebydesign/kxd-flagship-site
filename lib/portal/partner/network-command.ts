/**
 * KXD Network Command Phase 2 — derived owner read model.
 * Pure functions. No Payload, no writes, no automated hire status.
 */

import {
  countPartnerPathMetrics,
  isOpenPartnerBookingStatus,
  isQualifiedPartnerVisibility,
  partnerConversionRate,
} from "./path-metrics";
import {
  PARTNER_VISIBILITY_LABELS,
  type PartnerVisibilityState,
} from "./types";

const HOUR_MS = 60 * 60 * 1000;
const STALE_INTRO_MS = 48 * HOUR_MS;
const MOMENTUM_WINDOW_MS = 21 * 24 * HOUR_MS;
const HIGH_POTENTIAL_ACTIVITY_MS = 45 * 24 * HOUR_MS;

export const NETWORK_COMMAND_ACTION_KINDS = [
  "approve_earning",
  "review_booking",
  "review_introduction",
  "book_discovery",
  "sales_follow_up",
  "won_mismatch",
  "none",
] as const;

export type NetworkCommandActionKind =
  (typeof NETWORK_COMMAND_ACTION_KINDS)[number];

export type NetworkCommandSignal =
  | "onboarding"
  | "building_momentum"
  | "needs_review"
  | null;

export type NetworkCommandRate = {
  numerator: number;
  denominator: number;
  percent: number | null;
};

export type NetworkCommandAction = {
  kind: NetworkCommandActionKind;
  partnerId: number;
  partnerName: string;
  label: string;
  explanation: string;
  at: string;
  earningId?: number;
  bookingId?: number;
  referralId?: number;
  salesLeadId?: number;
};

export type NetworkCommandActivity = {
  at: string;
  kind: "introduction" | "note" | "booking" | "earning";
  label: string;
};

export type NetworkCommandProfileInput = {
  id: number;
  displayName: string;
  status: "active" | "inactive";
  notes: string | null;
};

export type NetworkCommandReferralInput = {
  id: number;
  partnerId: number;
  businessName: string;
  contactName: string;
  visibilityState: string;
  internalStatus: string;
  decisionMakerConfirmed: boolean;
  internalNotes: string | null;
  promotedSalesLeadId: number | null;
  createdAt: string;
};

export type NetworkCommandBookingInput = {
  id: number;
  partnerId: number;
  status: string;
  bookingMode: string;
  preferredTimes: string | null;
  slotStart: string | null;
  relatedReferralId: number | null;
  createdAt: string;
};

export type NetworkCommandNoteInput = {
  id: number;
  partnerId: number;
  referralId: number;
  createdAt: string;
};

export type NetworkCommandEarningInput = {
  id: number;
  partnerId: number;
  earningType: string;
  paymentStatus: string;
  amountCents: number;
  relatedBusinessName: string;
  relatedReferralId: number | null;
  relatedSalesLeadId: number | null;
  approvedAt: string | null;
  paidAt: string | null;
  createdAt: string;
};

export type NetworkCommandSalesLeadInput = {
  id: number;
  partnerId: number;
  sourceReferralId: number | null;
  companyName: string;
  status: string;
  nextFollowUp: string | null;
};

export type NetworkCommandPolicyInput = {
  performanceBonusEnabled: boolean;
  performanceBonusAmountCents: number;
  performanceBonusProjectCount: number;
  performanceBonusWindowDays: number;
};

export type NetworkCommandPartnerRecord = {
  id: number;
  displayName: string;
  status: "active" | "inactive";
  notes: string | null;
  submittedLeads: number;
  qualifiedLeads: number;
  bookedCalls: number;
  wonClients: number;
  approvedEarningsCents: number;
  paidEarningsCents: number;
  pendingApprovalCents: number;
  qualifiedRate: NetworkCommandRate;
  discoveryRate: NetworkCommandRate;
  wonRate: NetworkCommandRate;
  lastActivity: NetworkCommandActivity | null;
  nextAction: NetworkCommandAction;
  signal: NetworkCommandSignal;
  signalExplanation: string;
  highPotential: { sentence: string } | null;
  bonusProgress: {
    count: number;
    required: number;
    windowDays: number;
    amountCents: number;
    alreadyOnLedger: boolean;
    sentence: string;
  } | null;
  referrals: NetworkCommandReferralInput[];
  bookings: NetworkCommandBookingInput[];
  earnings: NetworkCommandEarningInput[];
};

export type NetworkCommandWorkspace = {
  generatedAt: string;
  activePartners: NetworkCommandPartnerRecord[];
  inactivePartners: NetworkCommandPartnerRecord[];
  networkDecision: NetworkCommandAction;
};

export type NetworkCommandInput = {
  profiles: NetworkCommandProfileInput[];
  referrals: NetworkCommandReferralInput[];
  bookings: NetworkCommandBookingInput[];
  notes: NetworkCommandNoteInput[];
  earnings: NetworkCommandEarningInput[];
  salesLeads: NetworkCommandSalesLeadInput[];
  policy: NetworkCommandPolicyInput;
  now?: Date;
};

function relTimeMs(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

function actionRank(kind: NetworkCommandActionKind): number {
  return NETWORK_COMMAND_ACTION_KINDS.indexOf(kind);
}

function noneAction(partnerId: number, partnerName: string): NetworkCommandAction {
  return {
    kind: "none",
    partnerId,
    partnerName,
    label: "No action waiting",
    explanation: "No operator decision is waiting on this partner.",
    at: "",
  };
}

function formatUsd(cents: number): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(dollars);
}

function projectCommissionKey(row: NetworkCommandEarningInput): string {
  if (row.relatedReferralId) return `r:${row.relatedReferralId}`;
  if (row.relatedSalesLeadId) return `s:${row.relatedSalesLeadId}`;
  return `b:${row.relatedBusinessName.trim().toLowerCase()}`;
}

function earningWindowAt(row: NetworkCommandEarningInput): number | null {
  return relTimeMs(row.paidAt) ?? relTimeMs(row.approvedAt);
}

function isClosedSalesStatus(status: string): boolean {
  return status === "won" || status === "lost";
}

function visibilityLabel(state: string): string {
  if (state in PARTNER_VISIBILITY_LABELS) {
    return PARTNER_VISIBILITY_LABELS[state as PartnerVisibilityState];
  }
  return state;
}

function collectActivities(input: {
  referrals: NetworkCommandReferralInput[];
  notes: NetworkCommandNoteInput[];
  bookings: NetworkCommandBookingInput[];
  earnings: NetworkCommandEarningInput[];
}): NetworkCommandActivity[] {
  const items: NetworkCommandActivity[] = [];
  for (const row of input.referrals) {
    items.push({
      at: row.createdAt,
      kind: "introduction",
      label: `Introduction · ${row.businessName}`,
    });
  }
  for (const row of input.notes) {
    const referral = input.referrals.find((r) => r.id === row.referralId);
    items.push({
      at: row.createdAt,
      kind: "note",
      label: referral
        ? `Partner note · ${referral.businessName}`
        : "Partner note",
    });
  }
  for (const row of input.bookings) {
    items.push({
      at: row.createdAt,
      kind: "booking",
      label: row.slotStart
        ? `Discovery booking · ${row.slotStart}`
        : "Discovery booking request",
    });
  }
  for (const row of input.earnings) {
    items.push({
      at: row.createdAt,
      kind: "earning",
      label: `Ledger · ${row.relatedBusinessName}`,
    });
  }
  return items
    .filter((item) => relTimeMs(item.at) != null)
    .sort((a, b) => (relTimeMs(b.at) ?? 0) - (relTimeMs(a.at) ?? 0));
}

function bonusProgressFor(
  earnings: NetworkCommandEarningInput[],
  policy: NetworkCommandPolicyInput,
  nowMs: number,
): NetworkCommandPartnerRecord["bonusProgress"] {
  if (!policy.performanceBonusEnabled) return null;
  const windowMs = policy.performanceBonusWindowDays * 24 * HOUR_MS;
  const windowStart = nowMs - windowMs;

  const keys = new Set<string>();
  for (const row of earnings) {
    if (row.earningType !== "project_commission") continue;
    if (row.paymentStatus !== "approved" && row.paymentStatus !== "paid") continue;
    const at = earningWindowAt(row);
    if (at == null || at < windowStart) continue;
    keys.add(projectCommissionKey(row));
  }

  const alreadyOnLedger = earnings.some((row) => {
    if (row.earningType !== "performance_bonus") return false;
    if (row.paymentStatus === "void") return false;
    const at = earningWindowAt(row) ?? relTimeMs(row.createdAt);
    return at != null && at >= windowStart;
  });

  const count = keys.size;
  if (count === 0 && !alreadyOnLedger) return null;
  const required = policy.performanceBonusProjectCount;
  const amount = formatUsd(policy.performanceBonusAmountCents);
  const sentence = alreadyOnLedger
    ? `A performance bonus is already on the ledger for this ${policy.performanceBonusWindowDays}-day window.`
    : `${count} of ${required} approved project commissions in the last ${policy.performanceBonusWindowDays} days. The bonus is ${amount} and is still a ledger entry you approve.`;

  return {
    count,
    required,
    windowDays: policy.performanceBonusWindowDays,
    amountCents: policy.performanceBonusAmountCents,
    alreadyOnLedger,
    sentence,
  };
}

function partnerActions(input: {
  profile: NetworkCommandProfileInput;
  referrals: NetworkCommandReferralInput[];
  bookings: NetworkCommandBookingInput[];
  earnings: NetworkCommandEarningInput[];
  salesLeads: NetworkCommandSalesLeadInput[];
  nowMs: number;
}): NetworkCommandAction[] {
  const partnerId = input.profile.id;
  const partnerName = input.profile.displayName;
  const actions: NetworkCommandAction[] = [];

  for (const row of input.earnings) {
    if (row.paymentStatus !== "pending_approval") continue;
    actions.push({
      kind: "approve_earning",
      partnerId,
      partnerName,
      label: `Review earning for ${row.relatedBusinessName}`,
      explanation: `Pending ledger entry #${row.id} · ${row.relatedBusinessName} · ${formatUsd(row.amountCents)}.`,
      at: row.createdAt,
      earningId: row.id,
    });
  }

  for (const row of input.bookings) {
    if (
      row.status !== "submitted" &&
      row.status !== "reschedule_requested" &&
      row.status !== "cancel_requested"
    ) {
      continue;
    }
    const statusLabel =
      row.status === "submitted"
        ? "open booking request"
        : row.status.replaceAll("_", " ");
    actions.push({
      kind: "review_booking",
      partnerId,
      partnerName,
      label: `Review ${statusLabel}`,
      explanation: `Booking #${row.id} is ${statusLabel}.`,
      at: row.createdAt,
      bookingId: row.id,
      referralId: row.relatedReferralId ?? undefined,
    });
  }

  for (const row of input.referrals) {
    const created = relTimeMs(row.createdAt);
    const stale =
      created != null && input.nowMs - created >= STALE_INTRO_MS;
    const waiting =
      row.visibilityState === "submitted" || row.internalStatus === "new";
    if (!stale || !waiting) continue;
    actions.push({
      kind: "review_introduction",
      partnerId,
      partnerName,
      label: `Review ${row.businessName}`,
      explanation: `Introduction #${row.id} · ${row.businessName} has been waiting more than 48 hours.`,
      at: row.createdAt,
      referralId: row.id,
      salesLeadId: row.promotedSalesLeadId ?? undefined,
    });
  }

  for (const row of input.referrals) {
    if (row.visibilityState !== "qualified") continue;
    const relatedOpen = input.bookings.some(
      (booking) =>
        booking.relatedReferralId === row.id &&
        isOpenPartnerBookingStatus(booking.status),
    );
    if (relatedOpen) continue;
    actions.push({
      kind: "book_discovery",
      partnerId,
      partnerName,
      label: `Discovery still open for ${row.businessName}`,
      explanation: `${row.businessName} is qualified. No discovery booking is on the record.`,
      at: row.createdAt,
      referralId: row.id,
      salesLeadId: row.promotedSalesLeadId ?? undefined,
    });
  }

  for (const lead of input.salesLeads) {
    if (isClosedSalesStatus(lead.status)) continue;
    const due = relTimeMs(lead.nextFollowUp);
    if (due == null || due >= input.nowMs) continue;
    actions.push({
      kind: "sales_follow_up",
      partnerId,
      partnerName,
      label: `Follow up ${lead.companyName}`,
      explanation: `Sales lead #${lead.id} · ${lead.companyName} has a follow-up that is past due.`,
      at: lead.nextFollowUp ?? lead.companyName,
      salesLeadId: lead.id,
      referralId: lead.sourceReferralId ?? undefined,
    });
  }

  for (const row of input.referrals) {
    const lead = input.salesLeads.find(
      (item) =>
        item.sourceReferralId === row.id ||
        item.id === row.promotedSalesLeadId,
    );
    const referralWon = row.visibilityState === "won";
    const salesWon = lead?.status === "won";
    if (referralWon === salesWon) continue;
    actions.push({
      kind: "won_mismatch",
      partnerId,
      partnerName,
      label: `Reconcile won status for ${row.businessName}`,
      explanation: salesWon
        ? `${row.businessName} is won in Sales, but partner visibility is ${visibilityLabel(row.visibilityState)}.`
        : `${row.businessName} is marked won for the partner, but Sales is not won.`,
      at: row.createdAt,
      referralId: row.id,
      salesLeadId: lead?.id ?? row.promotedSalesLeadId ?? undefined,
    });
  }

  actions.sort((a, b) => {
    const rank = actionRank(a.kind) - actionRank(b.kind);
    if (rank !== 0) return rank;
    return (relTimeMs(a.at) ?? 0) - (relTimeMs(b.at) ?? 0);
  });
  return actions;
}

function highPotentialSentence(input: {
  path: ReturnType<typeof countPartnerPathMetrics>;
  qualifiedRate: NetworkCommandRate;
  paidEarningsCents: number;
  bonusCount: number;
  hasConfirmedDecisionMaker: boolean;
}): string {
  const facts: string[] = [];
  if (input.path.wonClients > 0) {
    facts.push(
      `${input.path.wonClients} client${input.path.wonClients === 1 ? "" : "s"} won`,
    );
  } else if (
    input.path.submittedLeads >= 3 &&
    input.qualifiedRate.percent != null &&
    input.qualifiedRate.percent >= 50
  ) {
    facts.push(
      `${input.qualifiedRate.numerator} of ${input.qualifiedRate.denominator} introductions qualified`,
    );
  }
  if (input.paidEarningsCents > 0) {
    facts.push(`${formatUsd(input.paidEarningsCents)} paid`);
  }
  if (input.hasConfirmedDecisionMaker) {
    facts.push("a confirmed decision-maker on a qualified or won introduction");
  }
  if (input.bonusCount >= 2) {
    facts.push(`${input.bonusCount} approved project commissions toward the bonus`);
  }
  return `${facts.join("; ")}. A reading of the record. Not a hiring decision.`;
}

function meetsHighPotentialGate(input: {
  path: ReturnType<typeof countPartnerPathMetrics>;
  qualifiedRate: NetworkCommandRate;
  paidEarningsCents: number;
  bonusCount: number;
  hasConfirmedDecisionMaker: boolean;
  lastActivityMs: number | null;
  nowMs: number;
}): boolean {
  const volume =
    input.path.wonClients > 0 ||
    (input.path.submittedLeads >= 3 &&
      input.qualifiedRate.percent != null &&
      input.qualifiedRate.percent >= 50);
  const proof =
    input.paidEarningsCents > 0 ||
    input.hasConfirmedDecisionMaker ||
    input.bonusCount >= 2;
  const recent =
    input.lastActivityMs != null &&
    input.nowMs - input.lastActivityMs <= HIGH_POTENTIAL_ACTIVITY_MS;
  return volume && proof && recent;
}

function derivePartnerRecord(input: {
  profile: NetworkCommandProfileInput;
  referrals: NetworkCommandReferralInput[];
  bookings: NetworkCommandBookingInput[];
  notes: NetworkCommandNoteInput[];
  earnings: NetworkCommandEarningInput[];
  salesLeads: NetworkCommandSalesLeadInput[];
  policy: NetworkCommandPolicyInput;
  nowMs: number;
}): NetworkCommandPartnerRecord {
  const openBookingCount = input.bookings.filter((row) =>
    isOpenPartnerBookingStatus(row.status),
  ).length;
  const path = countPartnerPathMetrics({
    visibilityStates: input.referrals.map((row) => row.visibilityState),
    openBookingCount,
  });
  const qualifiedRate = partnerConversionRate(
    path.qualifiedLeads,
    path.submittedLeads,
  );
  const discoveryRate = partnerConversionRate(
    path.bookedFromLeads,
    path.qualifiedLeads,
  );
  const wonRate = partnerConversionRate(path.wonClients, path.bookedFromLeads);

  let paidEarningsCents = 0;
  let approvedOutstandingCents = 0;
  let pendingApprovalCents = 0;
  for (const row of input.earnings) {
    if (!Number.isFinite(row.amountCents) || row.amountCents < 0) continue;
    if (row.paymentStatus === "pending_approval") {
      pendingApprovalCents += row.amountCents;
      continue;
    }
    if (row.paymentStatus === "void") continue;
    if (row.paymentStatus === "paid") paidEarningsCents += row.amountCents;
    if (row.paymentStatus === "approved") {
      approvedOutstandingCents += row.amountCents;
    }
  }

  const activities = collectActivities(input);
  const lastActivity = activities[0] ?? null;
  const lastActivityMs = relTimeMs(lastActivity?.at);
  const actions = partnerActions({
    profile: input.profile,
    referrals: input.referrals,
    bookings: input.bookings,
    earnings: input.earnings,
    salesLeads: input.salesLeads,
    nowMs: input.nowMs,
  });
  const nextAction = actions[0] ?? noneAction(input.profile.id, input.profile.displayName);
  const bonus = bonusProgressFor(input.earnings, input.policy, input.nowMs);

  const hasConfirmedDecisionMaker = input.referrals.some(
    (row) =>
      row.decisionMakerConfirmed === true &&
      (isQualifiedPartnerVisibility(row.visibilityState) ||
        row.visibilityState === "won"),
  );

  const highPotentialEligible = meetsHighPotentialGate({
    path,
    qualifiedRate,
    paidEarningsCents,
    bonusCount: bonus?.count ?? 0,
    hasConfirmedDecisionMaker,
    lastActivityMs,
    nowMs: input.nowMs,
  });

  let signal: NetworkCommandSignal = null;
  let signalExplanation = "No action waiting.";

  if (nextAction.kind !== "none") {
    signal = "needs_review";
    signalExplanation = nextAction.explanation;
  } else if (input.profile.status === "active" && path.submittedLeads === 0) {
    signal = "onboarding";
    signalExplanation = "Active. No introductions yet.";
  } else if (
    path.submittedLeads > 0 &&
    lastActivityMs != null &&
    input.nowMs - lastActivityMs <= MOMENTUM_WINDOW_MS
  ) {
    signal = "building_momentum";
    signalExplanation = lastActivity
      ? `Latest record: ${lastActivity.label}.`
      : "Recent introductions are on the record.";
  } else if (nextAction.kind === "none") {
    signalExplanation = lastActivity
      ? `${lastActivity.label}. No action waiting.`
      : "No action waiting.";
  }

  const highPotential =
    highPotentialEligible && input.profile.status === "active"
      ? {
          sentence: highPotentialSentence({
            path,
            qualifiedRate,
            paidEarningsCents,
            bonusCount: bonus?.count ?? 0,
            hasConfirmedDecisionMaker,
          }),
        }
      : null;

  return {
    id: input.profile.id,
    displayName: input.profile.displayName,
    status: input.profile.status,
    notes: input.profile.notes,
    submittedLeads: path.submittedLeads,
    qualifiedLeads: path.qualifiedLeads,
    bookedCalls: path.bookedCalls,
    wonClients: path.wonClients,
    approvedEarningsCents: approvedOutstandingCents + paidEarningsCents,
    paidEarningsCents,
    pendingApprovalCents,
    qualifiedRate,
    discoveryRate,
    wonRate,
    lastActivity,
    nextAction,
    signal,
    signalExplanation,
    highPotential,
    bonusProgress: bonus,
    referrals: input.referrals,
    bookings: input.bookings,
    earnings: input.earnings,
  };
}

function pickNetworkDecision(
  partners: NetworkCommandPartnerRecord[],
): NetworkCommandAction {
  const waiting = partners
    .filter((partner) => partner.nextAction.kind !== "none")
    .map((partner) => partner.nextAction)
    .sort((a, b) => {
      const rank = actionRank(a.kind) - actionRank(b.kind);
      if (rank !== 0) return rank;
      return (relTimeMs(a.at) ?? 0) - (relTimeMs(b.at) ?? 0);
    });
  return (
    waiting[0] ?? {
      kind: "none",
      partnerId: 0,
      partnerName: "",
      label: "Nothing is waiting",
      explanation: "No operator decision is waiting across the active network.",
      at: "",
    }
  );
}

export function deriveNetworkCommand(
  input: NetworkCommandInput,
): NetworkCommandWorkspace {
  const now = input.now ?? new Date();
  const nowMs = now.getTime();
  const records = input.profiles
    .map((profile) =>
      derivePartnerRecord({
        profile,
        referrals: input.referrals.filter((row) => row.partnerId === profile.id),
        bookings: input.bookings.filter((row) => row.partnerId === profile.id),
        notes: input.notes.filter((row) => row.partnerId === profile.id),
        earnings: input.earnings.filter((row) => row.partnerId === profile.id),
        salesLeads: input.salesLeads.filter((row) => row.partnerId === profile.id),
        policy: input.policy,
        nowMs,
      }),
    )
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  const activePartners = records.filter((row) => row.status === "active");
  const inactivePartners = records.filter((row) => row.status === "inactive");

  return {
    generatedAt: now.toISOString(),
    activePartners,
    inactivePartners,
    networkDecision: pickNetworkDecision(activePartners),
  };
}

export function selectNetworkCommandPartner(
  workspace: NetworkCommandWorkspace,
  partnerId: number | null,
): NetworkCommandPartnerRecord | null {
  const all = [...workspace.activePartners, ...workspace.inactivePartners];
  if (partnerId && all.some((row) => row.id === partnerId)) {
    return all.find((row) => row.id === partnerId) ?? null;
  }
  if (workspace.networkDecision.partnerId) {
    return (
      all.find((row) => row.id === workspace.networkDecision.partnerId) ?? null
    );
  }
  return workspace.activePartners[0] ?? workspace.inactivePartners[0] ?? null;
}
