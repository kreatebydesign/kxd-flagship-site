import Link from "next/link";
import { KxdBadge, KxdEmptyState, KxdPage, KxdSection } from "@/components/os";
import { OperationsPageHero } from "@/components/admin/operations/shared/OperationsPageHero";
import { OperationsShell } from "@/components/admin/operations/shared/OperationsShell";
import { formatAnalyticsDisplay } from "@/lib/sales/analytics";
import { fmtDate, fmtMoney, resolveName, type SalesUiDoc } from "./shared";

function proposalVariant(status: string): "default" | "status" | "success" | "critical" | "warning" {
  switch (status) {
    case "approved":
      return "success";
    case "rejected":
    case "expired":
      return "critical";
    case "sent":
    case "viewed":
      return "status";
    default:
      return "default";
  }
}

export function ProposalsScreen({ proposals }: { proposals: SalesUiDoc[] }) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  return (
    <OperationsShell activeId="sales-proposals">
      <KxdPage>
        <OperationsPageHero
          eyebrow="Sales"
          title="Proposals"
          lead="Draft, send, and track proposals. Public links, agreements, deposits, and conversion — all inside KXD Core."
        />

        <KxdSection>
          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end", marginBottom: "1rem", flexWrap: "wrap" }}>
            <Link href="/admin/sales/proposals/new?source=lead" className="kxd-os-btn kxd-os-btn--ghost">
              From lead
            </Link>
            <Link href="/admin/sales/proposals/new?source=client" className="kxd-os-btn kxd-os-btn--ghost">
              From client
            </Link>
            <Link href="/admin/sales/proposals/new" className="kxd-os-btn">
              New proposal
            </Link>
          </div>

          {proposals.length === 0 ? (
            <KxdEmptyState
              title="No proposals"
              description="Build your first proposal with sections, pricing, and terms."
            />
          ) : (
            <div className="kxd-os-card-list">
              {proposals.map((p) => {
                const analytics = formatAnalyticsDisplay(p);
                const publicUrl = p.publicToken ? `${baseUrl}/proposal/${p.publicToken}` : null;
                return (
                  <div key={p.id as number} className="kxd-os-card" style={{ marginBottom: "0.65rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                      <div style={{ flex: 1 }}>
                        <p className="kxd-os-meta">{String(p.proposalNumber ?? "—")}</p>
                        <Link href={`/admin/sales/proposals/${p.id}`} className="kxd-os-card__title" style={{ display: "block", marginTop: "0.25rem", textDecoration: "none" }}>
                          {String(p.title ?? "Proposal")}
                        </Link>
                        <p className="kxd-os-body" style={{ marginTop: "0.4rem" }}>
                          {resolveName(p.lead)} · {fmtMoney(p.investment as number)}
                          {p.recurringAmount ? ` · ${fmtMoney(p.recurringAmount as number)}/mo` : ""}
                        </p>
                        <p className="kxd-os-meta" style={{ marginTop: "0.35rem" }}>
                          {analytics.lastViewedLabel} · {analytics.timeOnProposalLabel}
                        </p>
                        {analytics.sectionInsights.map((line) => (
                          <p key={line} className="kxd-os-meta" style={{ marginTop: "0.2rem" }}>
                            {line}
                          </p>
                        ))}
                        {publicUrl ? (
                          <p className="kxd-os-meta" style={{ marginTop: "0.35rem" }}>
                            <a href={publicUrl} target="_blank" rel="noreferrer">
                              Public link
                            </a>
                          </p>
                        ) : null}
                        {p.conversionExecutedAt ? (
                          <p className="kxd-os-meta" style={{ marginTop: "0.3rem", color: "var(--kxd-os-success)" }}>
                            Client converted
                          </p>
                        ) : p.conversionPreparedAt ? (
                          <Link href={`/admin/sales/conversion/${p.id}`} className="kxd-os-meta" style={{ marginTop: "0.3rem", color: "var(--kxd-os-success)" }}>
                            Conversion wizard ready
                          </Link>
                        ) : null}
                        {p.expiresAt ? (
                          <p className="kxd-os-meta" style={{ marginTop: "0.3rem" }}>
                            Expires {fmtDate(p.expiresAt as string)}
                          </p>
                        ) : null}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", alignItems: "flex-end" }}>
                        <KxdBadge variant={proposalVariant(String(p.status ?? "draft"))}>
                          {String(p.status ?? "draft")}
                        </KxdBadge>
                        {p.paymentStatus && p.paymentStatus !== "none" ? (
                          <KxdBadge variant="status">{String(p.paymentStatus)}</KxdBadge>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </KxdSection>
      </KxdPage>
    </OperationsShell>
  );
}
