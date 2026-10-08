/**
 * Partner-scoped browser keys + Home path helpers for Member Record.
 * Client-safe. Never share values across partners.
 */

export const PARTNER_INTRO_ACK_STORAGE_PREFIX = "kxd-partner-intro-ack-v1";
export const PARTNER_PAID_SEEN_STORAGE_PREFIX = "kxd-partner-paid-seen-v1";

export function partnerIntroAckStorageKey(partnerId: number): string {
  return `${PARTNER_INTRO_ACK_STORAGE_PREFIX}:${partnerId}`;
}

export function partnerPaidSeenStorageKey(partnerId: number): string {
  return `${PARTNER_PAID_SEEN_STORAGE_PREFIX}:${partnerId}`;
}

/** Operating path only — Paid is a separate ledger fact. */
export type PartnerPathStageId =
  | "introduction"
  | "qualified"
  | "discovery"
  | "won";

export type PartnerPathStageRole = "complete" | "current" | "future";

export type PartnerPathStage = {
  id: PartnerPathStageId;
  label: string;
  value: string;
  count: number;
  role: PartnerPathStageRole;
};

const PATH_ORDER: PartnerPathStageId[] = [
  "introduction",
  "qualified",
  "discovery",
  "won",
];

export function resolveCurrentPathStage(input: {
  submittedLeads: number;
  qualifiedLeads: number;
  bookedCalls: number;
  wonClients: number;
}): PartnerPathStageId {
  if (input.submittedLeads <= 0) return "introduction";
  if (input.qualifiedLeads <= 0) return "qualified";
  if (input.bookedCalls <= 0) return "discovery";
  if (input.wonClients <= 0) return "won";
  return "won";
}

export function operatingChapterLabel(
  stageId: PartnerPathStageId,
  submittedLeads: number,
): string {
  switch (stageId) {
    case "introduction":
      return submittedLeads <= 0 ? "First introduction" : "Introduction";
    case "qualified":
      return "Qualification";
    case "discovery":
      return "Discovery";
    case "won":
      return "Client won";
    default:
      return "Introduction";
  }
}

export function buildPartnerPathStages(input: {
  submittedLeads: number;
  qualifiedLeads: number;
  bookedCalls: number;
  wonClients: number;
}): PartnerPathStage[] {
  const current = resolveCurrentPathStage(input);
  const currentIdx = PATH_ORDER.indexOf(current);
  const counts: Record<PartnerPathStageId, number> = {
    introduction: input.submittedLeads,
    qualified: input.qualifiedLeads,
    discovery: input.bookedCalls,
    won: input.wonClients,
  };
  const labels: Record<PartnerPathStageId, string> = {
    introduction: "Introduction",
    qualified: "Qualified",
    discovery: "Discovery",
    won: "Client won",
  };

  return PATH_ORDER.map((id, idx) => {
    let role: PartnerPathStageRole = "future";
    if (idx < currentIdx) role = "complete";
    else if (idx === currentIdx) role = "current";
    return {
      id,
      label: labels[id],
      value: String(counts[id]),
      count: counts[id],
      role,
    };
  });
}
