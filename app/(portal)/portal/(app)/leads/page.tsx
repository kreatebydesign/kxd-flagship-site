import { redirect } from "next/navigation";
import { CesPage, CesEmptyState } from "@/components/ces/primitives";
import { LeadInboxScreen } from "@/components/ces/leads";
import "@/components/ces/leads/lead-command.css";
import { requireLeadCommandAccess } from "@/lib/client-command/leads/access";
import { loadLeadList } from "@/lib/client-command/leads/load";
import type { LeadListFilters, LeadPresentationStage } from "@/lib/client-command/leads/types";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

const VALID_STAGES = new Set<LeadPresentationStage>([
  "NEW",
  "CONTACTED",
  "FOLLOW_UP",
  "QUALIFIED",
  "WON",
  "LOST",
]);

export default async function PortalLeadsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const gate = await requireLeadCommandAccess();
  if ("error" in gate) {
    if (gate.code === "unauthorized") redirect("/portal/login");
    return (
      <CesPage>
        <CesEmptyState
          title="Leads is not available"
          lead="Leads is not enabled for this workspace yet."
        />
      </CesPage>
    );
  }

  const params = await searchParams;
  const rawStage = first(params.stage);
  const rawOwner = first(params.owner);

  const filters: LeadListFilters = {
    q: first(params.q) || undefined,
    stage:
      rawStage && VALID_STAGES.has(rawStage as LeadPresentationStage)
        ? (rawStage as LeadPresentationStage)
        : "all",
    ownerPortalUserId:
      rawOwner === "unassigned"
        ? "unassigned"
        : rawOwner && rawOwner !== "all" && Number.isFinite(Number(rawOwner))
          ? Number(rawOwner)
          : "all",
    needsAttention: first(params.attention) === "1",
  };

  const result = await loadLeadList({
    session: gate.session,
    profile: gate.profile,
    canManage: gate.canManage,
    filters,
  });

  if (!result.ok) {
    return (
      <CesPage>
        <CesEmptyState title="Leads could not load" lead={result.message} />
      </CesPage>
    );
  }

  return (
    <LeadInboxScreen
      clientName={result.tenant.clientName}
      items={result.items}
      totalBeforeFilter={result.totalBeforeFilter}
      filters={filters}
      owners={result.owners}
    />
  );
}
