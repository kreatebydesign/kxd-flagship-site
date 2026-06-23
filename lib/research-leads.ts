/**
 * lib/research-leads.ts
 * Lead Research Desk — shared labels and options
 */

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
  new: "#8a9bd2",
  reviewing: "#f0be50",
  qualified: "#96d2c8",
  rejected: "#d25a5a",
  contacted: "#C5A65C",
  "closed-won": "#5ec68c",
  "closed-lost": "rgba(255,255,255,0.35)",
};
