/**
 * Platinum Film Workz — Account Statement via ledger composer.
 *
 * Fixture obligations mirror production-verified commercial truth
 * (read-only regression shape). No production values are hard-coded
 * into reusable compose logic.
 *
 * Verified as-of 2026-09-12:
 *   Total $3,135.18 · Paid $1,900.00 · Outstanding $1,235.18
 *   Open Stripe invoice ZQI8LPUG-0002 $635.18 (UNPAID)
 */

import type { InvoiceObligation } from "@/lib/proposal-lifecycle/types";
import type { ObligationPaymentEvent } from "@/lib/proposal-lifecycle/external-obligation-payment";
import {
  composeAccountStatement,
  type ComposeAccountStatementResult,
  type OpenInvoiceContext,
} from "./compose";
import type { AccountStatementDocument } from "./types";

function event(partial: {
  id: string;
  paymentGroupId: string;
  amountCents: number;
  paidAt: string;
  externalReference?: string | null;
}): ObligationPaymentEvent {
  return {
    id: partial.id,
    paymentGroupId: partial.paymentGroupId,
    amountCents: partial.amountCents,
    currency: "USD",
    paidAt: partial.paidAt,
    externalPaymentMethod: "cash-app",
    externalReference: partial.externalReference ?? null,
    recordedBy: "fixture",
    recordedAt: partial.paidAt,
    stripeInvoiceId: null,
    collectionChannel: "manual-external",
    idempotencyKey: `fixture:${partial.id}`,
  };
}

function baseObligation(
  partial: Partial<InvoiceObligation> &
    Pick<InvoiceObligation, "id" | "kind" | "label" | "amountCents" | "status">,
): InvoiceObligation {
  return {
    currency: "USD",
    trigger: "on-date",
    dueTerms: "Due on receipt",
    amountPaidCents: 0,
    paymentEvents: [],
    paymentReceipt: null,
    collectionChannel: null,
    stripeDraftInvoiceId: null,
    ...partial,
  };
}

/**
 * Platinum-shaped ledger snapshot for statement regression.
 * Totals must remain driven by obligations + paymentEvents.
 */
export function buildPlatinumFilmWorkzLedgerObligations(): InvoiceObligation[] {
  return [
    baseObligation({
      id: "pfw-dep-1",
      kind: "initial",
      label: "Deposit 1 of 4",
      amountCents: 31_250,
      status: "paid",
      amountPaidCents: 31_250,
      paymentEvents: [
        event({
          id: "pe-dep1",
          paymentGroupId: "paygrp-2026-08-21-a",
          amountCents: 31_250,
          paidAt: "2026-08-21T00:00:00.000Z",
        }),
      ],
    }),
    baseObligation({
      id: "pfw-dep-2",
      kind: "initial",
      label: "Deposit 2 of 4",
      amountCents: 31_250,
      status: "paid",
      amountPaidCents: 31_250,
      paymentEvents: [
        event({
          id: "pe-dep2a",
          paymentGroupId: "paygrp-2026-08-21-a",
          amountCents: 3_750,
          paidAt: "2026-08-21T00:00:00.000Z",
        }),
        event({
          id: "pe-dep2b",
          paymentGroupId: "paygrp-2026-08-21-b",
          amountCents: 27_500,
          paidAt: "2026-08-21T00:00:00.000Z",
        }),
      ],
    }),
    baseObligation({
      id: "pfw-dep-3",
      kind: "milestone",
      label: "Deposit 3 of 4",
      amountCents: 31_250,
      status: "paid",
      amountPaidCents: 31_250,
      paymentEvents: [
        event({
          id: "pe-dep3a",
          paymentGroupId: "paygrp-2026-08-21-b",
          amountCents: 27_500,
          paidAt: "2026-08-21T00:00:00.000Z",
        }),
        event({
          id: "pe-dep3b",
          paymentGroupId: "paygrp-2026-08-24",
          amountCents: 3_750,
          paidAt: "2026-08-24T00:00:00.000Z",
        }),
      ],
    }),
    baseObligation({
      id: "pfw-dep-4",
      kind: "milestone",
      label: "Deposit 4 of 4",
      amountCents: 31_250,
      status: "paid",
      amountPaidCents: 31_250,
      paymentEvents: [
        event({
          id: "pe-dep4",
          paymentGroupId: "paygrp-2026-08-24",
          amountCents: 31_250,
          paidAt: "2026-08-24T00:00:00.000Z",
        }),
      ],
    }),
    baseObligation({
      id: "pfw-rem-1",
      kind: "milestone",
      label: "Progress Payment",
      amountCents: 62_500,
      status: "paid",
      amountPaidCents: 62_500,
      paymentEvents: [
        event({
          id: "pe-rem1a",
          paymentGroupId: "paygrp-2026-08-27",
          amountCents: 30_000,
          paidAt: "2026-08-27T00:00:00.000Z",
        }),
        event({
          id: "pe-rem1b",
          paymentGroupId: "paygrp-2026-09-12",
          amountCents: 32_500,
          paidAt: "2026-09-12T00:00:00.000Z",
        }),
      ],
    }),
    baseObligation({
      id: "pfw-rem-2",
      kind: "final",
      label: "Final Payment",
      amountCents: 62_500,
      status: "partially-paid",
      amountPaidCents: 2_500,
      paymentEvents: [
        event({
          id: "pe-rem2",
          paymentGroupId: "paygrp-2026-09-12",
          amountCents: 2_500,
          paidAt: "2026-09-12T00:00:00.000Z",
        }),
      ],
    }),
    baseObligation({
      id: "obl_c63e54f70f997f8a",
      kind: "recurring-period",
      label: "Website Growth & Management — 2026-09",
      amountCents: 32_500,
      status: "pending-trigger",
      dueDate: "2026-09-01",
      billingCadence: "monthly",
      serviceTitle: "Website Growth & Management",
      serviceDescription:
        "Ongoing website management and updates, SEO, search indexing and visibility, performance optimization, technical website management, and management of Instagram and Facebook.",
      stripeDraftInvoiceId: "in_1UBhgZH7v7C2pv8kAggKGDP0",
    }),
    baseObligation({
      id: "pfw-hosting-y1",
      kind: "addon",
      label: "KXD Managed Website Hosting",
      amountCents: 29_999,
      status: "pending-trigger",
      billingCadence: "annual",
      serviceTitle: "KXD Managed Website Hosting",
      stripeDraftInvoiceId: "in_1UBhgZH7v7C2pv8kAggKGDP0",
    }),
    baseObligation({
      id: "pfw-domain-y1",
      kind: "addon",
      label: ".com Domain Registration",
      amountCents: 1_019,
      status: "pending-trigger",
      billingCadence: "annual",
      serviceTitle: ".com Domain Registration",
      stripeDraftInvoiceId: "in_1UBhgZH7v7C2pv8kAggKGDP0",
    }),
  ];
}

export const PLATINUM_OPEN_INVOICE_CONTEXT: OpenInvoiceContext = {
  invoiceNumber: "ZQI8LPUG-0002",
  stripeInvoiceId: "in_1UBhgZH7v7C2pv8kAggKGDP0",
  status: "open",
  amountDueCents: 63_518,
  obligationIds: [
    "obl_c63e54f70f997f8a",
    "pfw-hosting-y1",
    "pfw-domain-y1",
  ],
};

export function composePlatinumFilmWorkzStatement20260912(
  overrides?: {
    obligations?: InvoiceObligation[];
    openInvoice?: OpenInvoiceContext | null;
  },
): ComposeAccountStatementResult {
  return composeAccountStatement({
    id: "platinum-film-workz-account-statement-2026-09-12",
    clientName: "Platinum Film Workz by HJ",
    clientSlug: "platinum-film-workz",
    statementDate: "2026-09-12",
    obligations:
      overrides?.obligations ?? buildPlatinumFilmWorkzLedgerObligations(),
    openInvoice:
      overrides && "openInvoice" in overrides
        ? overrides.openInvoice
        : PLATINUM_OPEN_INVOICE_CONTEXT,
    closingNotes: [
      {
        id: "note-sep12-payment",
        body: "The $350.00 payment received September 12, 2026 has been applied to Website Design & Development.",
      },
    ],
    preparedBy: "Kreate by Design",
  });
}

/** Composed document — financial fields come from the ledger composer. */
export const PLATINUM_FILM_WORKZ_STATEMENT_2026_09_12: AccountStatementDocument =
  composePlatinumFilmWorkzStatement20260912().document;
