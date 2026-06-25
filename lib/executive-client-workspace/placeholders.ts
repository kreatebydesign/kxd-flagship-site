/**
 * Placeholder workspace modules — keyed by client slug until dedicated collections exist.
 * Future: ClientTimelineEvents, ClientRoadmapItems, Marketing modules.
 */

export type TimelineEventType =
  | "client-launch"
  | "website-launch"
  | "portal-launch"
  | "seo-audit"
  | "google-ads"
  | "meeting"
  | "invoice-paid"
  | "deployment"
  | "feature-request"
  | "review-received"
  | "domain-renewal"
  | "referral"
  | "client-milestone";

export interface PlaceholderTimelineEvent {
  id: string;
  type: TimelineEventType;
  title: string;
  summary: string;
  date: string;
  source?: string;
}

export interface PlaceholderRoadmap {
  current: string[];
  next: string[];
  future: string[];
  completed: string[];
}

const TIMELINE_TYPE_LABEL: Record<TimelineEventType, string> = {
  "client-launch": "Client Launch",
  "website-launch": "Website Launch",
  "portal-launch": "Portal Launch",
  "seo-audit": "SEO Audit",
  "google-ads": "Google Ads",
  meeting: "Meeting",
  "invoice-paid": "Invoice Paid",
  deployment: "Deployment",
  "feature-request": "Feature Request",
  "review-received": "Review Received",
  "domain-renewal": "Domain Renewal",
  referral: "Referral",
  "client-milestone": "Client Milestone",
};

export function timelineTypeLabel(type: TimelineEventType): string {
  return TIMELINE_TYPE_LABEL[type];
}

/** Seeded placeholder timeline — Primal Motorsports only. */
const PRIMAL_TIMELINE: PlaceholderTimelineEvent[] = [
  {
    id: "primal-1",
    type: "client-milestone",
    title: "Flagship partnership established",
    summary: "KXD anchor client — multi-system platform scope defined.",
    date: "2024-08-15",
    source: "Executive profile",
  },
  {
    id: "primal-2",
    type: "website-launch",
    title: "New KXD website build initiated",
    summary: "Premium motorsports site rebuild — awaiting client revisions before launch.",
    date: "2025-11-01",
    source: "ClientProjects",
  },
  {
    id: "primal-3",
    type: "deployment",
    title: "MotorsportReg API integration",
    summary: "Registration and API connection management in progress.",
    date: "2026-02-10",
    source: "Technical module",
  },
  {
    id: "primal-4",
    type: "google-ads",
    title: "Google Ads campaign active",
    summary: "Campaign under prior agreement — renewal recommendation needed before end of month.",
    date: "2026-03-01",
    source: "Marketing module (future)",
  },
  {
    id: "primal-5",
    type: "meeting",
    title: "Adam — website priority alignment",
    summary: "Dial in website before deeper portal and licensing discussions.",
    date: "2026-04-12",
    source: "Executive notes",
  },
  {
    id: "primal-6",
    type: "feature-request",
    title: "Driver portal / Primal OS foundation",
    summary: "CRM and driver workflow foundation scoped for post-launch expansion.",
    date: "2026-05-01",
    source: "Projects module",
  },
];

const PRIMAL_ROADMAP: PlaceholderRoadmap = {
  current: ["Website revisions and launch"],
  next: ["Google Ads renewal recommendation"],
  future: ["Portal expansion", "Driver OS", "Licensing discussion"],
  completed: [],
};

const TIMELINE_BY_SLUG: Record<string, PlaceholderTimelineEvent[]> = {
  "primal-motorsports": PRIMAL_TIMELINE,
};

const ROADMAP_BY_SLUG: Record<string, PlaceholderRoadmap> = {
  "primal-motorsports": PRIMAL_ROADMAP,
};

export function getPlaceholderTimeline(slug: string | null): PlaceholderTimelineEvent[] {
  if (!slug) return [];
  return TIMELINE_BY_SLUG[slug] ?? [];
}

export function getPlaceholderRoadmap(slug: string | null): PlaceholderRoadmap | null {
  if (!slug) return null;
  return ROADMAP_BY_SLUG[slug] ?? null;
}

/** Future marketing module sections — placeholder labels only. */
export const MARKETING_MODULE_SECTIONS = [
  "SEO",
  "Google Ads",
  "Email Marketing",
  "Reviews",
  "Lead Magnets",
  "Campaigns",
  "Analytics Summary",
] as const;
