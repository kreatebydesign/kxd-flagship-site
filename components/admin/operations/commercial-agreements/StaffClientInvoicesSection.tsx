"use client";

import { useEffect, useRef, useState } from "react";
import { OpsSectionHead } from "@/components/admin/operations/shared/OpsBriefing";
import { KxdBadge } from "@/components/os";
import type { StaffInvoiceView } from "@/lib/commercial-agreements/staff-invoice-presentation";
import type { PortalBillingInvoiceRow } from "@/lib/portal/billing/types";

type LoadedState =
  | {
      clientId: number;
      kind: "view";
      view: StaffInvoiceView;
    }
  | {
      clientId: number;
      kind: "http_error";
      errorKind: "unauthorized" | "not_found" | "bad_request" | "unexpected";
      message: string;
    };

type ApiSuccess = {
  ok: true;
  clientId: number;
  view: StaffInvoiceView;
};

type ApiFailure = {
  ok?: false;
  message?: string;
  code?: string;
};

function ExternalInvoiceLink({
  href,
  children,
}: {
  href: string;
  children: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="kxd-commercial-admin__invoice-link"
    >
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

function InvoiceRowCard({ invoice }: { invoice: PortalBillingInvoiceRow }) {
  return (
    <li className="kxd-commercial-admin__invoice-card">
      <div className="kxd-commercial-admin__invoice-card-main">
        <div className="kxd-commercial-admin__invoice-identity">
          <p className="kxd-commercial-admin__invoice-number">
            {invoice.displayNumber}
          </p>
          <KxdBadge
            variant={invoice.badgeVariant}
            className="kxd-commercial-admin__invoice-status"
          >
            <span aria-label={invoice.statusAriaLabel}>
              {invoice.statusLabel}
            </span>
          </KxdBadge>
        </div>
        <p
          className="kxd-commercial-admin__invoice-amount"
          aria-label={`Amount due ${invoice.amountDueLabel}`}
        >
          {invoice.amountDueLabel}
        </p>
      </div>

      <dl className="kxd-commercial-admin__invoice-meta">
        {invoice.createdLabel ? (
          <div>
            <dt>Created</dt>
            <dd>{invoice.createdLabel}</dd>
          </div>
        ) : null}
        {invoice.dueLabel ? (
          <div>
            <dt>Due</dt>
            <dd>{invoice.dueLabel}</dd>
          </div>
        ) : null}
        {invoice.paidLabel ? (
          <div>
            <dt>Paid</dt>
            <dd>{invoice.paidLabel}</dd>
          </div>
        ) : null}
        {invoice.amountPaidLabel ? (
          <div>
            <dt>Amount paid</dt>
            <dd>{invoice.amountPaidLabel}</dd>
          </div>
        ) : null}
        {invoice.amountRemainingLabel ? (
          <div>
            <dt>Remaining</dt>
            <dd>{invoice.amountRemainingLabel}</dd>
          </div>
        ) : null}
      </dl>

      {(invoice.viewInvoiceUrl || invoice.payUrl) && (
        <div className="kxd-commercial-admin__invoice-actions">
          {invoice.viewInvoiceUrl ? (
            <ExternalInvoiceLink href={invoice.viewInvoiceUrl}>
              View invoice
            </ExternalInvoiceLink>
          ) : null}
          {invoice.payUrl ? (
            <ExternalInvoiceLink href={invoice.payUrl}>
              Pay securely through Stripe
            </ExternalInvoiceLink>
          ) : null}
        </div>
      )}
    </li>
  );
}

/**
 * Phase 5 Batch 5D — Read-only Stripe TEST invoice visibility for a selected client.
 * Fetches on clientId change; no cross-client cache. No mutation controls.
 * Loading is derived from clientId vs loaded.clientId (no sync setState in effect).
 */
export function StaffClientInvoicesSection({
  clientId,
  clientName,
}: {
  clientId: number;
  clientName: string;
}) {
  const [loaded, setLoaded] = useState<LoadedState | null>(null);
  const requestSeq = useRef(0);

  useEffect(() => {
    const seq = ++requestSeq.current;
    const controller = new AbortController();

    void (async () => {
      try {
        const res = await fetch(
          `/api/admin/commercial-agreements/${clientId}/invoices`,
          {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store",
            signal: controller.signal,
            headers: {
              Accept: "application/json",
            },
          },
        );

        if (seq !== requestSeq.current) return;

        if (res.status === 401 || res.status === 403) {
          setLoaded({
            clientId,
            kind: "http_error",
            errorKind: "unauthorized",
            message:
              "You are not authorized to view Stripe invoices for this client.",
          });
          return;
        }

        if (res.status === 404) {
          setLoaded({
            clientId,
            kind: "http_error",
            errorKind: "not_found",
            message: "Client not found.",
          });
          return;
        }

        if (res.status === 400) {
          const json = (await res.json().catch(() => null)) as ApiFailure | null;
          setLoaded({
            clientId,
            kind: "http_error",
            errorKind: "bad_request",
            message:
              json?.message ??
              "This invoice request could not be authorized.",
          });
          return;
        }

        if (!res.ok) {
          setLoaded({
            clientId,
            kind: "http_error",
            errorKind: "unexpected",
            message: "Unable to load Stripe invoices.",
          });
          return;
        }

        const json = (await res.json()) as ApiSuccess;
        if (seq !== requestSeq.current) return;
        if (!json.ok || json.clientId !== clientId || !json.view) {
          setLoaded({
            clientId,
            kind: "http_error",
            errorKind: "unexpected",
            message: "Unable to load Stripe invoices.",
          });
          return;
        }

        setLoaded({
          clientId: json.clientId,
          kind: "view",
          view: json.view,
        });
      } catch {
        if (controller.signal.aborted) return;
        if (seq !== requestSeq.current) return;
        setLoaded({
          clientId,
          kind: "http_error",
          errorKind: "unexpected",
          message: "Unable to load Stripe invoices.",
        });
      }
    })();

    return () => {
      controller.abort();
    };
  }, [clientId]);

  const isLoading = loaded?.clientId !== clientId;

  return (
    <section
      className="kxd-commercial-admin__staff-invoices"
      aria-label="Stripe invoices"
      data-client-id={String(clientId)}
    >
      <OpsSectionHead label="Stripe invoices (TEST)" />
      <p className="kxd-commercial-admin__muted">
        Read-only Stripe TEST invoices for {clientName}. Hosted View and Pay
        actions open Stripe. KXD OS does not collect payment details or manage
        invoices here.
      </p>

      {isLoading ? (
        <p className="kxd-commercial-admin__muted" role="status">
          Loading Stripe invoices…
        </p>
      ) : null}

      {!isLoading && loaded?.kind === "http_error" ? (
        <div
          className="kxd-commercial-admin__invoice-state"
          role={loaded.errorKind === "unauthorized" ? "alert" : "status"}
        >
          <p className="kxd-commercial-admin__invoice-state-title">
            {loaded.errorKind === "unauthorized"
              ? "Not authorized"
              : loaded.errorKind === "not_found"
                ? "Client unavailable"
                : "Unable to load invoices"}
          </p>
          <p className="kxd-commercial-admin__muted">{loaded.message}</p>
        </div>
      ) : null}

      {!isLoading &&
      loaded?.kind === "view" &&
      loaded.view.kind === "unavailable" ? (
        <div className="kxd-commercial-admin__invoice-state" role="status">
          <p className="kxd-commercial-admin__invoice-state-title">
            {loaded.view.title}
          </p>
          <p className="kxd-commercial-admin__muted">
            {loaded.view.description}
          </p>
        </div>
      ) : null}

      {!isLoading && loaded?.kind === "view" && loaded.view.kind === "empty" ? (
        <div className="kxd-commercial-admin__invoice-state" role="status">
          <p className="kxd-commercial-admin__invoice-state-title">
            {loaded.view.title}
          </p>
          <p className="kxd-commercial-admin__muted">
            {loaded.view.description}
          </p>
        </div>
      ) : null}

      {!isLoading && loaded?.kind === "view" && loaded.view.kind === "ready" ? (
        <div>
          <ul className="kxd-commercial-admin__invoice-list">
            {loaded.view.invoices.map((invoice) => (
              <InvoiceRowCard key={invoice.key} invoice={invoice} />
            ))}
          </ul>
          {loaded.view.paginationNote ? (
            <p className="kxd-commercial-admin__muted">
              {loaded.view.paginationNote}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
