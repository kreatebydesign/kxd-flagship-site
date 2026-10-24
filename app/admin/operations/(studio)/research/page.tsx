/**
 * /admin/operations/research
 * KXD OS — Opportunities (Research Desk implementation)
 */

import { getPayload } from "payload";
import config from "@payload-config";
import {
  ResearchDesk,
  type ResearchLeadRow,
  type ResearchMetrics,
} from "@/components/admin/ResearchDesk";
import {
  compareOpportunitiesForRevenue,
  isHistoryOpportunityStatus,
  loadOpportunityDeskMetrics,
  resolveResearchContactDisplay,
} from "@/lib/research-leads";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

function relId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id: unknown }).id;
    if (typeof id === "number") return id;
  }
  return null;
}

function ageLabel(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const days = Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Today";
  if (days === 1) return "1 day old";
  if (days < 14) return `${days} days old`;
  if (days < 60) return `${Math.floor(days / 7)} wk old`;
  return `${Math.floor(days / 30)} mo old`;
}

function mapLead(l: AnyDoc): ResearchLeadRow {
  const contact = resolveResearchContactDisplay(l);
  const promotedSalesLeadId = relId(l.promotedSalesLead);
  return {
    id: l.id as number,
    researcherName: String(l.researcherName ?? ""),
    source: String(l.source ?? "Craigslist"),
    state: l.state ? String(l.state) : null,
    city: l.city ? String(l.city) : null,
    businessName: l.businessName ? String(l.businessName) : null,
    opportunityUrl: contact.opportunityUrl,
    contactEmail: contact.contactEmail,
    contactPhone: contact.contactPhone,
    leadUrl: l.leadUrl ? String(l.leadUrl) : null,
    estimatedService: l.estimatedService ? String(l.estimatedService) : null,
    status: String(l.status ?? "new"),
    grade: l.grade ? String(l.grade) : null,
    rejectReason: l.rejectReason ? String(l.rejectReason) : null,
    qualificationEvidence: l.qualificationEvidence
      ? String(l.qualificationEvidence)
      : null,
    notes: l.notes ? String(l.notes) : null,
    triggerType: l.triggerType ? String(l.triggerType) : null,
    eventDate: l.eventDate ? String(l.eventDate) : null,
    digitalGap: l.digitalGap ? String(l.digitalGap) : null,
    recommendedChannel: l.recommendedChannel ? String(l.recommendedChannel) : null,
    urgency: l.urgency ? String(l.urgency) : null,
    commercialBand: l.commercialBand ? String(l.commercialBand) : null,
    createdAt: String(l.createdAt ?? ""),
    updatedAt: l.updatedAt ? String(l.updatedAt) : null,
    ageLabel: ageLabel(String(l.createdAt ?? "")),
    promotedSalesLeadId,
    promotedAt: l.promotedAt ? String(l.promotedAt) : null,
  };
}

export default async function ResearchDeskPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; researcher?: string }>;
}) {
  const params = await searchParams;
  const filterStatus = params.status?.trim() ?? "";
  const filterResearcher = params.researcher?.trim() ?? "";

  let allLeads: AnyDoc[] = [];
  let metrics: ResearchMetrics = {
    total: 0,
    new: 0,
    reviewing: 0,
    qualified: 0,
    aPlus: 0,
    a: 0,
    b: 0,
    closedWon: 0,
    promoted: 0,
    rejected: 0,
  };

  try {
    const payload = await getPayload({ config });
    const [result, deskMetrics] = await Promise.all([
      payload.find({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collection: "research-leads" as any,
        limit: 500,
        depth: 0,
        sort: "-createdAt",
      }),
      loadOpportunityDeskMetrics(payload),
    ]);
    allLeads = result.docs as AnyDoc[];
    metrics = deskMetrics;
  } catch {
    allLeads = [];
  }

  const researchers = Array.from(
    new Set(allLeads.map((l) => String(l.researcherName ?? "").trim()).filter(Boolean)),
  ).sort();

  let filtered = allLeads;
  if (filterStatus) {
    filtered = filtered.filter((l) => l.status === filterStatus);
  } else {
    // Default Opportunities view — history only when intentionally filtered.
    filtered = filtered.filter((l) => !isHistoryOpportunityStatus(String(l.status ?? "")));
  }
  if (filterResearcher) {
    filtered = filtered.filter((l) => l.researcherName === filterResearcher);
  }

  const leads: ResearchLeadRow[] = filtered
    .map(mapLead)
    .sort(compareOpportunitiesForRevenue);

  return (
    <ResearchDesk
      leads={leads}
      metrics={metrics}
      researchers={researchers}
      filterStatus={filterStatus}
      filterResearcher={filterResearcher}
    />
  );
}
