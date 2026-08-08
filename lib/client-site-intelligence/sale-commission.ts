import "server-only";

import {
  commitTransaction,
  getPayload,
  initTransaction,
  killTransaction,
  type Payload,
  type PayloadRequest,
} from "payload";
import config from "@payload-config";
import { sql } from "@payloadcms/db-postgres";
import {
  buildCsiLifecycleActivitySourceId,
  CSI_ACTIVITY_SOURCE_MODULE,
  CSI_ACTIVITY_SOURCE_TYPE,
  CSI_COMMISSION_DUE_ACTIVITY_EVENT_TYPE,
  CSI_COMMISSION_PAID_ACTIVITY_EVENT_TYPE,
  CSI_SALE_CONFIRMED_ACTIVITY_EVENT_TYPE,
  DEFAULT_OTP_COMMISSION_AMOUNT_CENTS,
  OTP_CARTS_CLIENT_KEY,
} from "./constants";
import {
  CsiLifecycleModelError,
  decideCommissionPayment,
  decideSaleConfirmation,
} from "./lifecycle-model";
import type { ClientSiteEventRecord } from "./types";

export interface CsiLifecycleActor {
  id: number;
}

export type ConfirmCsiSaleResult =
  | {
      kind: "confirmed";
      record: ClientSiteEventRecord;
      activityPublished: boolean;
    }
  | {
      kind: "already_confirmed";
      record: ClientSiteEventRecord;
      activityPublished: boolean;
    };

export type MarkCsiCommissionPaidResult =
  | { kind: "paid"; record: ClientSiteEventRecord; activityPublished: boolean }
  | {
      kind: "already_paid";
      record: ClientSiteEventRecord;
      activityPublished: boolean;
    };

export class CsiLifecycleValidationError extends Error {}
export class CsiLifecycleNotFoundError extends Error {}
export class CsiLifecycleStateError extends Error {}

type CsiTransactionRequest = PayloadRequest & {
  payload: Payload;
  transactionID?: number | string | Promise<number | string | null> | null;
};

type CsiTransactionDb = {
  execute: (query: unknown) => Promise<unknown>;
};

function resultRows(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) return result as Record<string, unknown>[];
  if (result && typeof result === "object" && "rows" in result) {
    const rows = (result as { rows?: unknown }).rows;
    if (Array.isArray(rows)) return rows as Record<string, unknown>[];
  }
  return [];
}

function relationId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value && typeof value === "object" && "id" in value) {
    const id = Number((value as { id?: unknown }).id);
    return Number.isFinite(id) ? id : null;
  }
  return null;
}

function dateText(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function mapRecord(doc: Record<string, unknown>): ClientSiteEventRecord {
  return {
    id: Number(doc.id),
    clientId: relationId(doc.client) ?? 0,
    clientKey: String(doc.clientKey ?? ""),
    eventClass: doc.eventClass as ClientSiteEventRecord["eventClass"],
    externalEventId: String(doc.externalEventId ?? ""),
    sourceSystem: String(doc.sourceSystem ?? ""),
    occurredAt: dateText(doc.occurredAt) ?? "",
    receivedAt: dateText(doc.receivedAt) ?? "",
    sensitivity: doc.sensitivity as ClientSiteEventRecord["sensitivity"],
    visibilityState:
      doc.visibilityState as ClientSiteEventRecord["visibilityState"],
    processingStatus:
      doc.processingStatus as ClientSiteEventRecord["processingStatus"],
    payload: (doc.payload as ClientSiteEventRecord["payload"]) ?? {},
    ingestMeta: (doc.ingestMeta as Record<string, unknown>) ?? {},
    activityTimelineEventId:
      doc.activityTimelineEventId != null
        ? Number(doc.activityTimelineEventId)
        : null,
    idempotencyKey: String(doc.idempotencyKey ?? ""),
    lifecycleStatus:
      (doc.lifecycleStatus as ClientSiteEventRecord["lifecycleStatus"]) ??
      "new",
    commissionStatus:
      (doc.commissionStatus as ClientSiteEventRecord["commissionStatus"]) ??
      "not_due",
    commissionAmountCents:
      doc.commissionAmountCents != null
        ? Number(doc.commissionAmountCents)
        : null,
    soldAt: dateText(doc.soldAt),
    saleReference: doc.saleReference != null ? String(doc.saleReference) : null,
    cartModelReference:
      doc.cartModelReference != null ? String(doc.cartModelReference) : null,
    confirmedById: relationId(doc.confirmedBy),
    confirmedAt: dateText(doc.confirmedAt),
    commissionPaidAt: dateText(doc.commissionPaidAt),
    commissionPaymentReference:
      doc.commissionPaymentReference != null
        ? String(doc.commissionPaymentReference)
        : null,
    commissionPaidById: relationId(doc.commissionPaidBy),
  };
}

function requiredText(value: unknown, label: string, max: number): string {
  const text = String(value ?? "").trim();
  if (!text) throw new CsiLifecycleValidationError(`${label} is required.`);
  if (text.length > max) {
    throw new CsiLifecycleValidationError(
      `${label} must be ${max} characters or fewer.`,
    );
  }
  return text;
}

function optionalText(
  value: unknown,
  label: string,
  max: number,
): string | null {
  if (value == null || String(value).trim() === "") return null;
  return requiredText(value, label, max);
}

function validDate(value: unknown, label: string): string {
  const date = new Date(String(value ?? ""));
  if (!Number.isFinite(date.getTime())) {
    throw new CsiLifecycleValidationError(`${label} must be a valid date.`);
  }
  return date.toISOString();
}

function assertSafePaymentReference(value: string | null): void {
  if (!value) return;
  if (
    /\b(?:cvc|cvv|card number|account number|routing number|pan)\b/i.test(value)
  ) {
    throw new CsiLifecycleValidationError(
      "Payment reference must not contain card or bank credential fields.",
    );
  }
  if (/(?:\d[ -]?){12,19}/.test(value)) {
    throw new CsiLifecycleValidationError(
      "Payment reference must not contain a card or account number.",
    );
  }
}

async function withLockedEvent<T>(
  payload: Payload,
  eventId: number,
  work: (db: CsiTransactionDb) => Promise<T>,
): Promise<T> {
  const req = { payload } as CsiTransactionRequest;
  const ownsTransaction = await initTransaction(req);
  if (!ownsTransaction && !req.transactionID) {
    throw new Error("CSI lifecycle requires a transactional Postgres adapter.");
  }

  try {
    const transactionID = await req.transactionID;
    if (!transactionID)
      throw new Error("CSI lifecycle transaction is unavailable.");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const session = (payload.db as any)?.sessions?.[String(transactionID)] as
      | { db?: CsiTransactionDb }
      | undefined;
    if (!session?.db)
      throw new Error("CSI lifecycle transaction session is unavailable.");
    await session.db.execute(
      sql`SELECT id FROM client_site_events WHERE id = ${eventId} FOR UPDATE`,
    );
    const result = await work(session.db);
    if (ownsTransaction) await commitTransaction(req);
    return result;
  } catch (error) {
    if (ownsTransaction) await killTransaction(req);
    throw error;
  }
}

async function loadBoundOtpEvent(
  db: CsiTransactionDb,
  eventId: number,
): Promise<ClientSiteEventRecord> {
  const result = await db.execute(sql`
    SELECT
      event.id,
      event.client_id AS "client",
      event.client_key AS "clientKey",
      event.event_class AS "eventClass",
      event.external_event_id AS "externalEventId",
      event.source_system AS "sourceSystem",
      event.occurred_at AS "occurredAt",
      event.received_at AS "receivedAt",
      event.sensitivity,
      event.visibility_state AS "visibilityState",
      event.processing_status AS "processingStatus",
      event.payload,
      event.ingest_meta AS "ingestMeta",
      event.activity_timeline_event_id AS "activityTimelineEventId",
      event.idempotency_key AS "idempotencyKey",
      event.lifecycle_status AS "lifecycleStatus",
      event.commission_status AS "commissionStatus",
      event.commission_amount_cents AS "commissionAmountCents",
      event.sold_at AS "soldAt",
      event.sale_reference AS "saleReference",
      event.cart_model_reference AS "cartModelReference",
      event.confirmed_by_id AS "confirmedBy",
      event.confirmed_at AS "confirmedAt",
      event.commission_paid_at AS "commissionPaidAt",
      event.commission_payment_reference AS "commissionPaymentReference",
      event.commission_paid_by_id AS "commissionPaidBy",
      client.slug AS "boundClientSlug"
    FROM client_site_events AS event
    INNER JOIN clients AS client ON client.id = event.client_id
    WHERE event.id = ${eventId}
  `);
  const doc = resultRows(result)[0];
  if (!doc) {
    throw new CsiLifecycleNotFoundError("Client Site Event was not found.");
  }

  const record = mapRecord(doc);
  if (
    record.clientKey !== OTP_CARTS_CLIENT_KEY ||
    record.eventClass !== "website_lead" ||
    !Number.isFinite(record.clientId) ||
    record.clientId <= 0
  ) {
    throw new CsiLifecycleValidationError(
      "Sale confirmation is limited to OTP Carts website leads.",
    );
  }

  if (
    String(doc.boundClientSlug ?? "")
      .trim()
      .toLowerCase() !== OTP_CARTS_CLIENT_KEY
  ) {
    throw new CsiLifecycleValidationError(
      "Client binding does not resolve to OTP Carts.",
    );
  }
  return record;
}

async function updateConfirmedSale(
  db: CsiTransactionDb,
  input: {
    eventId: number;
    soldAt: string;
    saleReference: string;
    cartModelReference: string | null;
    actorId: number;
    confirmedAt: string;
  },
): Promise<ClientSiteEventRecord> {
  await db.execute(sql`
    UPDATE client_site_events
    SET
      lifecycle_status = 'sold_confirmed',
      commission_status = 'due',
      commission_amount_cents = ${DEFAULT_OTP_COMMISSION_AMOUNT_CENTS},
      sold_at = ${input.soldAt},
      sale_reference = ${input.saleReference},
      cart_model_reference = ${input.cartModelReference},
      confirmed_by_id = ${input.actorId},
      confirmed_at = ${input.confirmedAt},
      updated_at = now()
    WHERE id = ${input.eventId}
  `);
  return loadBoundOtpEvent(db, input.eventId);
}

async function updateCommissionPaid(
  db: CsiTransactionDb,
  input: {
    eventId: number;
    paidAt: string;
    paymentReference: string;
    actorId: number;
  },
): Promise<ClientSiteEventRecord> {
  await db.execute(sql`
    UPDATE client_site_events
    SET
      commission_status = 'paid',
      commission_paid_at = ${input.paidAt},
      commission_payment_reference = ${input.paymentReference},
      commission_paid_by_id = ${input.actorId},
      updated_at = now()
    WHERE id = ${input.eventId}
  `);
  return loadBoundOtpEvent(db, input.eventId);
}

async function publishLifecycleActivity(
  record: ClientSiteEventRecord,
  eventType: string,
  action: "sale-confirmed" | "commission-due" | "commission-paid",
  payload: Payload,
): Promise<boolean> {
  const { publishActivity } = await import("@/lib/activity-engine/publish");
  const amount = (DEFAULT_OTP_COMMISSION_AMOUNT_CENTS / 100).toFixed(2);
  const copy = {
    "sale-confirmed": {
      title: "Website-attributed sale confirmed",
      summary: `OTP Carts sale attributed to website event ${record.externalEventId}.`,
    },
    "commission-due": {
      title: "Website attribution commission due",
      summary: `A $${amount} OTP Carts commission is due for website event ${record.externalEventId}.`,
    },
    "commission-paid": {
      title: "Website attribution commission paid",
      summary: `The $${amount} OTP Carts commission was marked paid for website event ${record.externalEventId}.`,
    },
  }[action];

  const result = await publishActivity(
    {
      eventType,
      title: copy.title,
      summary: copy.summary,
      clientId: record.clientId,
      sourceModule: CSI_ACTIVITY_SOURCE_MODULE,
      sourceType: CSI_ACTIVITY_SOURCE_TYPE,
      sourceId: buildCsiLifecycleActivitySourceId(record.id, action),
      internalOnly: true,
      dedupe: true,
      importance: action === "commission-paid" ? "high" : "normal",
      category: "finance",
      occurredAt:
        action === "commission-paid"
          ? (record.commissionPaidAt ?? undefined)
          : (record.confirmedAt ?? record.soldAt ?? undefined),
      metadata: {
        clientSiteEventId: record.id,
        clientKey: record.clientKey,
        eventClass: record.eventClass,
        externalEventId: record.externalEventId,
        commissionAmountCents: DEFAULT_OTP_COMMISSION_AMOUNT_CENTS,
      },
    },
    payload,
  );
  return result.created || result.skipped;
}

async function publishConfirmationActivities(
  record: ClientSiteEventRecord,
  payload: Payload,
): Promise<boolean> {
  try {
    const [sale, due] = await Promise.all([
      publishLifecycleActivity(
        record,
        CSI_SALE_CONFIRMED_ACTIVITY_EVENT_TYPE,
        "sale-confirmed",
        payload,
      ),
      publishLifecycleActivity(
        record,
        CSI_COMMISSION_DUE_ACTIVITY_EVENT_TYPE,
        "commission-due",
        payload,
      ),
    ]);
    return sale && due;
  } catch {
    return false;
  }
}

export async function confirmCsiWebsiteLeadSale(input: {
  eventId: number;
  soldAt: string;
  saleReference: string;
  cartModelReference?: string | null;
  actor: CsiLifecycleActor;
  payloadInstance?: Payload;
}): Promise<ConfirmCsiSaleResult> {
  const eventId = Number(input.eventId);
  const actorId = Number(input.actor.id);
  if (!Number.isFinite(eventId) || eventId <= 0) {
    throw new CsiLifecycleValidationError(
      "A valid Client Site Event is required.",
    );
  }
  if (!Number.isFinite(actorId) || actorId <= 0) {
    throw new CsiLifecycleValidationError(
      "An authenticated operator is required.",
    );
  }
  const soldAt = validDate(input.soldAt, "Sold date");
  const saleReference = requiredText(
    input.saleReference,
    "Sale reference",
    200,
  );
  const cartModelReference = optionalText(
    input.cartModelReference,
    "Cart/model reference",
    200,
  );
  const payload = input.payloadInstance ?? (await getPayload({ config }));

  const outcome = await withLockedEvent(payload, eventId, async (db) => {
    const current = await loadBoundOtpEvent(db, eventId);
    let decision: ReturnType<typeof decideSaleConfirmation>;
    try {
      decision = decideSaleConfirmation(current);
    } catch (error) {
      if (error instanceof CsiLifecycleModelError) {
        throw new CsiLifecycleStateError(error.message);
      }
      throw error;
    }
    if (decision === "already_confirmed") {
      return { kind: "already_confirmed" as const, record: current };
    }

    const confirmedAt = new Date().toISOString();
    const updated = await updateConfirmedSale(db, {
      eventId,
      soldAt,
      saleReference,
      cartModelReference,
      actorId,
      confirmedAt,
    });
    return {
      kind: "confirmed" as const,
      record: updated,
    };
  });

  const activityPublished = await publishConfirmationActivities(
    outcome.record,
    payload,
  );
  return { ...outcome, activityPublished };
}

export async function markCsiCommissionPaid(input: {
  eventId: number;
  paidAt: string;
  paymentReference?: string | null;
  actor: CsiLifecycleActor;
  payloadInstance?: Payload;
}): Promise<MarkCsiCommissionPaidResult> {
  const eventId = Number(input.eventId);
  const actorId = Number(input.actor.id);
  if (!Number.isFinite(eventId) || eventId <= 0) {
    throw new CsiLifecycleValidationError(
      "A valid Client Site Event is required.",
    );
  }
  if (!Number.isFinite(actorId) || actorId <= 0) {
    throw new CsiLifecycleValidationError(
      "An authenticated operator is required.",
    );
  }
  const paidAt = validDate(input.paidAt, "Paid date");
  const paymentReference = requiredText(
    input.paymentReference,
    "Payment reference",
    500,
  );
  assertSafePaymentReference(paymentReference);
  const payload = input.payloadInstance ?? (await getPayload({ config }));

  const outcome = await withLockedEvent(payload, eventId, async (db) => {
    const current = await loadBoundOtpEvent(db, eventId);
    let decision: ReturnType<typeof decideCommissionPayment>;
    try {
      decision = decideCommissionPayment(current);
    } catch (error) {
      if (error instanceof CsiLifecycleModelError) {
        throw new CsiLifecycleStateError(error.message);
      }
      throw error;
    }
    if (decision === "already_paid") {
      return { kind: "already_paid" as const, record: current };
    }
    if (current.soldAt && Date.parse(paidAt) < Date.parse(current.soldAt)) {
      throw new CsiLifecycleStateError(
        "Paid date cannot be earlier than the confirmed sold date.",
      );
    }

    const updated = await updateCommissionPaid(db, {
      eventId,
      paidAt,
      paymentReference,
      actorId,
    });
    return {
      kind: "paid" as const,
      record: updated,
    };
  });

  let activityPublished = false;
  try {
    activityPublished = await publishLifecycleActivity(
      outcome.record,
      CSI_COMMISSION_PAID_ACTIVITY_EVENT_TYPE,
      "commission-paid",
      payload,
    );
  } catch {
    activityPublished = false;
  }
  return { ...outcome, activityPublished };
}
