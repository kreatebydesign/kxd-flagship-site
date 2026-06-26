import Link from "next/link";
import { KxdBadge, KxdEmptyState, KxdPage, KxdSection } from "@/components/os";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import { fmtDate, fmtMoney, type SalesUiDoc } from "./shared";

function statusVariant(status: string): "default" | "status" | "success" | "critical" | "warning" {
  switch (status) {
    case "won":
      return "success";
    case "lost":
      return "critical";
    case "negotiation":
    case "proposal":
      return "status";
    case "nurturing":
      return "warning";
    default:
      return "default";
  }
}

export function LeadsScreen({ leads }: { leads: SalesUiDoc[] }) {
  return (
    <OperationsShell activeId="sales-leads">
      <KxdPage>
        <OperationsPageHero
          eyebrow="Sales"
          title="Leads"
          lead="Every opportunity enters here. Track source, forecast, and follow-ups before proposals go out."
        />

        <KxdSection>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
            <Link href="/admin/sales/proposals/new" className="kxd-os-btn">
              New proposal
            </Link>
          </div>

          {leads.length === 0 ? (
            <KxdEmptyState
              title="No leads yet"
              description="Create leads in Payload or start a proposal from a new lead."
            />
          ) : (
            <div className="kxd-os-card-list">
              {leads.map((lead) => (
                <div key={lead.id as number} className="kxd-os-card" style={{ marginBottom: "0.65rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                    <div>
                      <p className="kxd-os-card__title">{String(lead.companyName ?? "—")}</p>
                      <p className="kxd-os-meta" style={{ marginTop: "0.3rem" }}>
                        {String(lead.contactName ?? "—")}
                        {lead.email ? ` · ${String(lead.email)}` : ""}
                      </p>
                      <p className="kxd-os-body" style={{ marginTop: "0.45rem" }}>
                        {fmtMoney(lead.estimatedValue as number)} · MRR {fmtMoney(lead.estimatedMRR as number)} ·{" "}
                        {Number(lead.probability ?? 25)}% close
                      </p>
                      {lead.nextFollowUp ? (
                        <p className="kxd-os-meta" style={{ marginTop: "0.35rem" }}>
                          Follow-up {fmtDate(lead.nextFollowUp as string)}
                        </p>
                      ) : null}
                    </div>
                    <KxdBadge variant={statusVariant(String(lead.status ?? "new"))}>
                      {String(lead.status ?? "new")}
                    </KxdBadge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </KxdSection>
      </KxdPage>
    </OperationsShell>
  );
}
