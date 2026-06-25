import type { ClientLaunchStepId } from "./types";

export const LAUNCH_STEPS: { id: ClientLaunchStepId; label: string; short: string }[] = [
  { id: "business", label: "Business", short: "01" },
  { id: "contacts", label: "Contacts", short: "02" },
  { id: "financial", label: "Financial", short: "03" },
  { id: "services", label: "Services", short: "04" },
  { id: "technical", label: "Technical", short: "05" },
  { id: "executive", label: "Executive", short: "06" },
  { id: "roadmap", label: "Roadmap", short: "07" },
  { id: "review", label: "Review", short: "08" },
];

export const LAUNCH_SERVICE_OPTIONS = [
  "Website",
  "Branding",
  "SEO",
  "Google Ads",
  "Analytics",
  "CRM",
  "Automation",
  "Hosting",
  "Maintenance",
  "Content",
  "Photography",
  "Video",
  "Strategy",
  "Email Marketing",
  "Custom Platform",
  "Portal",
] as const;

export const LAUNCH_DRAFT_STORAGE_KEY = "kxd-client-launch-draft-v1";

export const LAUNCH_C = {
  bgBase: "#080808",
  bgElevated: "#0B0B0B",
  gold: "#C9A962",
  goldDim: "rgba(201,169,98,0.55)",
  cream: "#F5F1E8",
  creamMuted: "rgba(245,241,232,0.72)",
  red: "#d25a5a",
  border: "rgba(255,255,255,0.08)",
  borderGold: "rgba(201,169,98,0.16)",
  borderFocus: "rgba(201,169,98,0.55)",
  serif: "var(--font-cormorant, Georgia, 'Times New Roman', serif)",
  sans: "var(--font-outfit, 'Helvetica Neue', Arial, sans-serif)",
} as const;
