import { KxdEmptyState, KxdPage } from "@/components/os";
import { ClientHqPageHero } from "./ClientHqPageHero";
import type { PortalDoc } from "@/lib/portal/types";

/**
 * Billing surface — truthful preview.
 * No Stripe checkout. No fabricated invoice line items.
 * Retainer presence may be acknowledged without exposing raw amounts here.
 */
export function InvoicesScreen({ retainers }: { retainers: PortalDoc[] }) {
  const hasRetainer = retainers.length > 0;

  return (
    <KxdPage className="kxd-os-page--ops">
      <ClientHqPageHero
        eyebrow="Account"
        title="Billing"
        lead="A calm account view for invoices and payments — arriving as the partnership expands."
      />

      <div className="kxd-os-ops-list" style={{ display: "grid", gap: "1.25rem" }}>
        <p className="kxd-os-body" style={{ maxWidth: "36rem" }}>
          This workspace will eventually include monthly invoices, project invoices, receipts,
          payment history, secure Stripe checkout, and saved payment methods.
        </p>

        {hasRetainer ? (
          <p className="kxd-os-meta">An active monthly engagement is on file with KXD.</p>
        ) : (
          <KxdEmptyState
            title="No billing records yet"
            description="Invoice and retainer details will appear here once your agreement is on file."
          />
        )}

        <p className="kxd-os-meta" style={{ fontStyle: "italic" }}>
          Preview only — payment processing is not enabled in this workspace yet.
        </p>
      </div>
    </KxdPage>
  );
}
