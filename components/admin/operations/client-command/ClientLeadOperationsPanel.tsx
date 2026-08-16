"use client";

/**
 * Client Command — Managed Client Lead Operations ledger (Phase 2 V1).
 * Operator-only. Not a CRM shell. Not KXD Sales.
 */

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  KxdBadge,
  KxdEmptyState,
  KxdMetric,
  KxdSection,
} from "@/components/os";
import {
  WorkspaceChapter,
} from "@/components/admin/operations/client-workspace/WorkspacePrimitives";
import type { ClientLeadLedgerSnapshot } from "@/lib/managed-client-leads/types";
import { formatResponseTime } from "@/lib/managed-client-leads/response-time";
import { reconciliationLabel } from "@/lib/managed-client-leads/reconciliation";

export function ClientLeadOperationsPanel({
  ledger,
}: {
  ledger: ClientLeadLedgerSnapshot;
}) {
  if (!ledger.policyEnabled) {
    return (
      <WorkspaceChapter
        eyebrow="Lead Operations"
        title="Not enabled for this client"
      >
        <KxdEmptyState
          title="No Lead Operations policy"
          description="Register an enabled managed-client lead policy for this clientKey to use the ledger. Managed Client Lead Operations activates via client policy — not a universal CRM."
        />
      </WorkspaceChapter>
    );
  }

  return (
    <div className="kxd-os-workspace-dossier">
      <WorkspaceChapter
        eyebrow="Lead Operations"
        title={ledger.policyDisplayName ?? "Client inquiries"}
      >
        <p className="kxd-os-meta" style={{ marginBottom: "1rem" }}>
          Received inquiries reconciled against attribution evidence. Ads
          conversions are evidence — not proof of receipt, qualification, or sale.
        </p>
        <div className="kxd-os-ops-kpi-grid" style={{ marginBottom: "1.25rem" }}>
          <KxdMetric label="Received" value={String(ledger.counts.total)} />
          <KxdMetric label="New" value={String(ledger.counts.new)} />
          <KxdMetric label="Unverified" value={String(ledger.counts.unverified)} />
          <KxdMetric label="Qualified" value={String(ledger.counts.qualified)} />
          <KxdMetric label="Matched" value={String(ledger.counts.matched)} />
          <KxdMetric
            label="Inquiry w/o ads"
            value={String(ledger.counts.inquiryWithoutAds)}
          />
        </div>

        <p className="kxd-os-meta" style={{ marginTop: "0.85rem" }}>
          {[
            ledger.attributionReconciliationEnabled
              ? "Attribution reconciliation on"
              : "Attribution reconciliation off",
            ledger.ga4PropertyIds.length
              ? `GA4 context: ${ledger.ga4PropertyIds.join(", ")}`
              : null,
            ledger.commissionOnConfirmedSale
              ? `CSI commission downstream (¢${ledger.commissionAmountCents ?? 0}) — never from inquiry create`
              : "No inquiry-path commission",
            ledger.portalModuleEnabled ? "Portal module on" : "Portal module deferred",
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </WorkspaceChapter>

      <KxdSection label="Inquiry ledger">
        {ledger.inquiries.length === 0 ? (
          <KxdEmptyState
            title="No received inquiries yet"
            description="Record inquiries as they arrive. Do not invent production leads for testing."
          />
        ) : (
          <div className="kxd-os-list-stack">
            {ledger.inquiries.map((row) => (
              <InquiryRow key={row.id} inquiry={row} />
            ))}
          </div>
        )}
      </KxdSection>
    </div>
  );
}

function InquiryRow({
  inquiry,
}: {
  inquiry: ClientLeadLedgerSnapshot["inquiries"][number];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function patch(body: Record<string, unknown>) {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/client-inquiries/${inquiry.id}/lifecycle`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as { success?: boolean; error?: string };
        if (!res.ok || !data.success) {
          setError(data.error || "Update failed.");
          return;
        }
        router.refresh();
      } catch {
        setError("Update failed.");
      }
    });
  }

  return (
    <article
      className="kxd-os-card"
      style={{ marginBottom: "0.85rem", padding: "1rem 1.15rem" }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: "0.85rem",
        }}
      >
        <div style={{ minWidth: "14rem", flex: "1 1 16rem" }}>
          <p className="kxd-os-card__title" style={{ fontSize: "1rem" }}>
            {inquiry.inquiryKey}
          </p>
          <p className="kxd-os-meta" style={{ marginTop: "0.35rem" }}>
            {inquiry.channel}
            {inquiry.campaign ? ` · ${inquiry.campaign}` : ""}
            {inquiry.landingPage ? ` · ${inquiry.landingPage}` : ""}
          </p>
          <p className="kxd-os-meta" style={{ marginTop: "0.35rem" }}>
            Received {formatShort(inquiry.receivedAt)}
            {" · Response "}
            {formatResponseTime(inquiry.responseTimeSeconds)}
          </p>
          {inquiry.messageSummary ? (
            <p className="kxd-os-body" style={{ marginTop: "0.55rem", fontSize: "0.875rem" }}>
              {inquiry.messageSummary}
            </p>
          ) : null}
          <div
            style={{
              marginTop: "0.65rem",
              display: "flex",
              flexWrap: "wrap",
              gap: "0.4rem",
            }}
          >
            <KxdBadge variant="status">{inquiry.operationalStatus.replace(/_/g, " ")}</KxdBadge>
            <KxdBadge variant="tier">{inquiry.verificationState}</KxdBadge>
            <KxdBadge variant="default">{inquiry.qualificationState}</KxdBadge>
            <KxdBadge variant="pending">
              {reconciliationLabel(inquiry.reconciliationState)}
            </KxdBadge>
            {inquiry.googleConversionObserved ? (
              <KxdBadge variant="warning">Google conversion evidence</KxdBadge>
            ) : null}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.45rem",
            alignItems: "flex-end",
          }}
        >
          <button
            type="button"
            className="kxd-os-btn kxd-os-btn--secondary"
            disabled={pending || inquiry.verificationState === "verified"}
            onClick={() => patch({ verificationState: "verified" })}
          >
            Mark verified
          </button>
          <button
            type="button"
            className="kxd-os-btn kxd-os-btn--ghost"
            disabled={pending || inquiry.qualificationState === "qualified"}
            onClick={() => patch({ qualificationState: "qualified" })}
          >
            Mark qualified
          </button>
          <button
            type="button"
            className="kxd-os-btn kxd-os-btn--ghost"
            disabled={pending || Boolean(inquiry.firstRespondedAt)}
            onClick={() =>
              patch({
                firstRespondedAt: new Date().toISOString(),
                operationalStatus: "acknowledged",
                disposition: "contacted",
              })
            }
          >
            Log first response
          </button>
          {error ? <span className="kxd-os-meta">{error}</span> : null}
        </div>
      </div>
    </article>
  );
}

function formatShort(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}
