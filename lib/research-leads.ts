/**
 * lib/research-leads.ts
 * Lead Research Desk — shared labels and options
 */

export {
  normalizeResearchIntake,
  resolveResearchContactDisplay,
  classifyLegacyLeadUrl,
  looksLikeEmail,
  looksLikeHttpUrl,
  type ResearchIntakeInput,
  type NormalizedResearchIntake,
  type ResearchIntakeResult,
} from "./research-leads/intake";

export {
  OPPORTUNITIES_HREF,
  compareOpportunitiesForRevenue,
  emptyOpportunitySummaryCounts,
  isHistoryOpportunityStatus,
  loadOpportunityDeskMetrics,
  loadOpportunitySummaryCounts,
  resolveOpportunityPrimaryAction,
  type OpportunityPrimaryAction,
  type OpportunitySummaryCounts,
} from "./research-leads/opportunity-presentation";

export {
  RESEARCH_TRIGGER_TYPES,
  RESEARCH_RECOMMENDED_CHANNELS,
  RESEARCH_URGENCIES,
  RESEARCH_COMMERCIAL_BANDS,
  RESEARCH_TRIGGER_TYPE_LABEL,
  RESEARCH_RECOMMENDED_CHANNEL_LABEL,
  RESEARCH_URGENCY_LABEL,
  RESEARCH_COMMERCIAL_BAND_LABEL,
  buildOpportunityIntelligencePromoteSummary,
  type ResearchTriggerType,
  type ResearchRecommendedChannel,
  type ResearchUrgency,
  type ResearchCommercialBand,
  type OpportunityIntelligenceSnapshotInput,
} from "./research-leads/opportunity-intelligence";

export const RESEARCH_RESEARCHERS = [
  { value: "Matt", label: "Matt" },
  { value: "Sasha", label: "Sasha" },
  { value: "Harlow", label: "Harlow" },
] as const;

export type ResearchResearcher = (typeof RESEARCH_RESEARCHERS)[number]["value"];

export const RESEARCH_LEAD_SOURCES = [
  { value: "Craigslist", label: "Craigslist" },
  { value: "Manual Research", label: "Manual Research" },
  { value: "Referral", label: "Referral" },
  { value: "Other", label: "Other" },
] as const;

export const RESEARCH_STATUSES = [
  { value: "new", label: "New" },
  { value: "reviewing", label: "Reviewing" },
  { value: "qualified", label: "Qualified" },
  { value: "rejected", label: "Rejected" },
  { value: "contacted", label: "Contacted" },
  { value: "closed-won", label: "Closed Won" },
  { value: "closed-lost", label: "Closed Lost" },
] as const;

export const RESEARCH_SERVICES = [
  { value: "website", label: "Website" },
  { value: "branding", label: "Branding" },
  { value: "seo", label: "SEO" },
  { value: "marketing", label: "Marketing" },
  { value: "crm", label: "CRM" },
  { value: "automation", label: "Automation" },
  { value: "other", label: "Other" },
] as const;

export type ResearchStatus = (typeof RESEARCH_STATUSES)[number]["value"];
export type ResearchService = (typeof RESEARCH_SERVICES)[number]["value"];

export const RESEARCH_STATUS_LABEL: Record<string, string> = Object.fromEntries(
  RESEARCH_STATUSES.map((s) => [s.value, s.label]),
);

export const RESEARCH_SERVICE_LABEL: Record<string, string> = Object.fromEntries(
  RESEARCH_SERVICES.map((s) => [s.value, s.label]),
);

export const RESEARCH_STATUS_COLOR: Record<string, string> = {
  new: "var(--kxd-os-text-secondary)",
  reviewing: "var(--kxd-os-warning)",
  qualified: "var(--kxd-os-text-primary)",
  rejected: "var(--kxd-os-critical)",
  contacted: "var(--kxd-os-accent)",
  "closed-won": "var(--kxd-os-success)",
  "closed-lost": "var(--kxd-os-text-faint)",
};

export const RESEARCH_GRADES = [
  { value: "A+", label: "A+" },
  { value: "A", label: "A" },
  { value: "B", label: "B" },
  { value: "C", label: "C" },
  { value: "D", label: "D" },
  { value: "F", label: "F" },
] as const;

export type ResearchGrade = (typeof RESEARCH_GRADES)[number]["value"];

export const RESEARCH_REJECT_REASONS = [
  { value: "spam", label: "Spam" },
  { value: "international", label: "International" },
  { value: "commission-only", label: "Commission-only" },
  { value: "internship", label: "Internship" },
  { value: "barter", label: "Barter" },
  { value: "crypto", label: "Crypto" },
  { value: "recruiter", label: "Recruiter" },
  { value: "duplicate", label: "Duplicate" },
  { value: "irrelevant", label: "Irrelevant" },
  { value: "low-value", label: "Low-value" },
  { value: "other", label: "Other" },
] as const;

export type ResearchRejectReason = (typeof RESEARCH_REJECT_REASONS)[number]["value"];

export const RESEARCH_REJECT_REASON_LABEL: Record<string, string> = Object.fromEntries(
  RESEARCH_REJECT_REASONS.map((r) => [r.value, r.label]),
);

export const RESEARCH_GRADE_COLOR: Record<string, string> = {
  "A+": "var(--kxd-os-success)",
  A: "var(--kxd-os-success)",
  B: "var(--kxd-os-text-primary)",
  C: "var(--kxd-os-warning)",
  D: "var(--kxd-os-critical)",
  F: "var(--kxd-os-critical)",
};
