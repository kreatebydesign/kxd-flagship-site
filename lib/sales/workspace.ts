/**
 * Action-oriented Sales workspace loader.
 * Answers: who needs me, what next, where does it stand.
 */
import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import {
  ATTENTION_KIND_LABEL,
  attentionRank,
  deriveAttentionKind,
  type AttentionKind,
} from "./attention";
import {
  NEXT_ACTION_LABEL,
  isNextAction,
  type NextAction,
} from "./next-action";
import {
  SECTION_LABEL,
  STATUS_TO_SECTION,
  WORKSPACE_SECTIONS,
  type WorkspaceSectionId,
} from "./workspace-stages";
import type { SalesDoc } from "./types";
import { RESEARCH_SERVICE_LABEL } from "@/lib/research-leads";

export type SalesOpportunityCard = {
  id: number;
  companyName: string;
  contactName: string;
  email: string | null;
  phone: string | null;
  opportunityUrl: string | null;
  website: string | null;
  service: string | null;
  location: string | null;
  sourcedBy: string | null;
  sourceResearchLeadId: number | null;
  sourceInquiryId: number | null;
  sourceProjectInquiryId: number | null;
  sourceWebsiteAuditId: number | null;
  sourceLabel: string | null;
  status: string;
  sectionId: WorkspaceSectionId;
  sectionLabel: string;
  nextAction: NextAction;
  nextActionLabel: string;
  nextActionNote: string | null;
  nextFollowUp: string | null;
  assignedTo: string | null;
  lostReason: string | null;
  estimatedValue: number | null;
  updatedAt: string;
  createdAt: string;
  researchSubmittedAt: string | null;
  lastMeaningfulAt: string | null;
  attentionKind: AttentionKind | null;
  attentionLabel: string | null;
  ageLabel: string;
};

export type SalesWorkspaceSection = {
  id: WorkspaceSectionId;
  label: string;
  description: string;
  count: number;
  opportunities: SalesOpportunityCard[];
};

export type SalesWorkspaceData = {
  attention: SalesOpportunityCard[];
  sections: SalesWorkspaceSection[];
  totalOpen: number;
  totalValueOpen: number;
  recentCount: number;
};

function relId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id: unknown }).id;
    if (typeof id === "number") return id;
  }
  return null;
}

function ageLabel(iso: string | null | undefined): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const days = Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Today";
  if (days === 1) return "1 day old";
  if (days < 14) return `${days} days old`;
  if (days < 60) return `${Math.floor(days / 7)} wk old`;
  return `${Math.floor(days / 30)} mo old`;
}

function toCard(
  lead: SalesDoc,
  lastMeaningfulAt: string | null,
): SalesOpportunityCard {
  const status = String(lead.status ?? "new");
  const sectionId = STATUS_TO_SECTION[status] ?? "new-leads";
  const rawNext = String(lead.nextAction ?? "none");
  const nextAction: NextAction = isNextAction(rawNext) ? rawNext : "none";
  const opportunityUrl =
    (lead.opportunityUrl ? String(lead.opportunityUrl) : null) ||
    (lead.website && String(lead.website).startsWith("http") ? String(lead.website) : null);
  const rawService = lead.industry ? String(lead.industry) : null;
  const service = rawService
    ? RESEARCH_SERVICE_LABEL[rawService] ?? rawService
    : null;

  const sourceResearchLeadId = relId(lead.sourceResearchLead);
  const sourceInquiryId = relId(lead.sourceInquiry);
  const sourceProjectInquiryId = relId(lead.sourceProjectInquiry);
  const sourceWebsiteAuditId = relId(lead.sourceWebsiteAudit);
  const sourceLabel = sourceResearchLeadId
    ? "From research"
    : sourceInquiryId
      ? "From contact inquiry"
      : sourceProjectInquiryId
        ? "From start project"
        : sourceWebsiteAuditId
          ? "From website audit"
          : null;

  const nextFollowUp = lead.nextFollowUp ? String(lead.nextFollowUp) : null;
  const createdAt = String(lead.createdAt ?? "");
  const attentionKind = deriveAttentionKind({
    status,
    nextAction,
    nextFollowUp,
    createdAt,
    lastMeaningfulAt: lastMeaningfulAt || createdAt,
  });

  return {
    id: Number(lead.id),
    companyName: String(lead.companyName ?? "Prospect"),
    contactName: String(lead.contactName ?? "—"),
    email: lead.email ? String(lead.email) : null,
    phone: lead.phone ? String(lead.phone) : null,
    opportunityUrl,
    website: lead.website ? String(lead.website) : null,
    service,
    location: null,
    sourcedBy: lead.sourcedByName ? String(lead.sourcedByName) : null,
    sourceResearchLeadId,
    sourceInquiryId,
    sourceProjectInquiryId,
    sourceWebsiteAuditId,
    sourceLabel,
    status,
    sectionId,
    sectionLabel: SECTION_LABEL[sectionId],
    nextAction,
    nextActionLabel: NEXT_ACTION_LABEL[nextAction],
    nextActionNote: lead.nextActionNote ? String(lead.nextActionNote) : null,
    nextFollowUp,
    assignedTo: lead.assignedTo ? String(lead.assignedTo) : null,
    lostReason: lead.lostReason ? String(lead.lostReason) : null,
    estimatedValue:
      lead.estimatedValue != null && lead.estimatedValue !== ""
        ? Number(lead.estimatedValue)
        : null,
    updatedAt: String(lead.updatedAt ?? ""),
    createdAt,
    researchSubmittedAt: lead.researchSubmittedAt
      ? String(lead.researchSubmittedAt)
      : null,
    lastMeaningfulAt: lastMeaningfulAt || createdAt,
    attentionKind,
    attentionLabel: attentionKind ? ATTENTION_KIND_LABEL[attentionKind] : null,
    ageLabel: ageLabel(lead.researchSubmittedAt || createdAt),
  };
}

function cardAttentionScore(card: SalesOpportunityCard): number {
  return attentionRank(card.attentionKind, card.nextAction);
}

export async function getSalesWorkspace(): Promise<SalesWorkspaceData> {
  const payload = await getPayload({ config });

  const [leadsResult, activitiesResult] = await Promise.all([
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "sales-leads" as any,
      limit: 500,
      depth: 0,
      sort: "-updatedAt",
      overrideAccess: true,
    }),
    payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "sales-activities" as any,
      limit: 500,
      depth: 0,
      sort: "-occurredAt",
      overrideAccess: true,
    }),
  ]);

  const lastByLead = new Map<number, string>();
  for (const activity of activitiesResult.docs as SalesDoc[]) {
    const leadId = relId(activity.lead);
    if (!leadId || lastByLead.has(leadId)) continue;
    if (activity.occurredAt) lastByLead.set(leadId, String(activity.occurredAt));
  }

  const cards = (leadsResult.docs as SalesDoc[]).map((lead) =>
    toCard(lead, lastByLead.get(Number(lead.id)) ?? null),
  );
  const open = cards.filter((c) => c.status !== "won" && c.status !== "lost");

  const sections: SalesWorkspaceSection[] = WORKSPACE_SECTIONS.map((section) => {
    const opportunities = cards
      .filter((c) => (section.statuses as readonly string[]).includes(c.status))
      .sort((a, b) => cardAttentionScore(a) - cardAttentionScore(b));
    return {
      id: section.id,
      label: section.label,
      description: section.description,
      count: opportunities.length,
      opportunities,
    };
  });

  const attention = [...open]
    .filter((c) => c.attentionKind != null && c.attentionKind !== "scheduled")
    .sort((a, b) => cardAttentionScore(a) - cardAttentionScore(b))
    .slice(0, 12);

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentCount = cards.filter((c) => {
    const t = new Date(c.updatedAt).getTime();
    return !Number.isNaN(t) && t >= weekAgo;
  }).length;

  const totalValueOpen = open.reduce(
    (sum, c) => sum + (c.estimatedValue && !Number.isNaN(c.estimatedValue) ? c.estimatedValue : 0),
    0,
  );

  return {
    attention,
    sections,
    totalOpen: open.length,
    totalValueOpen,
    recentCount,
  };
}

export function getCommercialAttentionItems(
  data: SalesWorkspaceData,
  limit = 5,
): SalesOpportunityCard[] {
  return data.attention.slice(0, limit);
}
