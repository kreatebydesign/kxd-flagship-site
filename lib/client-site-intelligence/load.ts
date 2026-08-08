import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import {
  DEFAULT_OTP_COMMISSION_AMOUNT_CENTS,
  OTP_CARTS_CLIENT_KEY,
} from "./constants";
import type {
  ClientSiteCommissionStatus,
  ClientSiteLifecycleStatus,
} from "./types";

export interface ClientSiteIntelligenceLeadRow {
  id: number;
  externalEventId: string;
  occurredAt: string;
  receivedAt: string;
  modelInterest: string | null;
  lifecycleStatus: ClientSiteLifecycleStatus;
  commissionStatus: ClientSiteCommissionStatus;
  commissionAmountCents: number | null;
  soldAt: string | null;
  saleReference: string | null;
  cartModelReference: string | null;
  confirmedAt: string | null;
  commissionPaidAt: string | null;
  commissionPaymentReference: string | null;
}

export interface ClientSiteIntelligenceSnapshot {
  enabled: boolean;
  clientKey: string | null;
  commissionAmountCents: number;
  leads: ClientSiteIntelligenceLeadRow[];
  counts: {
    total: number;
    awaitingConfirmation: number;
    commissionDue: number;
    commissionPaid: number;
  };
}

const EMPTY: ClientSiteIntelligenceSnapshot = {
  enabled: false,
  clientKey: null,
  commissionAmountCents: DEFAULT_OTP_COMMISSION_AMOUNT_CENTS,
  leads: [],
  counts: {
    total: 0,
    awaitingConfirmation: 0,
    commissionDue: 0,
    commissionPaid: 0,
  },
};

function nullableText(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

export async function loadClientSiteIntelligence(
  clientId: number,
): Promise<ClientSiteIntelligenceSnapshot> {
  const payload = await getPayload({ config });
  const client = (await payload.findByID({
    collection: "clients",
    id: clientId,
    depth: 0,
    overrideAccess: true,
  })) as unknown as Record<string, unknown>;
  const slug = String(client.slug ?? "")
    .trim()
    .toLowerCase();
  if (slug !== OTP_CARTS_CLIENT_KEY) return EMPTY;

  const result = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-site-events" as any,
    where: {
      and: [
        { client: { equals: clientId } },
        { clientKey: { equals: OTP_CARTS_CLIENT_KEY } },
        { eventClass: { equals: "website_lead" } },
      ],
    },
    limit: 50,
    depth: 0,
    sort: "-receivedAt",
    overrideAccess: true,
  });

  const leads = result.docs.map((doc) => {
    const row = doc as Record<string, unknown>;
    const ingestPayload =
      row.payload &&
      typeof row.payload === "object" &&
      !Array.isArray(row.payload)
        ? (row.payload as Record<string, unknown>)
        : {};
    return {
      id: Number(row.id),
      externalEventId: String(row.externalEventId ?? ""),
      occurredAt: String(row.occurredAt ?? ""),
      receivedAt: String(row.receivedAt ?? ""),
      modelInterest:
        nullableText(ingestPayload.modelInterest) ??
        nullableText(ingestPayload.productInterest),
      lifecycleStatus:
        (row.lifecycleStatus as ClientSiteLifecycleStatus) ?? "new",
      commissionStatus:
        (row.commissionStatus as ClientSiteCommissionStatus) ?? "not_due",
      commissionAmountCents:
        row.commissionAmountCents != null
          ? Number(row.commissionAmountCents)
          : null,
      soldAt: nullableText(row.soldAt),
      saleReference: nullableText(row.saleReference),
      cartModelReference: nullableText(row.cartModelReference),
      confirmedAt: nullableText(row.confirmedAt),
      commissionPaidAt: nullableText(row.commissionPaidAt),
      commissionPaymentReference: nullableText(row.commissionPaymentReference),
    } satisfies ClientSiteIntelligenceLeadRow;
  });

  return {
    enabled: true,
    clientKey: OTP_CARTS_CLIENT_KEY,
    commissionAmountCents: DEFAULT_OTP_COMMISSION_AMOUNT_CENTS,
    leads,
    counts: {
      total: leads.length,
      awaitingConfirmation: leads.filter(
        (lead) =>
          (lead.lifecycleStatus === "new" ||
            lead.lifecycleStatus === "acknowledged") &&
          lead.commissionStatus === "not_due",
      ).length,
      commissionDue: leads.filter((lead) => lead.commissionStatus === "due")
        .length,
      commissionPaid: leads.filter((lead) => lead.commissionStatus === "paid")
        .length,
    },
  };
}
