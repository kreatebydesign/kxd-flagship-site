import { KxdBadge, KxdEmptyState, KxdPage } from "@/components/os";
import { ClientHqPageHero } from "./ClientHqPageHero";
import { formatCurrency } from "./shared";
import type { PortalDoc } from "@/lib/portal/types";
import { fmtPortalDate, statusLabel } from "@/lib/portal/format";

export function InvoicesScreen({ retainers }: { retainers: PortalDoc[] }) {
  return (
    <KxdPage className="kxd-os-page--ops">
      <ClientHqPageHero
        eyebrow="Account"
        title="Invoices"
        lead="Retainer agreements, billing rhythm, and upcoming invoice dates."
      />

      {retainers.length === 0 ? (
        <KxdEmptyState
          title="No billing records yet"
          description="Invoice and retainer details will appear here once your agreement is on file."
        />
      ) : (
        <div className="kxd-os-ops-list">
          {retainers.map((retainer) => (
            <article key={retainer.id as number} className="kxd-os-card">
              <div className="kxd-os-ops-list__head">
                <h2 className="kxd-os-card__title">{String(retainer.retainerName)}</h2>
                <KxdBadge variant="revenue">
                  {statusLabel(String(retainer.billingStatus ?? "active"))}
                </KxdBadge>
              </div>
              <p className="kxd-os-metric__value" style={{ marginTop: "0.75rem" }}>
                {formatCurrency(
                  typeof retainer.monthlyAmount === "number" ? retainer.monthlyAmount : null,
                )}
                <span className="kxd-os-meta"> / month</span>
              </p>
              <p className="kxd-os-meta" style={{ marginTop: "0.75rem" }}>
                Next invoice {fmtPortalDate(retainer.nextInvoiceDate as string)}
              </p>
              {retainer.scopeSummary ? (
                <p className="kxd-os-body" style={{ marginTop: "1rem" }}>
                  {String(retainer.scopeSummary)}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      )}

      <p className="kxd-os-meta" style={{ marginTop: "2rem" }}>
        Detailed invoice line items and payment history are coming in a future release.
      </p>
    </KxdPage>
  );
}
