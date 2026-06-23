/**
 * /admin/operations/research
 * KXD OS — Lead Research Desk (Phase 1)
 */

import { getPayload } from "payload";
import config from "@payload-config";
import { ResearchDesk, type ResearchLeadRow, type ResearchMetrics } from "@/components/admin/ResearchDesk";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export default async function ResearchDeskPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; researcher?: string }>;
}) {
  const params = await searchParams;
  const filterStatus = params.status?.trim() ?? "";
  const filterResearcher = params.researcher?.trim() ?? "";

  let allLeads: AnyDoc[] = [];

  try {
    const payload = await getPayload({ config });
    const result = await payload.find({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "research-leads" as any,
      limit: 500,
      depth: 0,
      sort: "-createdAt",
    });
    allLeads = result.docs as AnyDoc[];
  } catch {
    allLeads = [];
  }

  const metrics: ResearchMetrics = {
    total: allLeads.length,
    new: allLeads.filter((l) => l.status === "new").length,
    qualified: allLeads.filter((l) => l.status === "qualified").length,
    closedWon: allLeads.filter((l) => l.status === "closed-won").length,
  };

  const researchers = Array.from(
    new Set(allLeads.map((l) => String(l.researcherName ?? "").trim()).filter(Boolean)),
  ).sort();

  let filtered = allLeads;
  if (filterStatus) filtered = filtered.filter((l) => l.status === filterStatus);
  if (filterResearcher) filtered = filtered.filter((l) => l.researcherName === filterResearcher);

  const leads: ResearchLeadRow[] = filtered.map((l) => ({
    id: l.id as number,
    researcherName: String(l.researcherName ?? ""),
    source: String(l.source ?? "Craigslist"),
    state: l.state ? String(l.state) : null,
    city: l.city ? String(l.city) : null,
    leadUrl: l.leadUrl ? String(l.leadUrl) : null,
    category: l.category ? String(l.category) : null,
    estimatedService: l.estimatedService ? String(l.estimatedService) : null,
    status: String(l.status ?? "new"),
    createdAt: String(l.createdAt ?? ""),
  }));

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
