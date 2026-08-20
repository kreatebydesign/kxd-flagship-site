/**
 * Opportunity Intelligence — structured Research Desk fields + promote snapshot.
 * Research remains source of truth; Sales only receives a human-readable activity note.
 */

export const RESEARCH_TRIGGER_TYPES = [
  { value: "expansion", label: "Expansion" },
  { value: "second-location", label: "Second location" },
  { value: "reopening", label: "Reopening" },
  { value: "new-ownership", label: "New ownership" },
  { value: "acquisition", label: "Acquisition" },
  { value: "relocation", label: "Relocation" },
  { value: "renovation", label: "Renovation" },
  { value: "hiring", label: "Hiring / growth" },
  { value: "advertising", label: "Active advertising" },
  { value: "other", label: "Other" },
] as const;

export type ResearchTriggerType = (typeof RESEARCH_TRIGGER_TYPES)[number]["value"];

export const RESEARCH_RECOMMENDED_CHANNELS = [
  { value: "call", label: "Call" },
  { value: "email", label: "Email" },
  { value: "form", label: "Contact form" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "social-dm", label: "Social DM" },
  { value: "referral", label: "Referral" },
] as const;

export type ResearchRecommendedChannel =
  (typeof RESEARCH_RECOMMENDED_CHANNELS)[number]["value"];

export const RESEARCH_URGENCIES = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
] as const;

export type ResearchUrgency = (typeof RESEARCH_URGENCIES)[number]["value"];

export const RESEARCH_COMMERCIAL_BANDS = [
  { value: "7.5k-plus", label: "$7,500+" },
  { value: "2.5-7.5k", label: "$2,500–$7,500" },
  { value: "0.75-2.5k", label: "$750–$2,500" },
  { value: "unclear", label: "Unclear" },
] as const;

export type ResearchCommercialBand =
  (typeof RESEARCH_COMMERCIAL_BANDS)[number]["value"];

export const RESEARCH_TRIGGER_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  RESEARCH_TRIGGER_TYPES.map((t) => [t.value, t.label]),
);

export const RESEARCH_RECOMMENDED_CHANNEL_LABEL: Record<string, string> =
  Object.fromEntries(RESEARCH_RECOMMENDED_CHANNELS.map((c) => [c.value, c.label]));

export const RESEARCH_URGENCY_LABEL: Record<string, string> = Object.fromEntries(
  RESEARCH_URGENCIES.map((u) => [u.value, u.label]),
);

export const RESEARCH_COMMERCIAL_BAND_LABEL: Record<string, string> = Object.fromEntries(
  RESEARCH_COMMERCIAL_BANDS.map((b) => [b.value, b.label]),
);

export type OpportunityIntelligenceSnapshotInput = {
  grade?: string | null;
  triggerType?: string | null;
  eventDate?: string | null;
  digitalGap?: string | null;
  urgency?: string | null;
  commercialBand?: string | null;
  recommendedChannel?: string | null;
};

function formatEventDate(iso: string | null | undefined): string | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    const trimmed = iso.trim();
    return trimmed || null;
  }
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/**
 * Build a compact Sales activity summary from populated OI fields only.
 * Empty/null values are omitted — never emit "Grade: null" style lines.
 */
export function buildOpportunityIntelligencePromoteSummary(
  input: OpportunityIntelligenceSnapshotInput,
): string | null {
  const lines: string[] = [];

  if (input.grade?.trim()) {
    lines.push(`Grade: ${input.grade.trim()}`);
  }

  const trigger = input.triggerType?.trim();
  if (trigger) {
    lines.push(`Trigger: ${RESEARCH_TRIGGER_TYPE_LABEL[trigger] ?? trigger}`);
  }

  const eventLabel = formatEventDate(input.eventDate);
  if (eventLabel) {
    lines.push(`Event: ${eventLabel}`);
  }

  const gap = input.digitalGap?.trim();
  if (gap) {
    lines.push(`Digital gap: ${gap}`);
  }

  const urgency = input.urgency?.trim();
  if (urgency) {
    lines.push(`Urgency: ${RESEARCH_URGENCY_LABEL[urgency] ?? urgency}`);
  }

  const band = input.commercialBand?.trim();
  if (band) {
    lines.push(
      `Commercial potential: ${RESEARCH_COMMERCIAL_BAND_LABEL[band] ?? band}`,
    );
  }

  const channel = input.recommendedChannel?.trim();
  if (channel) {
    lines.push(
      `Recommended first contact: ${RESEARCH_RECOMMENDED_CHANNEL_LABEL[channel] ?? channel}`,
    );
  }

  return lines.length > 0 ? lines.join("\n") : null;
}
