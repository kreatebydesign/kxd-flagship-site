import { notFound, redirect } from "next/navigation";
import { CesPage, CesEmptyState } from "@/components/ces/primitives";
import { LeadDetailScreen } from "@/components/ces/leads";
import "@/components/ces/leads/lead-command.css";
import { requireLeadCommandAccess } from "@/lib/client-command/leads/access";
import { loadLeadDetail } from "@/lib/client-command/leads/load";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ inquiryKey: string }> };

export default async function PortalLeadDetailPage({
  params,
}: {
  params: RouteContext["params"];
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

  const { inquiryKey: rawKey } = await params;
  const inquiryKey = decodeURIComponent(String(rawKey ?? "").trim());
  if (!inquiryKey) notFound();

  const result = await loadLeadDetail({
    session: gate.session,
    profile: gate.profile,
    inquiryKey,
    canManage: gate.canManage,
  });

  if (!result.ok) {
    if (result.code === "disabled") {
      return (
        <CesPage>
          <CesEmptyState title="Leads is not available" lead={result.message} />
        </CesPage>
      );
    }
    if (result.code === "not_found" || result.code === "forbidden") {
      notFound();
    }
    redirect("/portal/leads");
  }

  return (
    <LeadDetailScreen
      clientName={result.tenant.clientName}
      inquiry={result.inquiry}
      ownerLabel={result.ownerLabel}
      locationLabel={result.locationLabel}
      owners={result.owners}
      activity={result.activity}
      canManage={result.canManage}
    />
  );
}
