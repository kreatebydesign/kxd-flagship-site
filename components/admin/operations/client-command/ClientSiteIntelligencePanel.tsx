"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type {
  ClientSiteIntelligenceLeadRow,
  ClientSiteIntelligenceSnapshot,
} from "@/lib/client-site-intelligence/load";
import {
  WorkspaceChapter,
  WorkspaceEmpty,
  WorkspaceKpiGrid,
  WorkspaceMetaLine,
  WorkspaceProse,
} from "@/components/admin/operations/client-workspace/WorkspacePrimitives";

function isoDay(value: string | null): string {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime())
    ? parsed.toISOString().slice(0, 10)
    : "";
}

function displayDate(value: string | null): string {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime())
    ? parsed.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";
}

function money(cents: number | null): string {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function lifecycleLabel(lead: ClientSiteIntelligenceLeadRow): string {
  if (lead.commissionStatus === "paid") return "Commission paid";
  if (lead.commissionStatus === "due") return "Sale confirmed · commission due";
  if (lead.lifecycleStatus === "closed_no_sale") return "Closed · no sale";
  if (lead.lifecycleStatus === "acknowledged") return "Acknowledged";
  return "Awaiting confirmation";
}

function LeadLifecycleCard({
  lead,
  commissionAmountCents,
}: {
  lead: ClientSiteIntelligenceLeadRow;
  commissionAmountCents: number;
}) {
  const router = useRouter();
  const [soldAt, setSoldAt] = useState(isoDay(new Date().toISOString()));
  const [saleReference, setSaleReference] = useState("");
  const [cartModelReference, setCartModelReference] = useState(
    lead.modelInterest ?? "",
  );
  const [paidAt, setPaidAt] = useState(isoDay(new Date().toISOString()));
  const [paymentReference, setPaymentReference] = useState("");
  const [saleConfirmed, setSaleConfirmed] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [pending, setPending] = useState<"confirm" | "paid" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(
    action: "confirm-sale" | "mark-paid",
    fields: Record<string, string>,
  ) {
    setPending(action === "confirm-sale" ? "confirm" : "paid");
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/admin/client-site-intelligence/${lead.id}/lifecycle`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, ...fields }),
        },
      );
      const json = (await response.json()) as {
        success?: boolean;
        duplicate?: boolean;
        error?: string;
      };
      if (!response.ok || !json.success) {
        throw new Error(json.error ?? "Lifecycle action failed.");
      }
      setMessage(
        action === "confirm-sale"
          ? json.duplicate
            ? "Sale was already confirmed."
            : "Sale confirmed. The $300 commission is now due."
          : json.duplicate
            ? "Commission was already marked paid."
            : "Commission marked paid.",
      );
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Lifecycle action failed.",
      );
    } finally {
      setPending(null);
    }
  }

  function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run("confirm-sale", { soldAt, saleReference, cartModelReference });
  }

  function markPaid(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run("mark-paid", { paidAt, paymentReference });
  }

  const canConfirm =
    (lead.lifecycleStatus === "new" ||
      lead.lifecycleStatus === "acknowledged") &&
    lead.commissionStatus === "not_due";
  const canMarkPaid =
    lead.lifecycleStatus === "sold_confirmed" &&
    lead.commissionStatus === "due" &&
    lead.commissionAmountCents === commissionAmountCents;

  return (
    <li className="kxd-os-workspace-list__item">
      <div className="kxd-os-workspace-dossier-columns">
        <div>
          <WorkspaceProse>
            <strong>{lead.externalEventId}</strong>
          </WorkspaceProse>
          <WorkspaceMetaLine
            label="Received"
            value={displayDate(lead.receivedAt)}
          />
          <WorkspaceMetaLine
            label="Interest"
            value={lead.modelInterest ?? "Not specified"}
          />
          <WorkspaceMetaLine label="Status" value={lifecycleLabel(lead)} />
        </div>
        <div>
          <WorkspaceMetaLine
            label="Commission"
            value={
              lead.commissionStatus === "not_due"
                ? "Not due"
                : `${money(lead.commissionAmountCents)} · ${lead.commissionStatus}`
            }
          />
          <WorkspaceMetaLine label="Sold" value={displayDate(lead.soldAt)} />
          <WorkspaceMetaLine
            label="Sale reference"
            value={lead.saleReference ?? "—"}
          />
          <WorkspaceMetaLine
            label="Paid"
            value={displayDate(lead.commissionPaidAt)}
          />
        </div>
      </div>

      {canConfirm ? (
        <form className="kxd-os-command-timeline-form" onSubmit={confirm}>
          <label className="kxd-os-command-timeline-form__field">
            <span>Sold date</span>
            <input
              type="date"
              required
              value={soldAt}
              onChange={(event) => setSoldAt(event.target.value)}
            />
          </label>
          <label className="kxd-os-command-timeline-form__field">
            <span>Sale reference</span>
            <input
              required
              maxLength={200}
              value={saleReference}
              onChange={(event) => setSaleReference(event.target.value)}
              placeholder="Cart or order reference"
            />
          </label>
          <label className="kxd-os-command-timeline-form__field">
            <span>Cart/model reference (optional)</span>
            <input
              maxLength={200}
              value={cartModelReference}
              onChange={(event) => setCartModelReference(event.target.value)}
            />
          </label>
          <label className="kxd-os-command-timeline-form__confirmation">
            <input
              type="checkbox"
              required
              checked={saleConfirmed}
              onChange={(event) => setSaleConfirmed(event.target.checked)}
            />
            <span>
              I confirm this website lead resulted in a sold cart and creates
              the $300 commission obligation.
            </span>
          </label>
          <button
            type="submit"
            className="kxd-os-btn kxd-os-btn--secondary"
            disabled={pending !== null || !saleConfirmed}
          >
            {pending === "confirm" ? "Confirming…" : "Confirm sale · $300 due"}
          </button>
        </form>
      ) : null}

      {canMarkPaid ? (
        <form className="kxd-os-command-timeline-form" onSubmit={markPaid}>
          <label className="kxd-os-command-timeline-form__field">
            <span>Paid date</span>
            <input
              type="date"
              required
              value={paidAt}
              onChange={(event) => setPaidAt(event.target.value)}
            />
          </label>
          <label className="kxd-os-command-timeline-form__field">
            <span>Payment/reference note</span>
            <input
              required
              maxLength={500}
              value={paymentReference}
              onChange={(event) => setPaymentReference(event.target.value)}
              placeholder="Safe payout or internal reference only"
            />
          </label>
          <label className="kxd-os-command-timeline-form__confirmation">
            <input
              type="checkbox"
              required
              checked={paymentConfirmed}
              onChange={(event) => setPaymentConfirmed(event.target.checked)}
            />
            <span>
              I confirm the $300 commission was paid outside KXD OS and the
              reference above is accurate.
            </span>
          </label>
          <button
            type="submit"
            className="kxd-os-btn kxd-os-btn--secondary"
            disabled={pending !== null || !paymentConfirmed}
          >
            {pending === "paid" ? "Recording…" : "Mark commission paid"}
          </button>
        </form>
      ) : null}

      {lead.commissionStatus === "paid" ? (
        <WorkspaceProse>
          <strong>Paid · lifecycle complete</strong>
        </WorkspaceProse>
      ) : null}

      {message ? (
        <p className="kxd-os-command-timeline-form__success" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="kxd-os-command-timeline-form__error" role="alert">
          {error}
        </p>
      ) : null}
    </li>
  );
}

export function ClientSiteIntelligencePanel({
  snapshot,
}: {
  snapshot: ClientSiteIntelligenceSnapshot;
}) {
  if (!snapshot.enabled) return null;

  return (
    <WorkspaceChapter
      title="Site intelligence"
      eyebrow="OTP Carts · internal attribution"
    >
      <WorkspaceKpiGrid
        items={[
          { label: "Website leads", value: String(snapshot.counts.total) },
          {
            label: "Awaiting confirmation",
            value: String(snapshot.counts.awaitingConfirmation),
          },
          {
            label: "Commission due",
            value: String(snapshot.counts.commissionDue),
          },
          {
            label: "Commission paid",
            value: String(snapshot.counts.commissionPaid),
          },
        ]}
      />
      <WorkspaceProse>
        <strong>
          Website lead → Confirm sale → $300 commission due → Mark paid
        </strong>
        <br />
        Website leads remain attribution facts. A commission becomes due only
        after an authenticated operator confirms a sale.
      </WorkspaceProse>
      {snapshot.leads.length === 0 ? (
        <WorkspaceEmpty message="No OTP Carts website leads have been received." />
      ) : (
        <ul className="kxd-os-workspace-list">
          {snapshot.leads.map((lead) => (
            <LeadLifecycleCard
              key={lead.id}
              lead={lead}
              commissionAmountCents={snapshot.commissionAmountCents}
            />
          ))}
        </ul>
      )}
    </WorkspaceChapter>
  );
}
